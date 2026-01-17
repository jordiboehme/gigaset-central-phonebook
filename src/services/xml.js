/**
 * Generate Gigaset-compatible phonebook XML
 */

const MAX_FIELD_LENGTH = 32;

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

function truncateField(value, maxLength = MAX_FIELD_LENGTH) {
  if (!value) return '';
  return value.substring(0, maxLength);
}

function generatePhonebookXml(entries) {
  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  xml += '<!DOCTYPE LocalDirectory>\n';
  xml += '<list>\n';

  for (const entry of entries) {
    const surname = escapeXml(truncateField(entry.surname));
    const name = escapeXml(truncateField(entry.name));
    const office1 = escapeXml(truncateField(entry.office1));
    const office2 = escapeXml(truncateField(entry.office2));
    const mobile1 = escapeXml(truncateField(entry.mobile1));
    const mobile2 = escapeXml(truncateField(entry.mobile2));
    const home1 = escapeXml(truncateField(entry.home1));
    const home2 = escapeXml(truncateField(entry.home2));

    xml += `  <entry surname="${surname}" name="${name}" office1="${office1}" office2="${office2}" mobile1="${mobile1}" mobile2="${mobile2}" home1="${home1}" home2="${home2}"/>\n`;
  }

  xml += '</list>';
  return xml;
}

module.exports = {
  generatePhonebookXml,
  escapeXml,
  truncateField
};
