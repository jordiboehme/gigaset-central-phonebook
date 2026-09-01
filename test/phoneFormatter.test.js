const { test } = require('node:test');
const assert = require('node:assert');
const formatter = require('../src/services/phoneFormatter');

test('formatPhoneNumber converts local country numbers to 0-prefix', () => {
  assert.strictEqual(formatter.formatPhoneNumber('+4917622289944', '+49'), '017622289944');
});

test('formatPhoneNumber converts international numbers to 00-prefix', () => {
  assert.strictEqual(formatter.formatPhoneNumber('+34609033953', '+49'), '0034609033953');
});

test('formatPhoneNumber leaves already-local numbers unchanged', () => {
  assert.strictEqual(formatter.formatPhoneNumber('017622289944', '+49'), '017622289944');
  assert.strictEqual(formatter.formatPhoneNumber('', '+49'), '');
});

test('removeSeparators strips common separator characters but keeps spaces', () => {
  assert.strictEqual(formatter.removeSeparators('(030) 123-45.67/89'), '030 123456789');
});

test('removeSpaces collapses all whitespace', () => {
  assert.strictEqual(formatter.removeSpaces('030 123 45 67'), '0301234567');
});

test('applyTransformations applies separator removal before format conversion', () => {
  const result = formatter.applyTransformations('+49 (176) 222-89', {
    removeSeparators: true,
    removeSpaces: true,
    phoneFormatConversion: true,
    localCountryCode: '+49'
  });
  assert.strictEqual(result, '017622289');
});

test('formatEntryPhones formats every phone field but not names', () => {
  const entry = {
    surname: '+49 GmbH',
    name: 'Test',
    office1: '+49301', office2: '', mobile1: '+34609', mobile2: '', home1: '', home2: ''
  };
  const result = formatter.formatEntryPhones(entry, {
    phoneFormatConversion: true,
    localCountryCode: '+49'
  });
  assert.strictEqual(result.office1, '0301');
  assert.strictEqual(result.mobile1, '0034609');
  assert.strictEqual(result.surname, '+49 GmbH');
});

test('needsTransformation detects convertible numbers', () => {
  const options = { phoneFormatConversion: true, removeSeparators: true, removeSpaces: true };
  assert.strictEqual(formatter.needsTransformation('+49176', options), true);
  assert.strictEqual(formatter.needsTransformation('030-123', options), true);
  assert.strictEqual(formatter.needsTransformation('030 123', options), true);
  assert.strictEqual(formatter.needsTransformation('0301234', options), false);
});

test('countUnconvertedEntries counts entries with convertible phones', () => {
  const options = { phoneFormatConversion: true, removeSeparators: false, removeSpaces: false };
  const entries = [
    { office1: '+49301', mobile1: '', home1: '' },
    { office1: '0301', mobile1: '', home1: '' },
    { office1: '', mobile1: '+34609', home1: '' }
  ];
  assert.strictEqual(formatter.countUnconvertedEntries(entries, options), 2);
});
