(function() {
  'use strict';

  let entries = [];
  let selectedIds = new Set();
  let sortField = 'surname';
  let sortAsc = true;
  let deleteCallback = null;
  let validationActive = false;
  let validationIssues = null;
  let pendingJsonFile = null;

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const addBtn = document.getElementById('addBtn');
  const importBtn = document.getElementById('importBtn');
  const exportBtn = document.getElementById('exportBtn');
  const validateBtn = document.getElementById('validateBtn');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const selectAllCheckbox = document.getElementById('selectAll');
  const phonebookBody = document.getElementById('phonebookBody');
  const entryCountEl = document.getElementById('entryCount');
  const selectedCountEl = document.getElementById('selectedCount');
  const validationSummaryEl = document.getElementById('validationSummary');
  const phonebookUrlEl = document.getElementById('phonebookUrl');
  const copyUrlBtn = document.getElementById('copyUrlBtn');

  // Entry Modal
  const entryModal = document.getElementById('entryModal');
  const modalTitle = document.getElementById('modalTitle');
  const entryForm = document.getElementById('entryForm');
  const closeModalBtn = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelBtn');

  // Import Modal
  const importModal = document.getElementById('importModal');
  const closeImportModalBtn = document.getElementById('closeImportModal');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const selectFileBtn = document.getElementById('selectFileBtn');
  const importStatus = document.getElementById('importStatus');
  const jsonOptions = document.getElementById('jsonOptions');
  const cancelJsonImportBtn = document.getElementById('cancelJsonImport');
  const confirmJsonImportBtn = document.getElementById('confirmJsonImport');

  // Confirm Modal
  const confirmModal = document.getElementById('confirmModal');
  const closeConfirmModalBtn = document.getElementById('closeConfirmModal');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  // Initialize
  async function init() {
    phonebookUrlEl.textContent = window.location.origin + '/phonebook.xml';
    await loadEntries();
    bindEvents();
  }

  function bindEvents() {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    addBtn.addEventListener('click', () => openEntryModal());
    importBtn.addEventListener('click', () => openImportModal());
    exportBtn.addEventListener('click', handleExport);
    validateBtn.addEventListener('click', handleValidate);
    deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
    selectAllCheckbox.addEventListener('change', handleSelectAll);
    copyUrlBtn.addEventListener('click', handleCopyUrl);

    // Entry modal
    closeModalBtn.addEventListener('click', closeEntryModal);
    cancelBtn.addEventListener('click', closeEntryModal);
    entryForm.addEventListener('submit', handleSaveEntry);

    // Import modal
    closeImportModalBtn.addEventListener('click', closeImportModal);
    selectFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    cancelJsonImportBtn.addEventListener('click', cancelJsonImport);
    confirmJsonImportBtn.addEventListener('click', confirmJsonImport);

    // Confirm modal
    closeConfirmModalBtn.addEventListener('click', closeConfirmModal);
    confirmCancelBtn.addEventListener('click', closeConfirmModal);
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

    // Close modals on backdrop click
    entryModal.addEventListener('click', (e) => {
      if (e.target === entryModal) closeEntryModal();
    });
    importModal.addEventListener('click', (e) => {
      if (e.target === importModal) closeImportModal();
    });
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) closeConfirmModal();
    });

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
              <h3>No contacts yet</h3>
              <p>Add your first contact or import a vCard file.</p>
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
            <button class="action-btn edit" onclick="app.editEntry('${entry.id}')" title="Edit">&#9998;</button>
            <button class="action-btn delete" onclick="app.deleteEntry('${entry.id}')" title="Delete">&#10005;</button>
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
    entryCountEl.textContent = `${entries.length} contact${entries.length !== 1 ? 's' : ''}`;
    if (selectedIds.size > 0) {
      selectedCountEl.textContent = `| ${selectedIds.size} selected`;
      selectedCountEl.classList.remove('hidden');
      deleteSelectedBtn.disabled = false;
    } else {
      selectedCountEl.classList.add('hidden');
      deleteSelectedBtn.disabled = true;
    }
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

  // Import Modal
  function openImportModal() {
    importModal.classList.remove('hidden');
    importStatus.classList.add('hidden');
    jsonOptions.classList.add('hidden');
    dropZone.classList.remove('hidden');
    pendingJsonFile = null;
  }

  function closeImportModal() {
    importModal.classList.add('hidden');
    importStatus.classList.add('hidden');
    jsonOptions.classList.add('hidden');
    dropZone.classList.remove('hidden');
    fileInput.value = '';
    pendingJsonFile = null;
  }

  function cancelJsonImport() {
    jsonOptions.classList.add('hidden');
    dropZone.classList.remove('hidden');
    pendingJsonFile = null;
    fileInput.value = '';
  }

  async function confirmJsonImport() {
    if (!pendingJsonFile) return;

    const mode = document.querySelector('input[name="importMode"]:checked').value;
    const formData = new FormData();
    formData.append('file', pendingJsonFile);

    try {
      const response = await fetch(`/api/import-json?mode=${mode}`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (response.ok) {
        const action = result.replaced ? 'Replaced phonebook with' : 'Merged';
        importStatus.textContent = `${action} ${result.imported} contact${result.imported !== 1 ? 's' : ''}.`;
        importStatus.className = 'success';
        clearValidation();
        await loadEntries(searchInput.value.trim());
      } else {
        importStatus.textContent = result.error || 'Import failed.';
        importStatus.className = 'error';
      }
      importStatus.classList.remove('hidden');
      jsonOptions.classList.add('hidden');
      dropZone.classList.remove('hidden');
      pendingJsonFile = null;
    } catch (error) {
      importStatus.textContent = 'Import failed: ' + error.message;
      importStatus.className = 'error';
      importStatus.classList.remove('hidden');
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  }

  function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      uploadFile(file);
    }
  }

  async function uploadFile(file) {
    const isJson = file.name.toLowerCase().endsWith('.json');

    if (isJson) {
      // For JSON files, show merge/replace options
      pendingJsonFile = file;
      dropZone.classList.add('hidden');
      jsonOptions.classList.remove('hidden');
      importStatus.classList.add('hidden');
      return;
    }

    // For vCard files, import directly (always merge)
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (response.ok) {
        importStatus.textContent = `Successfully imported ${result.imported} contact${result.imported !== 1 ? 's' : ''}.`;
        importStatus.className = 'success';
        clearValidation();
        await loadEntries(searchInput.value.trim());
      } else {
        importStatus.textContent = result.error || 'Import failed.';
        importStatus.className = 'error';
      }
      importStatus.classList.remove('hidden');
    } catch (error) {
      importStatus.textContent = 'Import failed: ' + error.message;
      importStatus.className = 'error';
      importStatus.classList.remove('hidden');
    }
  }

  async function handleExport() {
    try {
      const response = await fetch('/api/export');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'phonebook.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(phonebookUrlEl.textContent).then(() => {
      const originalText = copyUrlBtn.textContent;
      copyUrlBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyUrlBtn.textContent = originalText;
      }, 2000);
    });
  }

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
    validationSummaryEl.classList.add('hidden');
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
    if (!validationIssues) return;

    const noPhoneCount = validationIssues.noPhone.length;
    const duplicateCount = Object.keys(validationIssues.duplicates).length;
    const totalIssues = noPhoneCount + duplicateCount;

    if (totalIssues === 0) {
      validationSummaryEl.textContent = '| No issues found';
      validationSummaryEl.className = 'validation-summary';
    } else {
      const parts = [];
      if (noPhoneCount > 0) {
        parts.push(`${noPhoneCount} without phone`);
      }
      if (duplicateCount > 0) {
        parts.push(`${duplicateCount} duplicate number${duplicateCount !== 1 ? 's' : ''}`);
      }
      validationSummaryEl.textContent = '| ' + parts.join(', ');
      validationSummaryEl.className = 'validation-summary has-errors';
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

  // Expose to global scope for onclick handlers
  window.app = {
    editEntry,
    deleteEntry
  };

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
