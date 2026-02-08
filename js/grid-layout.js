/**
 * Grid Layout Module
 * Handles grid templates, customizable grids, and snap-to-grid
 */

const GridLayout = (function() {
    const templates = {
        // Simple grid templates (auto-flow, no cell spanning)
        '1x1': { rows: 1, cols: 1, name: 'Single' },
        '1x2': { rows: 1, cols: 2, name: '2 Horizontal' },
        '2x1': { rows: 2, cols: 1, name: '2 Vertical' },
        '2x2': { rows: 2, cols: 2, name: '4 Grid' },
        '2x3': { rows: 2, cols: 3, name: '6 Grid (2x3)' },
        '3x2': { rows: 3, cols: 2, name: '6 Grid (3x2)' },
        '3x3': { rows: 3, cols: 3, name: '9 Grid' },

        // Designed layout templates (with cell spanning)
        'hero-top': {
            rows: 2, cols: 2, name: 'Hero Top + 2',
            cells: [
                { row: 1, col: 1, rowSpan: 1, colSpan: 2 },
                { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
                { row: 2, col: 2, rowSpan: 1, colSpan: 1 }
            ]
        },
        'hero-left': {
            rows: 2, cols: 2, name: 'Hero Left + 2',
            cells: [
                { row: 1, col: 1, rowSpan: 2, colSpan: 1 },
                { row: 1, col: 2, rowSpan: 1, colSpan: 1 },
                { row: 2, col: 2, rowSpan: 1, colSpan: 1 }
            ]
        },
        'hero-right': {
            rows: 2, cols: 2, name: 'Hero Right + 2',
            cells: [
                { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
                { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
                { row: 1, col: 2, rowSpan: 2, colSpan: 1 }
            ]
        },
        'strip-3': {
            rows: 1, cols: 3, name: '3 Strip',
            cells: [
                { row: 1, col: 1, rowSpan: 1, colSpan: 1 },
                { row: 1, col: 2, rowSpan: 1, colSpan: 1 },
                { row: 1, col: 3, rowSpan: 1, colSpan: 1 }
            ]
        },
        'big-3bottom': {
            rows: 2, cols: 3, name: 'Big + 3 Bottom',
            cells: [
                { row: 1, col: 1, rowSpan: 1, colSpan: 3 },
                { row: 2, col: 1, rowSpan: 1, colSpan: 1 },
                { row: 2, col: 2, rowSpan: 1, colSpan: 1 },
                { row: 2, col: 3, rowSpan: 1, colSpan: 1 }
            ]
        },
        'mosaic': {
            rows: 2, cols: 3, name: 'Mosaic',
            cells: [
                { row: 1, col: 1, rowSpan: 2, colSpan: 2 },
                { row: 1, col: 3, rowSpan: 1, colSpan: 1 },
                { row: 2, col: 3, rowSpan: 1, colSpan: 1 }
            ]
        }
    };

    function init() {
        setupGridControls();
    }

    function setupGridControls() {
        const templateSelector = document.getElementById('gridTemplateSelector');
        if (templateSelector) {
            templateSelector.addEventListener('change', (e) => {
                setTemplate(e.target.value);
            });
        }

        const rowsInput = document.getElementById('gridRows');
        if (rowsInput) {
            rowsInput.addEventListener('change', (e) => {
                setCustomGrid(parseInt(e.target.value) || 2, getGridCols());
            });
        }

        const colsInput = document.getElementById('gridCols');
        if (colsInput) {
            colsInput.addEventListener('change', (e) => {
                setCustomGrid(getGridRows(), parseInt(e.target.value) || 2);
            });
        }

        const photoFitSelect = document.getElementById('gridPhotoFit');
        if (photoFitSelect) {
            photoFitSelect.addEventListener('change', (e) => {
                setPhotoFit(e.target.value);
            });
        }

        const spacingInput = document.getElementById('gridSpacing');
        if (spacingInput) {
            spacingInput.addEventListener('input', (e) => {
                const spacing = parseInt(e.target.value) || 20;
                setGridSpacing(spacing);
                const spacingValue = document.getElementById('gridSpacingValue');
                if (spacingValue) spacingValue.textContent = spacing + 'px';
            });
        }

        const paddingInput = document.getElementById('gridPadding');
        if (paddingInput) {
            paddingInput.addEventListener('input', (e) => {
                const padding = parseInt(e.target.value) || 40;
                setGridPadding(padding);
                const paddingValue = document.getElementById('gridPaddingValue');
                if (paddingValue) paddingValue.textContent = padding + 'px';
            });
        }
    }

    function setTemplate(templateKey) {
        if (!templates[templateKey]) return;

        const template = templates[templateKey];
        const page = bookData.pages[currentPageIndex];

        page.gridTemplate = templateKey;
        page.gridRows = template.rows;
        page.gridCols = template.cols;

        // Validate image count against template slots
        const maxSlots = getMaxSlots(templateKey);
        if (page.images.length > maxSlots) {
            const msg = `This template has ${maxSlots} slots but you have ${page.images.length} images. Extra images will not display.`;
            if (confirm(msg + ' Remove extra images?')) {
                page.images = page.images.slice(0, maxSlots);
            }
        }

        const rowsInput = document.getElementById('gridRows');
        const colsInput = document.getElementById('gridCols');
        if (rowsInput) rowsInput.value = template.rows;
        if (colsInput) colsInput.value = template.cols;

        saveBookData();
        renderCurrentPage();
        PageManager.renderThumbnailStrip();
    }

    function setCustomGrid(rows, cols) {
        const page = bookData.pages[currentPageIndex];
        page.gridRows = Math.max(1, Math.min(6, rows));
        page.gridCols = Math.max(1, Math.min(6, cols));
        page.gridTemplate = 'custom';

        saveBookData();
        renderCurrentPage();
        PageManager.renderThumbnailStrip();
    }

    function setGridSpacing(spacing) {
        const page = bookData.pages[currentPageIndex];
        page.gridSpacing = Math.max(0, Math.min(50, spacing));
        page.imageSpacing = page.gridSpacing;
        saveBookData();
        renderCurrentPage();
    }

    function setGridPadding(padding) {
        const page = bookData.pages[currentPageIndex];
        page.gridPadding = Math.max(0, Math.min(50, padding));
        saveBookData();
        renderCurrentPage();
    }

    function setPhotoFit(fit) {
        const page = bookData.pages[currentPageIndex];
        page.photoFit = fit || 'cover';
        saveBookData();
        renderCurrentPage();
    }

    function getGridRows() {
        return bookData.pages[currentPageIndex].gridRows || 2;
    }

    function getGridCols() {
        return bookData.pages[currentPageIndex].gridCols || 2;
    }

    function updateControls() {
        const page = bookData.pages[currentPageIndex];

        const templateSelector = document.getElementById('gridTemplateSelector');
        if (templateSelector) templateSelector.value = page.gridTemplate || '2x2';

        const rowsInput = document.getElementById('gridRows');
        if (rowsInput) rowsInput.value = page.gridRows || 2;

        const colsInput = document.getElementById('gridCols');
        if (colsInput) colsInput.value = page.gridCols || 2;

        const photoFitSelect = document.getElementById('gridPhotoFit');
        if (photoFitSelect) photoFitSelect.value = page.photoFit || 'cover';

        const spacingInput = document.getElementById('gridSpacing');
        if (spacingInput) spacingInput.value = page.gridSpacing || 20;

        const paddingInput = document.getElementById('gridPadding');
        if (paddingInput) paddingInput.value = page.gridPadding || 40;

        const spacingValue = document.getElementById('gridSpacingValue');
        if (spacingValue) spacingValue.textContent = (page.gridSpacing || 20) + 'px';

        const paddingValue = document.getElementById('gridPaddingValue');
        if (paddingValue) paddingValue.textContent = (page.gridPadding || 40) + 'px';
    }

    function getTemplate(key) {
        return templates[key] || null;
    }

    function getMaxSlots(key) {
        const tmpl = templates[key];
        if (!tmpl) return 0;
        if (tmpl.cells) return tmpl.cells.length;
        return tmpl.rows * tmpl.cols;
    }

    function autoArrangeImages() {
        const page = bookData.pages[currentPageIndex];
        if (page.layoutMode !== 'grid') {
            PageManager.showToast('Switch to Grid mode first', 'error');
            return;
        }

        const maxCells = getMaxSlots(page.gridTemplate) || (page.gridRows || 2) * (page.gridCols || 2);

        // Get images from library if current page has fewer images than cells
        if (page.images.length < maxCells && bookData.photoLibrary && bookData.photoLibrary.length > 0) {
            const existingSrcs = new Set(page.images.map(img => typeof img === 'string' ? img : img.src));
            const availablePhotos = bookData.photoLibrary.filter(p => !existingSrcs.has(p.src));

            const slotsToFill = Math.min(maxCells - page.images.length, availablePhotos.length);
            for (let i = 0; i < slotsToFill; i++) {
                page.images.push(availablePhotos[i].src);
            }
        }

        // If we have more images than cells, trim to fit
        if (page.images.length > maxCells) {
            const overflow = page.images.length - maxCells;
            if (confirm(`You have ${page.images.length} images but only ${maxCells} slots. Remove ${overflow} image(s) to fit the layout?`)) {
                page.images = page.images.slice(0, maxCells);
            }
        }

        // Convert all images to simple string format for grid mode
        page.images = page.images.map(img => typeof img === 'string' ? img : img.src);

        const tmpl = templates[page.gridTemplate];
        const rows = tmpl ? tmpl.rows : (page.gridRows || 2);
        const cols = tmpl ? tmpl.cols : (page.gridCols || 2);

        saveBookData();
        renderCurrentPage();
        PageManager.renderThumbnailStrip();
        PageManager.showToast(`Arranged ${page.images.length} images in ${tmpl ? tmpl.name : rows + '×' + cols} layout`);
    }

    return {
        init,
        setTemplate,
        setCustomGrid,
        setGridSpacing,
        setGridPadding,
        updateControls,
        autoArrangeImages,
        getTemplate,
        getMaxSlots
    };
})();

window.GridLayout = GridLayout;
