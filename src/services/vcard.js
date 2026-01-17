/**
 * Parse vCard 3.0/4.0 files and extract contact information
 */

function parseVCard(vcardContent) {
  const contacts = [];
  const vcardBlocks = vcardContent.split(/(?=BEGIN:VCARD)/i).filter(block => block.trim());

  for (const block of vcardBlocks) {
    if (!block.toUpperCase().includes('BEGIN:VCARD')) continue;

    const contact = {
      surname: '',
      name: '',
      office1: '',
      office2: '',
      mobile1: '',
      mobile2: '',
      home1: '',
      home2: ''
    };

    // Unfold lines (vCard allows line folding with leading whitespace)
    const unfoldedBlock = block.replace(/\r?\n[ \t]/g, '');
    const lines = unfoldedBlock.split(/\r?\n/);

    const workPhones = [];
    const cellPhones = [];
    const homePhones = [];
    let org = '';
    let nWasEmpty = false;

    for (const line of lines) {
      // Parse N field (Name: surname;firstname;additional;prefix;suffix)
      if (line.toUpperCase().startsWith('N:') || line.toUpperCase().startsWith('N;')) {
        const value = extractValue(line);
        const parts = value.split(';');
        contact.surname = parts[0] || '';
        contact.name = parts[1] || '';
        // Track if N field was present but empty (business contact pattern)
        if (!contact.surname && !contact.name) {
          nWasEmpty = true;
        }
      }

      // Parse FN field as fallback if N is empty
      if (line.toUpperCase().startsWith('FN:') || line.toUpperCase().startsWith('FN;')) {
        if (!contact.surname && !contact.name) {
          const fullName = extractValue(line);
          const parts = fullName.split(' ');
          if (parts.length >= 2) {
            contact.name = parts[0];
            contact.surname = parts.slice(1).join(' ');
          } else {
            contact.surname = fullName;
          }
        }
      }

      // Parse ORG field for business contacts
      if (line.toUpperCase().startsWith('ORG:') || line.toUpperCase().startsWith('ORG;')) {
        org = extractValue(line).split(';')[0]; // ORG format: company;department
      }

      // Parse TEL fields
      if (line.toUpperCase().startsWith('TEL')) {
        const phoneNumber = extractValue(line);
        const lineUpper = line.toUpperCase();

        if (lineUpper.includes('TYPE=CELL') ||
            lineUpper.includes('TYPE=MOBILE') ||
            lineUpper.includes('TYPE=IPHONE')) {
          // IPHONE is Apple-specific type for cell phones
          cellPhones.push(phoneNumber);
        } else if (lineUpper.includes('TYPE=WORK') ||
                   lineUpper.includes('TYPE=OFFICE') ||
                   lineUpper.includes('TYPE=MAIN')) {
          // MAIN is typically the primary business number
          workPhones.push(phoneNumber);
        } else if (lineUpper.includes('TYPE=HOME') ||
                   lineUpper.includes('TYPE=OTHER')) {
          // OTHER falls back to home
          homePhones.push(phoneNumber);
        } else {
          // Default to home if no specific type (TYPE=VOICE, TYPE=pref, or none)
          homePhones.push(phoneNumber);
        }
      }
    }

    // Use ORG as surname for business contacts where N field was empty
    // This overrides any FN-derived name splitting (e.g., "Billigheimer Taxi" → "Billigheimer Taxi")
    if (nWasEmpty && org) {
      contact.surname = org;
      contact.name = '';
    }

    // Assign phones to appropriate fields (max 2 each)
    if (workPhones.length > 0) contact.office1 = workPhones[0];
    if (workPhones.length > 1) contact.office2 = workPhones[1];
    if (cellPhones.length > 0) contact.mobile1 = cellPhones[0];
    if (cellPhones.length > 1) contact.mobile2 = cellPhones[1];
    if (homePhones.length > 0) contact.home1 = homePhones[0];
    if (homePhones.length > 1) contact.home2 = homePhones[1];

    // Only add if there's at least a name or phone number
    if (contact.surname || contact.name ||
        contact.office1 || contact.mobile1 || contact.home1) {
      contacts.push(contact);
    }
  }

  return contacts;
}

function extractValue(line) {
  // Handle property;params:value format
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return '';

  let value = line.substring(colonIndex + 1);

  // Decode escaped characters
  value = value.replace(/\\n/gi, '\n');
  value = value.replace(/\\,/g, ',');
  value = value.replace(/\\;/g, ';');
  value = value.replace(/\\\\/g, '\\');

  return value.trim();
}

module.exports = {
  parseVCard
};
