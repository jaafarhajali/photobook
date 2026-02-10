/**
 * Image Filters Module
 * Per-image CSS filter editing: brightness, contrast, saturation, etc.
 */

const ImageFilters = (function() {
    const defaultFilters = {
        brightness: 1,
        contrast: 1,
        saturate: 1,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
        blur: 0,
        opacity: 1
    };

    const presets = {
        vivid: { brightness: 1.1, contrast: 1.2, saturate: 1.5, grayscale: 0, sepia: 0, hueRotate: 0, blur: 0, opacity: 1 },
        bw: { brightness: 1, contrast: 1.1, saturate: 0, grayscale: 1, sepia: 0, hueRotate: 0, blur: 0, opacity: 1 },
        sepia: { brightness: 1, contrast: 1, saturate: 0.8, grayscale: 0, sepia: 0.8, hueRotate: 0, blur: 0, opacity: 1 },
        warm: { brightness: 1.05, contrast: 1.05, saturate: 1.2, grayscale: 0, sepia: 0.2, hueRotate: -10, blur: 0, opacity: 1 },
        cool: { brightness: 1, contrast: 1.05, saturate: 0.9, grayscale: 0, sepia: 0, hueRotate: 20, blur: 0, opacity: 1 },
        fade: { brightness: 1.1, contrast: 0.85, saturate: 0.7, grayscale: 0, sepia: 0.1, hueRotate: 0, blur: 0, opacity: 0.9 },
        dramatic: { brightness: 0.9, contrast: 1.5, saturate: 1.3, grayscale: 0, sepia: 0, hueRotate: 0, blur: 0, opacity: 1 },
        vintage: { brightness: 1.1, contrast: 0.9, saturate: 0.6, grayscale: 0, sepia: 0.4, hueRotate: -5, blur: 0, opacity: 0.95 }
    };

    let selectedImageIndex = null;
    let selectedImageElement = null;

    function init() {
        setupControls();
    }

    function setupControls() {
        // Filter sliders
        const filterNames = ['brightness', 'contrast', 'saturate', 'grayscale', 'sepia', 'hueRotate', 'blur', 'opacity'];
        filterNames.forEach(name => {
            const input = document.getElementById('filter-' + name);
            if (input) {
                input.addEventListener('input', function() {
                    const val = parseFloat(this.value);
                    updateFilter(name, val);
                    updateValueLabel(name, val);
                });
            }
        });

        // Preset buttons
        Object.keys(presets).forEach(presetName => {
            const btn = document.getElementById('preset-' + presetName);
            if (btn) {
                btn.addEventListener('click', function() {
                    applyPreset(presetName);
                });
            }
        });

        // Reset button
        const resetBtn = document.getElementById('resetFilters');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetFilters);
        }
    }

    let saveTimeout = null;

    function debouncedSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(function() {
            saveBookData();
        }, 300);
    }

    function updateFilter(filterName, value) {
        if (selectedImageIndex === null) return;

        const page = bookData.pages[currentPageIndex];
        let imageData = page.images[selectedImageIndex];

        // Convert string to object if needed
        if (typeof imageData === 'string') {
            imageData = { src: imageData, filters: { ...defaultFilters } };
            page.images[selectedImageIndex] = imageData;
        }

        if (!imageData.filters) {
            imageData.filters = { ...defaultFilters };
        }

        imageData.filters[filterName] = value;

        // Apply live to DOM element
        if (selectedImageElement) {
            const img = selectedImageElement.querySelector('img');
            if (img) {
                img.style.filter = buildFilterCss(imageData.filters);
            }
        }

        debouncedSave();
    }

    function applyPreset(presetName) {
        if (selectedImageIndex === null) return;
        const preset = presets[presetName];
        if (!preset) return;

        const page = bookData.pages[currentPageIndex];
        let imageData = page.images[selectedImageIndex];

        // Convert string to object if needed
        if (typeof imageData === 'string') {
            imageData = { src: imageData };
            page.images[selectedImageIndex] = imageData;
        }

        imageData.filters = { ...preset };

        // Apply live
        if (selectedImageElement) {
            const img = selectedImageElement.querySelector('img');
            if (img) {
                img.style.filter = buildFilterCss(imageData.filters);
            }
        }

        // Update all slider UIs
        updateFilterUI(imageData.filters);
        saveBookData();
        PageManager.showToast('Filter applied: ' + presetName);
    }

    function resetFilters() {
        if (selectedImageIndex === null) return;

        const page = bookData.pages[currentPageIndex];
        let imageData = page.images[selectedImageIndex];

        if (typeof imageData === 'string') {
            return; // No filters to reset
        }

        imageData.filters = { ...defaultFilters };

        // Apply live
        if (selectedImageElement) {
            const img = selectedImageElement.querySelector('img');
            if (img) {
                img.style.filter = '';
            }
        }

        updateFilterUI(defaultFilters);
        saveBookData();
        PageManager.showToast('Filters reset');
    }

    function buildFilterCss(filters) {
        if (!filters) return '';
        const parts = [];
        if (filters.brightness !== undefined && filters.brightness !== 1) parts.push('brightness(' + filters.brightness + ')');
        if (filters.contrast !== undefined && filters.contrast !== 1) parts.push('contrast(' + filters.contrast + ')');
        if (filters.saturate !== undefined && filters.saturate !== 1) parts.push('saturate(' + filters.saturate + ')');
        if (filters.grayscale !== undefined && filters.grayscale > 0) parts.push('grayscale(' + filters.grayscale + ')');
        if (filters.sepia !== undefined && filters.sepia > 0) parts.push('sepia(' + filters.sepia + ')');
        if (filters.hueRotate !== undefined && filters.hueRotate !== 0) parts.push('hue-rotate(' + filters.hueRotate + 'deg)');
        if (filters.blur !== undefined && filters.blur > 0) parts.push('blur(' + filters.blur + 'px)');
        if (filters.opacity !== undefined && filters.opacity !== 1) parts.push('opacity(' + filters.opacity + ')');
        return parts.join(' ');
    }

    function showPanel(imageIndex, imageElement) {
        selectedImageIndex = imageIndex;
        selectedImageElement = imageElement;

        // Activate the filters tab directly
        const filtersPanel = document.getElementById('panel-filters');
        if (filtersPanel) {
            // Deactivate all panels and toggle buttons
            document.querySelectorAll('.control-panel').forEach(function(p) { p.classList.remove('active'); });
            document.querySelectorAll('.control-toggle-btn').forEach(function(b) { b.classList.remove('active'); });
            // Activate filters panel
            filtersPanel.classList.add('active');
            const filtersBtn = document.querySelector('.control-toggle-btn[data-panel="filters"]');
            if (filtersBtn) filtersBtn.classList.add('active');
        }

        // Show filter controls, hide placeholder
        const controls = document.getElementById('filterControls');
        const noImage = document.getElementById('noImageSelected');

        if (controls) controls.style.display = 'block';
        if (noImage) noImage.style.display = 'none';

        // Get current filters
        const page = bookData.pages[currentPageIndex];
        const imageData = page.images[imageIndex];
        const filters = (typeof imageData === 'object' && imageData.filters) ? imageData.filters : { ...defaultFilters };

        updateFilterUI(filters);

        // Highlight active preset
        highlightActivePreset(filters);
    }

    function hidePanel() {
        selectedImageIndex = null;
        selectedImageElement = null;

        const controls = document.getElementById('filterControls');
        const noImage = document.getElementById('noImageSelected');

        if (controls) controls.style.display = 'none';
        if (noImage) noImage.style.display = 'block';

        // Remove preset highlights
        document.querySelectorAll('.filter-preset-btn.active').forEach(btn => btn.classList.remove('active'));

        // Remove grid selection highlight
        document.querySelectorAll('.uploaded-image.filter-selected').forEach(el => el.classList.remove('filter-selected'));
    }

    function updateFilterUI(filters) {
        const filterNames = ['brightness', 'contrast', 'saturate', 'grayscale', 'sepia', 'hueRotate', 'blur', 'opacity'];
        filterNames.forEach(name => {
            const input = document.getElementById('filter-' + name);
            if (input) {
                input.value = filters[name] !== undefined ? filters[name] : defaultFilters[name];
            }
            updateValueLabel(name, filters[name] !== undefined ? filters[name] : defaultFilters[name]);
        });
        highlightActivePreset(filters);
    }

    function updateValueLabel(filterName, value) {
        const label = document.getElementById('filterVal-' + filterName);
        if (!label) return;

        if (filterName === 'hueRotate') {
            label.textContent = Math.round(value) + '\u00B0';
        } else if (filterName === 'blur') {
            label.textContent = value.toFixed(1) + 'px';
        } else {
            label.textContent = Math.round(value * 100) + '%';
        }
    }

    function highlightActivePreset(filters) {
        document.querySelectorAll('.filter-preset-btn').forEach(btn => btn.classList.remove('active'));

        for (const [name, preset] of Object.entries(presets)) {
            let match = true;
            for (const key of Object.keys(preset)) {
                const fVal = filters[key] !== undefined ? filters[key] : defaultFilters[key];
                if (Math.abs(fVal - preset[key]) > 0.05) {
                    match = false;
                    break;
                }
            }
            if (match) {
                const btn = document.getElementById('preset-' + name);
                if (btn) btn.classList.add('active');
                break;
            }
        }
    }

    function getFilters(imageData) {
        if (typeof imageData === 'object' && imageData.filters) {
            return imageData.filters;
        }
        return null;
    }

    return {
        init,
        showPanel,
        hidePanel,
        buildFilterCss,
        getFilters,
        defaultFilters
    };
})();

window.ImageFilters = ImageFilters;
