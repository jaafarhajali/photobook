/**
 * PDF Export Module
 * Handles high-resolution PDF export with quality settings
 */

const PDFExport = (function() {
    const qualityPresets = {
        draft: { scale: 1, name: 'Draft' },
        standard: { scale: 2, name: 'Standard' },
        high: { scale: 3, name: 'High' },
        print: { scale: 4, name: 'Print' }
    };

    let currentQuality = 'standard';
    let isExporting = false;

    function init() {
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', showExportDialog);
        }
    }

    function showExportDialog() {
        let dialog = document.getElementById('exportDialog');

        if (!dialog) {
            dialog = createExportDialog();
            document.body.appendChild(dialog);
        }

        const pageCount = document.getElementById('exportPageCount');
        if (pageCount) pageCount.textContent = bookData.numPages;

        updateProgress(0, '');
        dialog.classList.add('visible');
    }

    function hideExportDialog() {
        const dialog = document.getElementById('exportDialog');
        if (dialog) dialog.classList.remove('visible');
    }

    function createExportDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'exportDialog';
        dialog.className = 'export-dialog-overlay';
        dialog.innerHTML = `
            <div class="export-dialog">
                <div class="export-dialog-header">
                    <h4><i class="fas fa-file-pdf"></i> Export to PDF</h4>
                    <button class="export-dialog-close" onclick="PDFExport.hideExportDialog()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="export-dialog-body">
                    <div class="export-option">
                        <label class="form-label">Export Quality</label>
                        <select class="form-select" id="exportQuality">
                            <option value="draft">Draft (1x) - Fast</option>
                            <option value="standard" selected>Standard (2x) - Recommended</option>
                            <option value="high">High (3x) - Slower</option>
                            <option value="print">Print (4x) - Best Quality</option>
                        </select>
                    </div>
                    <div class="export-option">
                        <label class="form-label">Filename</label>
                        <input type="text" class="form-control" id="exportFilename" value="my-photobook" placeholder="Enter filename">
                    </div>
                    <div class="export-option">
                        <label class="form-label">Pages</label>
                        <div class="export-page-info">
                            <strong><span id="exportPageCount">${bookData.numPages}</span></strong> pages will be exported
                        </div>
                    </div>
                    <div class="export-progress" id="exportProgress" style="display: none;">
                        <div class="progress">
                            <div class="progress-bar" id="exportProgressBar" style="width: 0%"></div>
                        </div>
                        <div class="export-progress-text" id="exportProgressText">Preparing...</div>
                    </div>
                </div>
                <div class="export-dialog-footer">
                    <button class="btn btn-secondary" onclick="PDFExport.hideExportDialog()">Cancel</button>
                    <button class="btn btn-primary" id="startExportBtn" onclick="PDFExport.startExport()">
                        <i class="fas fa-download"></i> Export PDF
                    </button>
                </div>
            </div>
        `;

        dialog.querySelector('#exportQuality').addEventListener('change', (e) => {
            currentQuality = e.target.value;
        });

        return dialog;
    }

    function updateProgress(percent, text) {
        const container = document.getElementById('exportProgress');
        const bar = document.getElementById('exportProgressBar');
        const textEl = document.getElementById('exportProgressText');

        if (container) container.style.display = percent > 0 ? 'block' : 'none';
        if (bar) bar.style.width = percent + '%';
        if (textEl) textEl.textContent = text;
    }

    async function startExport() {
        if (isExporting) return;
        isExporting = true;

        const startBtn = document.getElementById('startExportBtn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Exporting...';
        }

        try {
            await exportToPDF();
            PageManager.showToast('PDF exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            PageManager.showToast('Export failed', 'error');
        } finally {
            isExporting = false;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.innerHTML = '<i class="fas fa-download"></i> Export PDF';
            }
            hideExportDialog();
        }
    }

    async function exportToPDF() {
        const { jsPDF } = window.jspdf;
        const preset = qualityPresets[currentQuality];
        const scale = preset.scale;

        let pageWidth, pageHeight;
        if (bookData.orientation === 'landscape') {
            pageWidth = 297;
            pageHeight = 210;
        } else if (bookData.orientation === 'portrait') {
            pageWidth = 210;
            pageHeight = 297;
        } else {
            pageWidth = 210;
            pageHeight = 210;
        }

        const pdf = new jsPDF({
            orientation: bookData.orientation === 'landscape' ? 'l' : 'p',
            unit: 'mm',
            format: [pageWidth, pageHeight]
        });

        const originalPageIndex = currentPageIndex;
        const totalPages = bookData.numPages;

        for (let i = 0; i < totalPages; i++) {
            const percent = Math.round(((i + 1) / totalPages) * 100);
            updateProgress(percent, `Rendering page ${i + 1} of ${totalPages}...`);

            currentPageIndex = i;
            renderCurrentPage();

            // Wait for render
            await new Promise(resolve => setTimeout(resolve, 300));

            const pageCanvas = document.getElementById('pageCanvas');

            // Hide UI elements and store selected state
            pageCanvas.querySelectorAll('.delete-image, .rotation-handle, .resize-handle').forEach(el => {
                el.style.visibility = 'hidden';
            });
            const selectedElements = Array.from(pageCanvas.querySelectorAll('.selected, .editing'));
            selectedElements.forEach(el => {
                el.classList.remove('selected', 'editing');
                el.dataset.wasSelected = 'true'; // Mark for restoration
            });

            const canvas = await html2canvas(pageCanvas, {
                scale: scale,
                useCORS: true,
                logging: false,
                backgroundColor: bookData.pages[i].backgroundColor || '#ffffff'
            });

            // Restore UI elements and selection state
            pageCanvas.querySelectorAll('.delete-image, .rotation-handle, .resize-handle').forEach(el => {
                el.style.visibility = '';
            });
            selectedElements.forEach(el => {
                if (el.dataset.wasSelected === 'true') {
                    el.classList.add('selected');
                    delete el.dataset.wasSelected;
                }
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        }

        currentPageIndex = originalPageIndex;
        renderCurrentPage();

        updateProgress(100, 'Saving PDF...');
        const filenameInput = document.getElementById('exportFilename');
        let filename = filenameInput ? filenameInput.value.trim() : 'my-photobook';
        if (!filename) filename = 'my-photobook';
        // Remove invalid characters and ensure .pdf extension
        filename = filename.replace(/[^a-zA-Z0-9-_\s]/g, '');
        if (!filename.toLowerCase().endsWith('.pdf')) {
            filename += '.pdf';
        }
        pdf.save(filename);
    }

    return {
        init,
        showExportDialog,
        hideExportDialog,
        startExport
    };
})();

window.PDFExport = PDFExport;
