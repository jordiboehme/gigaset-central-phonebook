const { test } = require('node:test');
const assert = require('node:assert');
const xml = require('../src/services/xml');

test('escapeXml escapes all XML special characters', () => {
  assert.strictEqual(
    xml.escapeXml(`<&>"'`),
    '&lt;&amp;&gt;&quot;&apos;'
  );
});

test('escapeXml replaces newlines with spaces and drops carriage returns', () => {
  assert.strictEqual(xml.escapeXml('a\r\nb'), 'a b');
});

test('escapeXml returns empty string for empty or missing values', () => {
  assert.strictEqual(xml.escapeXml(''), '');
  assert.strictEqual(xml.escapeXml(null), '');
  assert.strictEqual(xml.escapeXml(undefined), '');
});

test('truncateField cuts values to 32 characters', () => {
  const long = 'x'.repeat(50);
  assert.strictEqual(xml.truncateField(long).length, 32);
  assert.strictEqual(xml.truncateField('short'), 'short');
  assert.strictEqual(xml.truncateField(''), '');
});

test('generatePhonebookXml produces the Gigaset LocalDirectory structure', () => {
  const output = xml.generatePhonebookXml([
    { surname: 'Doe', name: 'Jane', office1: '123', office2: '', mobile1: '456', mobile2: '', home1: '', home2: '' }
  ]);

  assert.ok(output.startsWith('<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE LocalDirectory>\n<list>'));
  assert.ok(output.includes('<entry surname="Doe" name="Jane" office1="123" office2="" mobile1="456" mobile2="" home1="" home2=""/>'));
  assert.ok(output.includes('</list>'));
});

test('generatePhonebookXml escapes and truncates entry fields', () => {
  const output = xml.generatePhonebookXml([
    { surname: 'A & B <Ltd>', name: 'x'.repeat(40), office1: '', office2: '', mobile1: '', mobile2: '', home1: '', home2: '' }
  ]);

  assert.ok(output.includes('surname="A &amp; B &lt;Ltd&gt;"'));
  assert.ok(output.includes(`name="${'x'.repeat(32)}"`));
  assert.ok(!output.includes('x'.repeat(33)));
});

test('generatePhonebookXml handles an empty phonebook', () => {
  const output = xml.generatePhonebookXml([]);
  assert.ok(output.includes('<list>\n</list>'));
});
