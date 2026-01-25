(function() {
  'use strict';

  // DOM Elements - Country Code Section
  const localCountryCodeEl = document.getElementById('localCountryCode');
  const saveCountryBtn = document.getElementById('saveCountryBtn');
  const countryCodeHintEl = document.getElementById('countryCodeHint');

  // DOM Elements - Transformations Section
  const phoneFormatConversionEl = document.getElementById('phoneFormatConversion');
  const removeSeparatorsEl = document.getElementById('removeSeparators');
  const removeSpacesEl = document.getElementById('removeSpaces');
  const saveTransformationsBtn = document.getElementById('saveTransformationsBtn');

  // DOM Elements - Preview
  const previewInputEl = document.getElementById('previewInput');
  const previewOutputEl = document.getElementById('previewOutput');
  const previewIntlInputEl = document.getElementById('previewIntlInput');
  const previewIntlOutputEl = document.getElementById('previewIntlOutput');

  // DOM Elements - Apply Section
  const convertAllBtn = document.getElementById('convertAllBtn');
  const conversionStatusEl = document.getElementById('conversionStatus');

  // Sample international codes for preview (different from local)
  const sampleInternationalCodes = {
    '+1': '+44', '+7': '+49', '+20': '+33', '+27': '+44', '+30': '+49',
    '+31': '+49', '+32': '+49', '+33': '+49', '+34': '+49', '+36': '+43',
    '+39': '+49', '+40': '+49', '+41': '+49', '+43': '+49', '+44': '+33',
    '+45': '+46', '+46': '+47', '+47': '+46', '+48': '+49', '+49': '+34',
    '+51': '+1', '+52': '+1', '+54': '+55', '+55': '+1', '+56': '+54',
    '+57': '+1', '+58': '+1', '+60': '+65', '+61': '+64', '+62': '+65',
    '+63': '+81', '+64': '+61', '+65': '+60', '+66': '+81', '+81': '+82',
    '+82': '+81', '+84': '+66', '+86': '+81', '+90': '+49', '+91': '+44',
    '+92': '+91', '+212': '+33', '+234': '+44', '+254': '+44', '+351': '+34',
    '+352': '+49', '+353': '+44', '+354': '+45', '+356': '+39', '+357': '+30',
    '+358': '+46', '+359': '+49', '+370': '+371', '+371': '+372', '+372': '+358',
    '+375': '+380', '+380': '+48', '+381': '+385', '+385': '+386', '+386': '+43',
    '+420': '+421', '+421': '+420', '+852': '+86', '+886': '+81', '+966': '+971',
    '+971': '+966', '+972': '+49'
  };

  // Regex patterns (matching backend)
  const SEPARATOR_REGEX = /[.\-_,;/\\()[\]{}]/g;
  const SPACES_REGEX = /\s+/g;

  // Initialize
  async function init() {
    await loadSettings();
    await loadConversionStatus();
    bindEvents();
    updatePreview();
  }

  function bindEvents() {
    // Country code section
    saveCountryBtn.addEventListener('click', saveCountryCode);
    localCountryCodeEl.addEventListener('change', updatePreview);

    // Transformations section
    saveTransformationsBtn.addEventListener('click', saveTransformations);
    phoneFormatConversionEl.addEventListener('change', updatePreview);
    removeSeparatorsEl.addEventListener('change', updatePreview);
    removeSpacesEl.addEventListener('change', updatePreview);

    // Apply section
    convertAllBtn.addEventListener('click', convertAllEntries);
  }

  async function loadSettings() {
    try {
      const response = await fetch('/api/settings');
      const settings = await response.json();

      localCountryCodeEl.value = settings.localCountryCode || '';
      phoneFormatConversionEl.checked = settings.phoneFormatConversion;
      removeSeparatorsEl.checked = settings.removeSeparators;
      removeSpacesEl.checked = settings.removeSpaces;

      updateCountryCodeHint();
      updatePreview();
    } catch (error) {
      console.error('Failed to load settings:', error);
      if (window.showToast) window.showToast('Failed to load settings', 'error');
    }
  }

  function updateCountryCodeHint() {
    if (!localCountryCodeEl.value) {
      countryCodeHintEl.textContent = 'Please select your country to enable phone format conversion';
      countryCodeHintEl.style.color = 'var(--warning)';
    } else {
      countryCodeHintEl.textContent = 'Country code configured';
      countryCodeHintEl.style.color = 'var(--success)';
    }
  }

  async function saveCountryCode() {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localCountryCode: localCountryCodeEl.value })
      });

      if (response.ok) {
        updateCountryCodeHint();
        if (window.showToast) window.showToast('Country code saved');
        await loadConversionStatus();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save country code:', error);
      if (window.showToast) window.showToast('Failed to save country code', 'error');
    }
  }

  async function saveTransformations() {
    try {
      const settings = {
        phoneFormatConversion: phoneFormatConversionEl.checked,
        removeSeparators: removeSeparatorsEl.checked,
        removeSpaces: removeSpacesEl.checked
      };

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        if (window.showToast) window.showToast('Transformations saved');
        await loadConversionStatus();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save transformations:', error);
      if (window.showToast) window.showToast('Failed to save transformations', 'error');
    }
  }

  function applyTransformations(phone, options) {
    if (!phone) return phone;

    let result = phone;

    // Remove separators first
    if (options.removeSeparators) {
      result = result.replace(SEPARATOR_REGEX, '');
    }

    // Remove spaces
    if (options.removeSpaces) {
      result = result.replace(SPACES_REGEX, '');
    }

    // Apply format conversion last
    if (options.phoneFormatConversion && options.localCountryCode && result.startsWith('+')) {
      if (result.startsWith(options.localCountryCode)) {
        // Local number
        result = '0' + result.slice(options.localCountryCode.length);
      } else {
        // International number
        result = '00' + result.slice(1);
      }
    }

    return result;
  }

  function updatePreview() {
    const localCode = localCountryCodeEl.value || '+49';
    const intlCode = sampleInternationalCodes[localCode] || '+34';

    const options = {
      localCountryCode: localCode,
      phoneFormatConversion: phoneFormatConversionEl.checked,
      removeSeparators: removeSeparatorsEl.checked,
      removeSpaces: removeSpacesEl.checked
    };

    // Sample local number with formatting
    const localInput = `${localCode} (176) 123-456`;
    const localOutput = applyTransformations(localInput, options);

    // Sample international number with formatting
    const intlInput = `${intlCode} 609 123 456`;
    const intlOutput = applyTransformations(intlInput, options);

    previewInputEl.textContent = localInput;
    previewOutputEl.textContent = localOutput;
    previewIntlInputEl.textContent = intlInput;
    previewIntlOutputEl.textContent = intlOutput;
  }

  async function loadConversionStatus() {
    try {
      const response = await fetch('/api/entries/conversion-status');
      const status = await response.json();
      updateConversionStatus(status);
    } catch (error) {
      console.error('Failed to load conversion status:', error);
      updateConversionStatus({ unconvertedCount: 0, totalCount: 0, error: true });
    }
  }

  function updateConversionStatus(status) {
    const messageEl = conversionStatusEl.querySelector('.alert-message');

    if (status.error) {
      conversionStatusEl.className = 'alert alert-error';
      messageEl.textContent = 'Failed to load status';
      convertAllBtn.disabled = true;
      return;
    }

    if (!status.isConfigured) {
      conversionStatusEl.className = 'alert alert-warning';
      messageEl.innerHTML = 'Please <strong>select your country</strong> above before applying transformations.';
      convertAllBtn.disabled = true;
      return;
    }

    if (status.totalCount === 0) {
      conversionStatusEl.className = 'alert alert-info';
      messageEl.textContent = 'No contacts in phonebook yet.';
      convertAllBtn.disabled = true;
      return;
    }

    // Check if any transformation is enabled
    const hasTransformations = phoneFormatConversionEl.checked ||
                               removeSeparatorsEl.checked ||
                               removeSpacesEl.checked;

    if (!hasTransformations) {
      conversionStatusEl.className = 'alert alert-info';
      messageEl.textContent = `${status.totalCount} contacts in phonebook. Enable transformations above to apply them.`;
      convertAllBtn.disabled = true;
      return;
    }

    if (status.unconvertedCount === 0) {
      conversionStatusEl.className = 'alert alert-success';
      messageEl.textContent = `All ${status.totalCount} contacts already match the configured transformations.`;
      convertAllBtn.disabled = true;
    } else {
      conversionStatusEl.className = 'alert alert-warning';
      messageEl.textContent = `${status.unconvertedCount} of ${status.totalCount} contacts can be transformed.`;
      convertAllBtn.disabled = false;
    }
  }

  async function convertAllEntries() {
    try {
      convertAllBtn.disabled = true;
      convertAllBtn.innerHTML = '<svg><use href="#icon-refresh"></use></svg> Applying...';

      const response = await fetch('/api/entries/convert-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (response.ok) {
        if (window.showToast) {
          window.showToast(`Transformed ${result.convertedCount} contact${result.convertedCount !== 1 ? 's' : ''}`);
        }
      } else {
        throw new Error(result.error || 'Failed');
      }
    } catch (error) {
      console.error('Failed to convert entries:', error);
      if (window.showToast) window.showToast('Failed to apply transformations', 'error');
    } finally {
      convertAllBtn.innerHTML = '<svg><use href="#icon-refresh"></use></svg> Apply Transformations to All Entries';
      await loadConversionStatus();
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
