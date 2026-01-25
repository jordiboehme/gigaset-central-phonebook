const settings = require('./settings');

const PHONE_FIELDS = ['office1', 'office2', 'mobile1', 'mobile2', 'home1', 'home2'];

// Common separator characters in phone numbers
const SEPARATOR_REGEX = /[.\-_,;/\\()[\]{}]/g;
const SPACES_REGEX = /\s+/g;

/**
 * Check if a phone number needs conversion (starts with +)
 */
function needsConversion(phone) {
  return phone && phone.startsWith('+');
}

/**
 * Remove separator characters from phone number
 */
function removeSeparators(phone) {
  if (!phone) return phone;
  return phone.replace(SEPARATOR_REGEX, '');
}

/**
 * Remove spaces from phone number
 */
function removeSpaces(phone) {
  if (!phone) return phone;
  return phone.replace(SPACES_REGEX, '');
}

/**
 * Format a single phone number according to conversion rules:
 * - Local country (e.g., +49): +4917622289944 → 017622289944
 * - International: +34609033953 → 0034609033953
 * - Already local: unchanged
 */
function formatPhoneNumber(phone, localCountryCode) {
  if (!phone || !needsConversion(phone)) {
    return phone;
  }

  // Check if it's a local number (starts with local country code)
  if (localCountryCode && phone.startsWith(localCountryCode)) {
    // Remove country code, add leading 0
    return '0' + phone.slice(localCountryCode.length);
  }

  // International number: replace + with 00
  return '00' + phone.slice(1);
}

/**
 * Apply all enabled transformations to a phone number
 */
function applyTransformations(phone, options) {
  if (!phone) return phone;

  let result = phone;

  // Remove separators first (before format conversion)
  if (options.removeSeparators) {
    result = removeSeparators(result);
  }

  // Remove spaces
  if (options.removeSpaces) {
    result = removeSpaces(result);
  }

  // Apply format conversion last
  if (options.phoneFormatConversion && options.localCountryCode) {
    result = formatPhoneNumber(result, options.localCountryCode);
  }

  return result;
}

/**
 * Format all phone fields in an entry with given options
 */
function formatEntryPhones(entry, options) {
  const formatted = { ...entry };
  PHONE_FIELDS.forEach(field => {
    if (formatted[field]) {
      formatted[field] = applyTransformations(formatted[field], options);
    }
  });
  return formatted;
}

/**
 * Format entry phones based on current settings
 */
function formatEntryIfEnabled(entry) {
  const currentSettings = settings.getSettings();

  // Check if any transformation is enabled
  const hasTransformations = currentSettings.phoneFormatConversion ||
                             currentSettings.removeSeparators ||
                             currentSettings.removeSpaces;

  if (!hasTransformations) {
    return entry;
  }

  return formatEntryPhones(entry, currentSettings);
}

/**
 * Check if a phone number needs any transformation
 */
function needsTransformation(phone, options) {
  if (!phone) return false;

  // Check for + prefix (needs format conversion)
  if (options.phoneFormatConversion && phone.startsWith('+')) {
    return true;
  }

  // Check for separators
  if (options.removeSeparators && SEPARATOR_REGEX.test(phone)) {
    return true;
  }

  // Check for spaces
  if (options.removeSpaces && SPACES_REGEX.test(phone)) {
    return true;
  }

  return false;
}

/**
 * Check if an entry has any phones needing transformation
 */
function hasUnconvertedPhones(entry, options) {
  // Reset regex lastIndex since we're using global flag
  SEPARATOR_REGEX.lastIndex = 0;
  SPACES_REGEX.lastIndex = 0;

  return PHONE_FIELDS.some(field => {
    SEPARATOR_REGEX.lastIndex = 0;
    SPACES_REGEX.lastIndex = 0;
    return needsTransformation(entry[field], options);
  });
}

/**
 * Count entries needing transformation
 */
function countUnconvertedEntries(entries, options) {
  return entries.filter(entry => hasUnconvertedPhones(entry, options)).length;
}

/**
 * Convert all phone numbers in entries array
 */
function convertAllEntries(entries, options) {
  return entries.map(entry => formatEntryPhones(entry, options));
}

module.exports = {
  needsConversion,
  needsTransformation,
  formatPhoneNumber,
  removeSeparators,
  removeSpaces,
  applyTransformations,
  formatEntryPhones,
  formatEntryIfEnabled,
  hasUnconvertedPhones,
  countUnconvertedEntries,
  convertAllEntries,
  PHONE_FIELDS,
  SEPARATOR_REGEX,
  SPACES_REGEX
};
