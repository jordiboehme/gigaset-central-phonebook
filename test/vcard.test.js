const { test } = require('node:test');
const assert = require('node:assert');
const vcard = require('../src/services/vcard');

function card(lines) {
  return ['BEGIN:VCARD', 'VERSION:3.0', ...lines, 'END:VCARD'].join('\r\n');
}

test('parses name and phone types into the right fields', () => {
  const contacts = vcard.parseVCard(card([
    'N:Doe;Jane;;;',
    'TEL;TYPE=CELL:+4917612345678',
    'TEL;TYPE=WORK:+49301234567',
    'TEL;TYPE=HOME:+4930765432'
  ]));

  assert.strictEqual(contacts.length, 1);
  const c = contacts[0];
  assert.strictEqual(c.surname, 'Doe');
  assert.strictEqual(c.name, 'Jane');
  assert.strictEqual(c.mobile1, '+4917612345678');
  assert.strictEqual(c.office1, '+49301234567');
  assert.strictEqual(c.home1, '+4930765432');
});

test('assigns at most two numbers per category', () => {
  const contacts = vcard.parseVCard(card([
    'N:Doe;Jane;;;',
    'TEL;TYPE=CELL:111',
    'TEL;TYPE=CELL:222',
    'TEL;TYPE=CELL:333'
  ]));

  assert.strictEqual(contacts[0].mobile1, '111');
  assert.strictEqual(contacts[0].mobile2, '222');
});

test('untyped numbers default to home', () => {
  const contacts = vcard.parseVCard(card(['N:Doe;Jane;;;', 'TEL:555']));
  assert.strictEqual(contacts[0].home1, '555');
});

test('falls back to FN when N is missing', () => {
  const contacts = vcard.parseVCard(card(['FN:Jane Doe', 'TEL:555']));
  assert.strictEqual(contacts[0].name, 'Jane');
  assert.strictEqual(contacts[0].surname, 'Doe');
});

test('uses ORG as surname for business contacts with empty N', () => {
  const contacts = vcard.parseVCard(card([
    'N:;;;;',
    'FN:Billigheimer Taxi',
    'ORG:Billigheimer Taxi;Zentrale',
    'TEL;TYPE=MAIN:0621555'
  ]));

  assert.strictEqual(contacts[0].surname, 'Billigheimer Taxi');
  assert.strictEqual(contacts[0].name, '');
  assert.strictEqual(contacts[0].office1, '0621555');
});

test('unfolds folded lines', () => {
  const folded = 'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;\r\n Jane;;;\r\nTEL:555\r\nEND:VCARD';
  const contacts = vcard.parseVCard(folded);
  assert.strictEqual(contacts[0].name, 'Jane');
});

test('decodes escaped characters in values', () => {
  const contacts = vcard.parseVCard(card(['N:Doe\\, Sr.;Jane;;;', 'TEL:555']));
  assert.strictEqual(contacts[0].surname, 'Doe, Sr.');
});

test('parses multiple vCards in one file', () => {
  const two = card(['N:Doe;Jane;;;', 'TEL:1']) + '\r\n' + card(['N:Roe;Rick;;;', 'TEL:2']);
  const contacts = vcard.parseVCard(two);
  assert.strictEqual(contacts.length, 2);
});

test('skips cards with neither name nor phone', () => {
  const contacts = vcard.parseVCard(card(['NOTE:nothing useful here']));
  assert.strictEqual(contacts.length, 0);
});

test('returns empty array for garbage input', () => {
  assert.deepStrictEqual(vcard.parseVCard('not a vcard at all'), []);
  assert.deepStrictEqual(vcard.parseVCard(''), []);
});
