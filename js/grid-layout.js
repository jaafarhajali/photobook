/**
 * Grid Layout Module
 * Handles grid templates, customizable grids, and snap-to-grid
 */

const GridLayout = (function() {
    const templates = {
        '1x1': { rows: 1, cols: 1, name: 'Single' },
        '1x2': { rows: 1, cols: 2, name: '2 Horizontal' },
        '2x1': { rows: 2, cols: 1, name: '2 Vertical' },
        '2x2': { rows: 2, cols: 2, name: '4 Grid' },
        '2x3': { rows: 2, cols: 3, name: '6 Grid (2x3)' },
        '3x2': { rows: 3, cols: 2, name: '6 Grid (3x2)' },
        '3x3': { rows: 3, cols: 3, name: '9 Grid' }
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

        const spacingInput = document.getElementById('gridSpacing');
        if (spacingInput) spacingInput.value = page.gridSpacing || 20;

        const paddingInput = document.getElementById('gridPadding');
        if (paddingInput) paddingInput.value = page.gridPadding || 40;

        const spacingValue = document.getElementById('gridSpacingValue');
        if (spacingValue) spacingValue.textContent = (page.gridSpacing || 20) + 'px';

        const paddingValue = document.getElementById('gridPaddingValue');
        if (paddingValue) paddingValue.textContent = (page.gridPadding || 40) + 'px';
    }

    function autoArrangeImages() {
        const page = bookData.pages[currentPageIndex];
        if (page.layoutMode !== 'grid') {
            PageManager.showToast('Switch to Grid mode first', 'error');
            return;
        }

        const rows = page.gridRows || 2;
        const cols = page.gridCols || 2;
        const maxCells = rows * cols;

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
            if (confirm(`You have ${page.images.length} images but only ${maxCells} cells. Remove ${overflow} image(s) to fit the grid?`)) {
                page.images = page.images.slice(0, maxCells);
            }
        }

        // Convert all images to simple string format for grid mode
        page.images = page.images.map(img => typeof img === 'string' ? img : img.src);

        saveBookData();
        renderCurrentPage();
        PageManager.renderThumbnailStrip();
        PageManager.showToast(`Arranged ${page.images.length} images in ${rows}×${cols} grid`);
    }

    return {
        init,
        setTemplate,
        setCustomGrid,
        setGridSpacing,
        setGridPadding,
        updateControls,
        autoArrangeImages
    };
})();

window.GridLayout = GridLayout;
