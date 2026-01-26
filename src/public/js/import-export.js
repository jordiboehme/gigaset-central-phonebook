/**
 * Shared Import/Export module - works on all pages
 */
(function() {
    'use strict';

    // Utility: escape HTML to prevent XSS
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==========================================================================
    // Export
    // ==========================================================================

    function handleExport() {
        fetch('/api/export')
            .then(response => response.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'phonebook.json';
                a.click();
                URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Failed to export:', error);
                if (window.showToast) window.showToast('Export failed.', 'error');
            });
    }

    // ==========================================================================
    // Import Modal
    // ==========================================================================

    const importModal = document.getElementById('importModal');
    const closeImportModalBtn = document.getElementById('closeImportModal');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const duplicateSection = document.getElementById('duplicateSection');
    const duplicateCount = document.getElementById('duplicateCount');
    const newCount = document.getElementById('newCount');
    const duplicateList = document.getElementById('duplicateList');
    const importConfirmBtn = document.getElementById('importConfirmBtn');
    const importCancelBtn = document.getElementById('importCancelBtn');
    const importPreview = document.getElementById('importPreview');
    const previewNewCount = document.getElementById('previewNewCount');
    const previewDuplicateText = document.getElementById('previewDuplicateText');
    const previewDetails = document.getElementById('previewDetails');

    // State for pending import
    let pendingImport = null;

    function openImportModal() {
        if (!importModal) return;
        importModal.classList.remove('hidden');
        resetImportModal();
    }

    function closeImportModal() {
        if (!importModal) return;
        importModal.classList.add('hidden');
        resetImportModal();
    }

    function resetImportModal() {
        if (dropZone) dropZone.classList.remove('hidden');
        if (duplicateSection) duplicateSection.classList.add('hidden');
        if (fileInput) fileInput.value = '';
        pendingImport = null;
    }

    // Drag and drop
    if (dropZone) {
        dropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) handleImportFile(file);
        });
    }

    if (selectFileBtn && fileInput) {
        selectFileBtn.addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) handleImportFile(file);
        });
    }

    if (closeImportModalBtn) {
        closeImportModalBtn.addEventListener('click', closeImportModal);
    }

    if (importModal) {
        importModal.addEventListener('click', function(e) {
            if (e.target === importModal) closeImportModal();
        });
    }

    if (importCancelBtn) {
        importCancelBtn.addEventListener('click', function() {
            resetImportModal();
        });
    }

    if (importConfirmBtn) {
        importConfirmBtn.addEventListener('click', confirmImport);
    }

    // Close modal on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && importModal && !importModal.classList.contains('hidden')) {
            closeImportModal();
        }
    });

    // Listen for strategy changes to update preview
    document.querySelectorAll('input[name="duplicateStrategy"]').forEach(radio => {
        radio.addEventListener('change', updateImportPreview);
    });

    async function handleImportFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/import-preview', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (!response.ok) {
                if (window.showToast) window.showToast(result.error || 'Import failed.', 'error');
                return;
            }

            // Validate imported data
            const validation = validateImportData(result);

            if (result.duplicates.length === 0) {
                // Show validation warnings if any, otherwise import directly
                if (validation.warnings.length > 0) {
                    pendingImport = result;
                    showValidationWarnings(validation, result);
                } else {
                    // No duplicates and no warnings - import directly
                    const confirmResponse = await fetch('/api/import-confirm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            newEntries: result.newEntries,
                            duplicates: [],
                            strategy: 'ignore'
                        })
                    });
                    const confirmResult = await confirmResponse.json();

                    if (confirmResponse.ok) {
                        const msg = `Imported ${confirmResult.imported} contact${confirmResult.imported !== 1 ? 's' : ''}.`;
                        if (window.showToast) window.showToast(msg);
                        if (window.refreshEntries) window.refreshEntries();
                        closeImportModal();
                    } else {
                        if (window.showToast) window.showToast(confirmResult.error || 'Import failed.', 'error');
                    }
                }
            } else {
                // Has duplicates - show duplicate section (validation shown inline)
                pendingImport = result;
                showDuplicateSection(result, validation);
            }
        } catch (error) {
            if (window.showToast) window.showToast('Import failed: ' + error.message, 'error');
        }
    }

    function validateImportData(result) {
        const warnings = [];
        const allEntries = [...result.newEntries, ...result.duplicates.map(d => d.imported)];
        const MAX_NAME_LENGTH = 32;
        const MAX_ENTRIES = 2000; // N530 has 500, but use conservative limit

        // Check name length
        allEntries.forEach((entry, index) => {
            const surname = entry.surname || '';
            const name = entry.name || '';
            if (surname.length > MAX_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
                const displayName = `${surname}${surname && name ? ', ' : ''}${name}`;
                warnings.push({
                    type: 'name_length',
                    severity: 'warning',
                    message: `Name exceeds 32 characters and will be truncated: "${displayName}"`
                });
            }
        });

        // Check for entries with no phone numbers
        allEntries.forEach(entry => {
            const phoneFields = ['office1', 'office2', 'mobile1', 'mobile2', 'home1', 'home2'];
            const hasPhone = phoneFields.some(field => entry[field]);
            if (!hasPhone) {
                const displayName = `${entry.surname || ''}${entry.surname && entry.name ? ', ' : ''}${entry.name || '(no name)'}`;
                warnings.push({
                    type: 'no_phone',
                    severity: 'warning',
                    message: `Contact has no phone numbers: "${displayName}"`
                });
            }
        });

        // Check total entry count (need to fetch current count)
        // This is approximated - actual check would require API call
        if (allEntries.length > MAX_ENTRIES) {
            warnings.push({
                type: 'entry_limit',
                severity: 'error',
                message: `Import contains ${allEntries.length} entries, exceeding the maximum of ${MAX_ENTRIES}`
            });
        }

        return { warnings, isValid: !warnings.some(w => w.severity === 'error') };
    }

    function showValidationWarnings(validation, result) {
        if (dropZone) dropZone.classList.add('hidden');
        if (duplicateSection) duplicateSection.classList.remove('hidden');

        if (duplicateCount) {
            duplicateCount.innerHTML = validation.warnings.map(w => {
                const icon = w.severity === 'error' ? '❌' : '⚠️';
                return `<div class="validation-${w.severity}">${icon} ${escapeHtml(w.message)}</div>`;
            }).join('');
        }

        if (newCount) {
            newCount.textContent = `${result.newEntries.length} contact${result.newEntries.length !== 1 ? 's' : ''} will be imported.`;
        }

        if (duplicateList) {
            duplicateList.innerHTML = '<div class="text-secondary">No duplicates found. Review warnings above.</div>';
        }

        updateImportPreview();
    }

    function showDuplicateSection(result, validation) {
        if (dropZone) dropZone.classList.add('hidden');
        if (duplicateSection) duplicateSection.classList.remove('hidden');

        // Show validation warnings if any
        let countText = '';
        if (validation && validation.warnings.length > 0) {
            countText = '<div class="mb-2">';
            validation.warnings.forEach(w => {
                const icon = w.severity === 'error' ? '❌' : '⚠️';
                countText += `<div class="validation-${w.severity} mb-1">${icon} ${escapeHtml(w.message)}</div>`;
            });
            countText += '</div>';
        }

        if (duplicateCount) {
            duplicateCount.innerHTML = countText + `${result.duplicates.length} contact${result.duplicates.length !== 1 ? 's' : ''} already exist.`;
        }

        if (newCount) {
            newCount.textContent = `${result.newEntries.length} new contact${result.newEntries.length !== 1 ? 's' : ''} will be imported.`;
        }

        if (duplicateList) {
            duplicateList.innerHTML = result.duplicates.map(d => {
                const name = `${escapeHtml(d.imported.surname)}${d.imported.surname && d.imported.name ? ', ' : ''}${escapeHtml(d.imported.name)}`;
                return createDuplicateComparison(name, d.existing, d.imported, d.matchType);
            }).join('');
        }

        // Show preview summary
        updateImportPreview();
    }

    function updateImportPreview() {
        if (!pendingImport || !importPreview) return;

        const strategy = document.querySelector('input[name="duplicateStrategy"]:checked')?.value || 'ignore';
        const duplicatesCount = pendingImport.duplicates.length;
        const newEntriesCount = pendingImport.newEntries.length;

        // Count how many duplicates will actually be updated based on strategy
        let affectedCount = 0;
        if (strategy === 'replace') {
            affectedCount = duplicatesCount;
        } else if (strategy === 'merge') {
            const phoneFields = ['office1', 'office2', 'mobile1', 'mobile2', 'home1', 'home2'];
            pendingImport.duplicates.forEach(({ imported, existing }) => {
                const hasUpdates = phoneFields.some(field => !existing[field] && imported[field]);
                if (hasUpdates) affectedCount++;
            });
        }

        // Update preview text
        if (previewNewCount) {
            previewNewCount.textContent = `${newEntriesCount} new contact${newEntriesCount !== 1 ? 's' : ''} will be added`;
        }

        if (previewDuplicateText) {
            previewDuplicateText.textContent = `${duplicatesCount} duplicate${duplicatesCount !== 1 ? 's' : ''} found`;
        }

        // Update details based on strategy
        if (previewDetails) {
            let details = '';
            if (strategy === 'ignore') {
                details = `<div class="preview-details-item">• Duplicates will be skipped</div>`;
            } else if (strategy === 'replace') {
                details = `<div class="preview-details-item">• ${affectedCount} contact${affectedCount !== 1 ? 's' : ''} will be replaced</div>`;
            } else if (strategy === 'merge') {
                details = `<div class="preview-details-item">• ${affectedCount} contact${affectedCount !== 1 ? 's' : ''} will have missing phone numbers filled</div>`;
                if (affectedCount === 0) {
                    details += `<div class="preview-details-item">• All duplicates already have complete data</div>`;
                }
            }
            previewDetails.innerHTML = details;
        }

        // Show the preview
        if (importPreview) {
            importPreview.classList.remove('hidden');
        }
    }

    function createDuplicateComparison(name, existing, imported, matchType = 'name') {
        const phoneFields = [
            { key: 'office1', label: 'Office 1' },
            { key: 'office2', label: 'Office 2' },
            { key: 'mobile1', label: 'Mobile 1' },
            { key: 'mobile2', label: 'Mobile 2' },
            { key: 'home1', label: 'Home 1' },
            { key: 'home2', label: 'Home 2' }
        ];

        const rows = phoneFields.map(field => {
            const existingVal = existing[field.key] || '';
            const importedVal = imported[field.key] || '';

            let status = '';
            let statusClass = '';

            if (existingVal && importedVal && existingVal !== importedVal) {
                status = '⚠️ Conflict';
                statusClass = 'conflict';
            } else if (!existingVal && importedVal) {
                status = '✓ New data';
                statusClass = 'new-data';
            } else if (existingVal === importedVal && existingVal) {
                status = '✓ Same';
                statusClass = 'same';
            } else if (!existingVal && !importedVal) {
                status = '—';
                statusClass = 'empty';
            } else {
                status = '—';
                statusClass = 'no-change';
            }

            return `
                <tr class="comparison-row ${statusClass}">
                    <td class="comparison-label">${field.label}</td>
                    <td class="comparison-existing">${escapeHtml(existingVal) || '<span class="text-muted">—</span>'}</td>
                    <td class="comparison-imported">${escapeHtml(importedVal) || '<span class="text-muted">—</span>'}</td>
                    <td class="comparison-status">${status}</td>
                </tr>
            `;
        }).join('');

        const matchBadge = matchType === 'phone'
            ? '<span class="badge badge-info">Phone Match</span>'
            : '<span class="badge badge-warning">Name Match</span>';

        return `
            <div class="duplicate-comparison">
                <div class="duplicate-comparison-header">
                    <span class="duplicate-name">${name}</span>
                    ${matchBadge}
                </div>
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Existing</th>
                            <th>Imported</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }

    async function confirmImport() {
        if (!pendingImport) return;

        const strategyEl = document.querySelector('input[name="duplicateStrategy"]:checked');
        const strategy = strategyEl ? strategyEl.value : 'ignore';

        try {
            const response = await fetch('/api/import-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newEntries: pendingImport.newEntries,
                    duplicates: pendingImport.duplicates,
                    strategy: strategy
                })
            });
            const result = await response.json();

            if (response.ok) {
                const msg = `Imported ${result.imported} contact${result.imported !== 1 ? 's' : ''}.`;
                if (window.showToast) window.showToast(msg);
                if (window.refreshEntries) window.refreshEntries();
                closeImportModal();
            } else {
                if (window.showToast) window.showToast(result.error || 'Import failed.', 'error');
            }
        } catch (error) {
            if (window.showToast) window.showToast('Import failed: ' + error.message, 'error');
        }
    }

    // ==========================================================================
    // Sidebar Bindings
    // ==========================================================================

    const sidebarImportBtn = document.getElementById('sidebarImportBtn');
    const sidebarExportBtn = document.getElementById('sidebarExportBtn');

    if (sidebarImportBtn) {
        sidebarImportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Close mobile sidebar if open
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.remove('mobile-open');
            openImportModal();
        });
    }

    if (sidebarExportBtn) {
        sidebarExportBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Close mobile sidebar if open
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.remove('mobile-open');
            handleExport();
        });
    }

})();
