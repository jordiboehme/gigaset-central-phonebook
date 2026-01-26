(function() {
  'use strict';

  let entries = [];
  let selectedIds = new Set();
  let sortField = 'surname';
  let sortAsc = true;
  let deleteCallback = null;
  let validationActive = false;
  let validationIssues = null;

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const addBtn = document.getElementById('addBtn');
  const validateBtn = document.getElementById('validateBtn');
  const findDuplicatesBtn = document.getElementById('findDuplicatesBtn');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const selectAllCheckbox = document.getElementById('selectAll');
  const phonebookBody = document.getElementById('phonebookBody');
  const entryCountEl = document.getElementById('entryCount');
  const selectedCountEl = document.getElementById('selectedCount');
  const validationSummaryEl = document.getElementById('validationSummary');
  const validationMessageEl = document.getElementById('validationMessage');
  const phonebookUrlEl = document.getElementById('phonebookUrl');

  // Entry Modal
  const entryModal = document.getElementById('entryModal');
  const modalTitle = document.getElementById('modalTitle');
  const entryForm = document.getElementById('entryForm');
  const closeModalBtn = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelBtn');

  // Confirm Modal
  const confirmModal = document.getElementById('confirmModal');
  const closeConfirmModalBtn = document.getElementById('closeConfirmModal');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  // Duplicates Modal
  const duplicatesModal = document.getElementById('duplicatesModal');
  const closeDuplicatesModalBtn = document.getElementById('closeDuplicatesModal');
  const closeDuplicatesBtn = document.getElementById('closeDuplicatesBtn');
  const duplicatesScanning = document.getElementById('duplicatesScanning');
  const duplicatesResults = document.getElementById('duplicatesResults');
  const duplicatesEmpty = document.getElementById('duplicatesEmpty');
  const duplicatesSummary = document.getElementById('duplicatesSummary');
  const duplicatesListContainer = document.getElementById('duplicatesListContainer');

  // Initialize
  async function init() {
    phonebookUrlEl.textContent = window.location.origin + '/phonebook.xml';
    await loadEntries();
    bindEvents();
    checkConversionStatus();
  }

  function bindEvents() {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    addBtn.addEventListener('click', () => openEntryModal());
    validateBtn.addEventListener('click', handleValidate);
    deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
    selectAllCheckbox.addEventListener('change', handleSelectAll);

    // Entry modal
    closeModalBtn.addEventListener('click', closeEntryModal);
    cancelBtn.addEventListener('click', closeEntryModal);
    entryForm.addEventListener('submit', handleSaveEntry);

    // Confirm modal
    closeConfirmModalBtn.addEventListener('click', closeConfirmModal);
    confirmCancelBtn.addEventListener('click', closeConfirmModal);
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

    // Duplicates modal
    if (findDuplicatesBtn) findDuplicatesBtn.addEventListener('click', handleFindDuplicates);
    if (closeDuplicatesModalBtn) closeDuplicatesModalBtn.addEventListener('click', closeDuplicatesModal);
    if (closeDuplicatesBtn) closeDuplicatesBtn.addEventListener('click', closeDuplicatesModal);

    // Close modals on backdrop click
    entryModal.addEventListener('click', (e) => {
      if (e.target === entryModal) closeEntryModal();
    });
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) closeConfirmModal();
    });
    if (duplicatesModal) {
      duplicatesModal.addEventListener('click', (e) => {
        if (e.target === duplicatesModal) closeDuplicatesModal();
      });
    }

    // Sortable headers
    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => handleSort(th.dataset.sort));
    });
  }

  async function loadEntries(search = '') {
    try {
      const url = search ? `/api/entries?search=${encodeURIComponent(search)}` : '/api/entries';
      const response = await fetch(url);
      entries = await response.json();
      sortEntries();
      renderTable();
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  }

  function sortEntries() {
    entries.sort((a, b) => {
      const aVal = (a[sortField] || '').toLowerCase();
      const bVal = (b[sortField] || '').toLowerCase();
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  function renderTable() {
    if (entries.length === 0) {
      phonebookBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <svg><use href="#icon-inbox"></use></svg>
              <h2 class="empty-state-title">No contacts yet</h2>
              <p class="empty-state-message">Add your first contact or import a vCard file.</p>
            </div>
          </td>
        </tr>
      `;
    } else {
      phonebookBody.innerHTML = entries.map(entry => {
        let rowClass = '';
        if (validationActive && validationIssues) {
          if (validationIssues.noPhone.includes(entry.id)) {
            rowClass = 'validation-warning';
          } else if (validationIssues.duplicateIds.has(entry.id)) {
            rowClass = 'validation-error';
          }
        }
        return `
        <tr data-id="${entry.id}" class="${rowClass}">
          <td class="col-checkbox">
            <input type="checkbox" class="entry-checkbox" data-id="${entry.id}" ${selectedIds.has(entry.id) ? 'checked' : ''}>
          </td>
          <td class="col-name">
            <div class="contact-name">${escapeHtml(entry.surname)}${entry.surname && entry.name ? ', ' : ''}${escapeHtml(entry.name)}</div>
          </td>
          <td class="col-phone">
            ${entry.office1 ? escapeHtml(entry.office1) : ''}
            ${entry.office2 ? '<div class="phone-secondary">' + escapeHtml(entry.office2) + '</div>' : ''}
          </td>
          <td class="col-phone">
            ${entry.mobile1 ? escapeHtml(entry.mobile1) : ''}
            ${entry.mobile2 ? '<div class="phone-secondary">' + escapeHtml(entry.mobile2) + '</div>' : ''}
          </td>
          <td class="col-phone">
            ${entry.home1 ? escapeHtml(entry.home1) : ''}
            ${entry.home2 ? '<div class="phone-secondary">' + escapeHtml(entry.home2) + '</div>' : ''}
          </td>
          <td class="col-actions">
            <button class="btn btn-icon btn-ghost btn-sm" onclick="app.editEntry('${entry.id}')" title="Edit">
              <svg><use href="#icon-edit"></use></svg>
            </button>
            <button class="btn btn-icon btn-ghost btn-sm" onclick="app.deleteEntry('${entry.id}')" title="Delete">
              <svg><use href="#icon-trash"></use></svg>
            </button>
          </td>
        </tr>
      `}).join('');

      // Bind checkbox events
      document.querySelectorAll('.entry-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
      });
    }

    updateStats();
    updateSelectAll();
  }

  function updateStats() {
    entryCountEl.textContent = entries.length;
    selectedCountEl.textContent = selectedIds.size;
    deleteSelectedBtn.disabled = selectedIds.size === 0;
  }

  function updateSelectAll() {
    const allChecked = entries.length > 0 && entries.every(e => selectedIds.has(e.id));
    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = selectedIds.size > 0 && !allChecked;
  }

  function handleSearch() {
    const search = searchInput.value.trim();
    loadEntries(search);
  }

  function handleSort(field) {
    if (sortField === field) {
      sortAsc = !sortAsc;
    } else {
      sortField = field;
      sortAsc = true;
    }
    sortEntries();
    renderTable();
  }

  function handleSelectAll() {
    if (selectAllCheckbox.checked) {
      entries.forEach(e => selectedIds.add(e.id));
    } else {
      selectedIds.clear();
    }
    renderTable();
  }

  function handleCheckboxChange(e) {
    const id = e.target.dataset.id;
    if (e.target.checked) {
      selectedIds.add(id);
    } else {
      selectedIds.delete(id);
    }
    updateStats();
    updateSelectAll();
  }

  // Entry Modal
  function openEntryModal(entry = null) {
    modalTitle.textContent = entry ? 'Edit Contact' : 'Add Contact';
    document.getElementById('entryId').value = entry ? entry.id : '';
    document.getElementById('surname').value = entry ? entry.surname : '';
    document.getElementById('name').value = entry ? entry.name : '';
    document.getElementById('office1').value = entry ? entry.office1 : '';
    document.getElementById('office2').value = entry ? entry.office2 : '';
    document.getElementById('mobile1').value = entry ? entry.mobile1 : '';
    document.getElementById('mobile2').value = entry ? entry.mobile2 : '';
    document.getElementById('home1').value = entry ? entry.home1 : '';
    document.getElementById('home2').value = entry ? entry.home2 : '';
    entryModal.classList.remove('hidden');
    document.getElementById('surname').focus();
  }

  function closeEntryModal() {
    entryModal.classList.add('hidden');
    entryForm.reset();
  }

  async function handleSaveEntry(e) {
    e.preventDefault();
    const id = document.getElementById('entryId').value;
    const data = {
      surname: document.getElementById('surname').value,
      name: document.getElementById('name').value,
      office1: document.getElementById('office1').value,
      office2: document.getElementById('office2').value,
      mobile1: document.getElementById('mobile1').value,
      mobile2: document.getElementById('mobile2').value,
      home1: document.getElementById('home1').value,
      home2: document.getElementById('home2').value
    };

    try {
      if (id) {
        await fetch(`/api/entries/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
      closeEntryModal();
      clearValidation();
      await loadEntries(searchInput.value.trim());
    } catch (error) {
      console.error('Failed to save entry:', error);
    }
  }

  function editEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      openEntryModal(entry);
    }
  }

  function deleteEntry(id) {
    const entry = entries.find(e => e.id === id);
    const name = entry ? `${entry.surname}${entry.surname && entry.name ? ', ' : ''}${entry.name}` : 'this contact';
    confirmMessage.textContent = `Are you sure you want to delete ${name}?`;
    deleteCallback = async () => {
      try {
        await fetch(`/api/entries/${id}`, { method: 'DELETE' });
        selectedIds.delete(id);
        clearValidation();
        await loadEntries(searchInput.value.trim());
      } catch (error) {
        console.error('Failed to delete entry:', error);
      }
    };
    confirmModal.classList.remove('hidden');
  }

  function handleDeleteSelected() {
    confirmMessage.textContent = `Are you sure you want to delete ${selectedIds.size} contact${selectedIds.size !== 1 ? 's' : ''}?`;
    deleteCallback = async () => {
      try {
        await fetch('/api/entries', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: Array.from(selectedIds) })
        });
        selectedIds.clear();
        clearValidation();
        await loadEntries(searchInput.value.trim());
      } catch (error) {
        console.error('Failed to delete entries:', error);
      }
    };
    confirmModal.classList.remove('hidden');
  }

  function closeConfirmModal() {
    confirmModal.classList.add('hidden');
    deleteCallback = null;
  }

  function handleConfirmDelete() {
    if (deleteCallback) {
      deleteCallback();
    }
    closeConfirmModal();
  }

  // Find Duplicates
  async function handleFindDuplicates() {
    // Open modal
    duplicatesModal.classList.remove('hidden');

    // Show scanning state
    duplicatesScanning.classList.remove('hidden');
    duplicatesResults.classList.add('hidden');
    duplicatesEmpty.classList.add('hidden');

    try {
      const response = await fetch('/api/entries/find-duplicates');
      const data = await response.json();

      // Hide scanning
      duplicatesScanning.classList.add('hidden');

      if (data.duplicates.length === 0) {
        // No duplicates found
        duplicatesEmpty.classList.remove('hidden');
      } else {
        // Show results
        displayDuplicates(data.duplicates, data.totalChecked);
        duplicatesResults.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Failed to find duplicates:', error);
      duplicatesScanning.classList.add('hidden');
      if (window.showToast) {
        window.showToast('Failed to scan for duplicates', 'error');
      }
      closeDuplicatesModal();
    }
  }

  function displayDuplicates(duplicates, totalChecked) {
    // Update summary
    const totalDuplicateEntries = duplicates.reduce((sum, group) => sum + group.entries.length, 0);
    duplicatesSummary.textContent = `Found ${duplicates.length} duplicate group${duplicates.length !== 1 ? 's' : ''} with ${totalDuplicateEntries} total contacts (scanned ${totalChecked} entries)`;

    // Build duplicate groups HTML
    duplicatesListContainer.innerHTML = duplicates.map(group => {
      const typeLabel = group.type === 'phone' ? 'Same Phone Number' : 'Same Name';
      const typeClass = group.type === 'phone' ? 'badge-info' : 'badge-warning';

      const entriesHtml = group.entries.map(entry => {
        const name = `${entry.surname || ''}${entry.surname && entry.name ? ', ' : ''}${entry.name || '(no name)'}`;
        const phones = [entry.office1, entry.office2, entry.mobile1, entry.mobile2, entry.home1, entry.home2]
          .filter(p => p)
          .map(p => `<span class="duplicate-entry-phone">${escapeHtml(p)}</span>`)
          .join('');

        return `
          <div class="duplicate-entry-item">
            <div class="duplicate-entry-name">${escapeHtml(name)}</div>
            <div class="duplicate-entry-phones">${phones || '<span class="text-muted">No phone numbers</span>'}</div>
            <div class="duplicate-entry-actions">
              <button class="btn btn-sm btn-secondary" onclick="editEntry('${entry.id}')">Edit</button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="duplicate-group">
          <div class="duplicate-group-header">
            <div>
              <div class="duplicate-group-title">
                <span class="badge ${typeClass}">${typeLabel}</span>
                ${group.type === 'name' ? escapeHtml(group.key.replace('|', ', ')) : escapeHtml(group.key)}
              </div>
              <div class="duplicate-group-subtitle">${group.entries.length} contact${group.entries.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div class="duplicate-group-entries">
            ${entriesHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  function closeDuplicatesModal() {
    duplicatesModal.classList.add('hidden');
  }

  // Make editEntry available globally for onclick
  window.editEntry = function(id) {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      openEntryModal(entry);
      closeDuplicatesModal();
    }
  };

  // Validation
  function handleValidate() {
    if (validationActive) {
      clearValidation();
    } else {
      runValidation();
    }
  }

  function runValidation() {
    validationIssues = validatePhonebook();
    validationActive = true;
    validateBtn.classList.add('btn-active');
    renderTable();
    updateValidationSummary();
  }

  function clearValidation() {
    validationActive = false;
    validationIssues = null;
    validateBtn.classList.remove('btn-active');
    if (validationSummaryEl) {
      validationSummaryEl.classList.add('hidden');
    }
    renderTable();
  }

  function validatePhonebook() {
    const issues = { noPhone: [], duplicates: {}, duplicateIds: new Set() };
    const phoneMap = new Map(); // normalized phone -> [entry IDs]

    entries.forEach(entry => {
      // Check for entries without any phone
      const hasPhone = entry.office1 || entry.office2 ||
                       entry.mobile1 || entry.mobile2 ||
                       entry.home1 || entry.home2;
      if (!hasPhone) {
        issues.noPhone.push(entry.id);
      }

      // Track all phones for duplicate detection
      [entry.office1, entry.office2, entry.mobile1,
       entry.mobile2, entry.home1, entry.home2]
        .filter(Boolean)
        .map(normalizePhone)
        .forEach(phone => {
          if (!phoneMap.has(phone)) phoneMap.set(phone, []);
          phoneMap.get(phone).push(entry.id);
        });
    });

    // Find duplicates
    phoneMap.forEach((ids, phone) => {
      if (ids.length > 1) {
        issues.duplicates[phone] = ids;
        ids.forEach(id => issues.duplicateIds.add(id));
      }
    });

    return issues;
  }

  function normalizePhone(phone) {
    // Remove spaces, dashes, parentheses for comparison
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }

  function updateValidationSummary() {
    if (!validationIssues || !validationSummaryEl || !validationMessageEl) return;

    const noPhoneCount = validationIssues.noPhone.length;
    const duplicateCount = Object.keys(validationIssues.duplicates).length;
    const totalIssues = noPhoneCount + duplicateCount;

    if (totalIssues === 0) {
      validationMessageEl.textContent = 'No issues found. All contacts are valid.';
      validationSummaryEl.className = 'alert alert-success mt-4';
    } else {
      const parts = [];
      if (noPhoneCount > 0) {
        parts.push(`${noPhoneCount} contact${noPhoneCount !== 1 ? 's' : ''} without phone numbers`);
      }
      if (duplicateCount > 0) {
        parts.push(`${duplicateCount} duplicate phone number${duplicateCount !== 1 ? 's' : ''}`);
      }
      validationMessageEl.textContent = parts.join(', ');
      validationSummaryEl.className = 'alert alert-warning mt-4';
    }
    validationSummaryEl.classList.remove('hidden');
  }

  // Utilities
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Check conversion status and show warning if needed
  async function checkConversionStatus() {
    try {
      // Check for configuration and unconverted entries
      const statusResponse = await fetch('/api/entries/conversion-status');
      const status = await statusResponse.json();

      // Show warning if country not configured
      if (!status.isConfigured) {
        showConfigurationWarning();
        return;
      }

      // Check if any transformation is enabled
      const settingsResponse = await fetch('/api/settings');
      const settings = await settingsResponse.json();

      const hasTransformations = settings.phoneFormatConversion ||
                                 settings.removeSeparators ||
                                 settings.removeSpaces;

      if (!hasTransformations) {
        return; // No transformations enabled
      }

      if (status.unconvertedCount > 0) {
        showConversionWarning(status.unconvertedCount);
      }
    } catch (error) {
      console.error('Failed to check conversion status:', error);
    }
  }

  function showConfigurationWarning() {
    let warningEl = document.getElementById('configWarning');
    if (!warningEl) {
      warningEl = document.createElement('div');
      warningEl.id = 'configWarning';
      warningEl.className = 'alert alert-info mb-4';
      warningEl.innerHTML = `
        <svg><use href="#icon-alert"></use></svg>
        <div class="alert-content">
          <div class="alert-message">
            <strong>Configure your country</strong> in <a href="/settings.html">Settings</a> to enable phone number transformations.
          </div>
        </div>
      `;

      // Insert after stats grid
      const statsGrid = document.querySelector('.stats-grid');
      if (statsGrid && statsGrid.nextSibling) {
        statsGrid.parentNode.insertBefore(warningEl, statsGrid.nextSibling);
      }
    }
  }

  function showConversionWarning(count) {
    // Remove config warning if it exists
    const configWarning = document.getElementById('configWarning');
    if (configWarning) configWarning.remove();

    // Create warning alert if it doesn't exist
    let warningEl = document.getElementById('conversionWarning');
    if (!warningEl) {
      warningEl = document.createElement('div');
      warningEl.id = 'conversionWarning';
      warningEl.className = 'alert alert-warning mb-4';
      warningEl.innerHTML = `
        <svg><use href="#icon-alert"></use></svg>
        <div class="alert-content">
          <div class="alert-message">
            <strong>${count} contact${count !== 1 ? 's' : ''}</strong> can be transformed.
            <a href="/settings.html">Go to Settings</a> to apply transformations.
          </div>
        </div>
      `;

      // Insert after stats grid
      const statsGrid = document.querySelector('.stats-grid');
      if (statsGrid && statsGrid.nextSibling) {
        statsGrid.parentNode.insertBefore(warningEl, statsGrid.nextSibling);
      }
    }
  }

  // Expose to global scope for onclick handlers
  window.app = {
    editEntry,
    deleteEntry
  };

  // Expose for shared import-export module
  window.refreshEntries = () => {
    clearValidation();
    loadEntries(searchInput.value.trim());
  };

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
