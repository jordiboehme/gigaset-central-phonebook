const https = require('https');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Timeout for API calls (10 seconds)
const API_TIMEOUT_MS = 10000;

const DATA_DIR = path.join(process.cwd(), 'data');
const KEY_FILE = path.join(DATA_DIR, '.encryption-key');

/**
 * Derive an encryption key from a persistent salt file.
 * The salt is generated once and stored in the data directory, so it
 * survives container restarts and moves in Docker Swarm/Kubernetes.
 * Note: This is obfuscation, not true security - the key can be derived by
 * anyone with access to the data directory. The purpose is to prevent casual
 * reading of passwords in settings.json.
 */
function deriveKey() {
  let salt;

  if (fs.existsSync(KEY_FILE)) {
    salt = fs.readFileSync(KEY_FILE, 'utf8');
  } else {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    salt = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(KEY_FILE, salt, 'utf8');
  }

  return crypto.scryptSync(salt, 'gigaset-phonebook', 32);
}

/**
 * Encrypt a password for storage.
 * Returns format: {iv}:{authTag}:{ciphertext} (all base64)
 */
function encryptPassword(plaintext) {
  if (!plaintext) return '';

  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a stored password.
 * Expects format: {iv}:{authTag}:{ciphertext} (all base64)
 */
function decryptPassword(encrypted) {
  if (!encrypted) return '';

  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      return '';
    }

    const [ivBase64, authTagBase64, ciphertext] = parts;
    const key = deriveKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Decryption failed (corrupted data, wrong machine, etc.)
    return '';
  }
}

/**
 * Make an HTTP/HTTPS request to the Gigaset device.
 */
function apiRequest(deviceUrl, method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, deviceUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: API_TIMEOUT_MS,
      // Accept self-signed certificates
      rejectUnauthorized: false
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) {
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = {};
        try {
          if (data) {
            parsed = JSON.parse(data);
          }
        } catch (e) {
          // Response wasn't JSON
        }
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          data: parsed
        });
      });
    });

    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        reject(new Error('Connection refused - check device URL'));
      } else if (error.code === 'ENOTFOUND') {
        reject(new Error('Device not found - check hostname'));
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        reject(new Error('Request timeout - device not responding'));
      } else {
        reject(new Error(`Network error: ${error.message}`));
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout - device not responding'));
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

/**
 * Login to the Gigaset device.
 * Returns the auth token on success.
 */
async function login(deviceUrl, username, password) {
  const result = await apiRequest(deviceUrl, 'POST', '/api/auth/login', {
    username,
    password
  });

  if (!result.ok) {
    if (result.status === 401) {
      throw new Error('Invalid username or password');
    }
    if (result.status === 409) {
      throw new Error('Another admin session is active on the device');
    }
    throw new Error(`Login failed: ${result.data.message || 'HTTP ' + result.status}`);
  }

  if (!result.data.token) {
    throw new Error('Login succeeded but no token received');
  }

  return result.data.token;
}

/**
 * Logout from the Gigaset device.
 */
async function logout(deviceUrl, token) {
  try {
    await apiRequest(deviceUrl, 'POST', '/api/auth/logout', null, token);
  } catch (error) {
    // Ignore logout errors - session will expire anyway
  }
}

/**
 * Trigger phonebook refresh on the Gigaset device.
 */
async function refreshPhonebook(deviceUrl, token) {
  const result = await apiRequest(
    deviceUrl,
    'POST',
    '/api/system/central-phonebook?action=refreshPhonebook',
    null,
    token
  );

  if (!result.ok) {
    throw new Error(`Refresh failed: ${result.data.message || 'HTTP ' + result.status}`);
  }

  return result.data;
}

/**
 * Normalize device URL for API requests.
 */
function normalizeUrl(deviceUrl) {
  let url = deviceUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url.replace(/\/+$/, ''); // Remove trailing slashes
}

/**
 * Test connection to the Gigaset device.
 * Attempts to login and immediately logout.
 */
async function testConnection(deviceUrl, username, password) {
  const url = normalizeUrl(deviceUrl);

  let token = null;
  try {
    token = await login(url, username, password);
    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    if (token) {
      await logout(url, token);
    }
  }
}

/**
 * Trigger a full refresh cycle: login, refresh, logout.
 */
async function triggerRefresh(deviceUrl, username, password) {
  const url = normalizeUrl(deviceUrl);

  let token = null;
  try {
    token = await login(url, username, password);
    await refreshPhonebook(url, token);
    return { success: true, message: 'Phonebook refresh triggered successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    if (token) {
      await logout(url, token);
    }
  }
}

module.exports = {
  testConnection,
  triggerRefresh,
  encryptPassword,
  decryptPassword
};
