/**
 * Text Editor Module
 * Handles rich text editing with formatting, fonts, and rotation
 */

const TextEditor = (function() {
    const fonts = [
        { name: 'Montserrat', value: "'Montserrat', sans-serif" },
        { name: 'Roboto', value: "'Roboto', sans-serif" },
        { name: 'Open Sans', value: "'Open Sans', sans-serif" },
        { name: 'Lato', value: "'Lato', sans-serif" },
        { name: 'Raleway', value: "'Raleway', sans-serif" },
        { name: 'Oswald', value: "'Oswald', sans-serif" },
        { name: 'Crimson Text', value: "'Crimson Text', serif" },
        { name: 'Playfair Display', value: "'Playfair Display', serif" },
        { name: 'Merriweather', value: "'Merriweather', serif" },
        { name: 'Georgia', value: "'Georgia', serif" },
        { name: 'Dancing Script', value: "'Dancing Script', cursive" },
        { name: 'Pacifico', value: "'Pacifico', cursive" },
        { name: 'Great Vibes', value: "'Great Vibes', cursive" },
        { name: 'Arial', value: "'Arial', sans-serif" },
        { name: 'Times New Roman', value: "'Times New Roman', serif" }
    ];

    let selectedIndex = null;

    function init() {
        populateFontDropdown();
        setupControls();
    }

    function populateFontDropdown() {
        const fontSelect = document.getElementById('fontFamily');
        if (!fontSelect) return;

        fontSelect.innerHTML = fonts.map(font =>
            `<option value="${font.value}" style="font-family: ${font.value}">${font.name}</option>`
        ).join('');
    }

    function setupControls() {
        // Bold
        const boldBtn = document.getElementById('boldBtn');
        if (boldBtn) boldBtn.addEventListener('click', () => toggleFormat('bold'));

        // Italic
        const italicBtn = document.getElementById('italicBtn');
        if (italicBtn) italicBtn.addEventListener('click', () => toggleFormat('italic'));

        // Underline
        const underlineBtn = document.getElementById('underlineBtn');
        if (underlineBtn) underlineBtn.addEventListener('click', () => toggleFormat('underline'));

        // Font family
        const fontFamily = document.getElementById('fontFamily');
        if (fontFamily) fontFamily.addEventListener('change', () => updateStyle('fontFamily', fontFamily.value));

        // Font size
        const fontSize = document.getElementById('fontSize');
        if (fontSize) fontSize.addEventListener('change', () => updateStyle('fontSize', parseInt(fontSize.value)));

        // Font weight
        const fontWeight = document.getElementById('fontWeight');
        if (fontWeight) fontWeight.addEventListener('change', () => updateStyle('fontWeight', parseInt(fontWeight.value)));

        // Text color
        const textColor = document.getElementById('textColor');
        if (textColor) textColor.addEventListener('input', () => updateStyle('color', textColor.value));

        // Alignment
        document.querySelectorAll('[data-align]').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('[data-align]').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                updateStyle('align', this.dataset.align);
            });
        });

        // Position
        const textPosition = document.getElementById('textPosition');
        if (textPosition) textPosition.addEventListener('change', () => updateStyle('position', textPosition.value));

        // Background color
        const textBgColor = document.getElementById('textBgColor');
        if (textBgColor) textBgColor.addEventListener('input', () => updateStyle('backgroundColor', textBgColor.value));

        // Background opacity
        const textBgOpacity = document.getElementById('textBgOpacity');
        if (textBgOpacity) {
            textBgOpacity.addEventListener('input', () => {
                const opacity = parseFloat(textBgOpacity.value);
                const opacityValue = document.getElementById('textBgOpacityValue');
                if (opacityValue) opacityValue.textContent = Math.round(opacity * 100) + '%';
                updateStyle('backgroundOpacity', opacity);
            });
        }

        // Content
        const textContent = document.getElementById('textContent');
        if (textContent) textContent.addEventListener('input', () => updateContent(textContent.value));

        // Rotation
        const textRotation = document.getElementById('textRotation');
        if (textRotation) {
            textRotation.addEventListener('input', () => {
                const rotation = parseInt(textRotation.value);
                const rotationValue = document.getElementById('textRotationValue');
                if (rotationValue) rotationValue.textContent = rotation + '°';
                updateStyle('rotation', rotation);
            });
        }

        // Line height
        const lineHeight = document.getElementById('lineHeight');
        if (lineHeight) {
            lineHeight.addEventListener('input', () => {
                const lh = parseFloat(lineHeight.value);
                const lineHeightValue = document.getElementById('lineHeightValue');
                if (lineHeightValue) lineHeightValue.textContent = lh.toFixed(1);
                updateStyle('lineHeight', lh);
            });
        }

        // Letter spacing
        const letterSpacing = document.getElementById('letterSpacing');
        if (letterSpacing) {
            letterSpacing.addEventListener('input', () => {
                const ls = parseInt(letterSpacing.value);
                const letterSpacingValue = document.getElementById('letterSpacingValue');
                if (letterSpacingValue) letterSpacingValue.textContent = ls + 'px';
                updateStyle('letterSpacing', ls);
            });
        }

        // Delete
        const deleteTextBtn = document.getElementById('deleteTextBtn');
        if (deleteTextBtn) deleteTextBtn.addEventListener('click', deleteSelectedTextBlock);

        // Add
        const addTextBtn = document.getElementById('addTextBtn');
        if (addTextBtn) addTextBtn.addEventListener('click', addTextBlock);
    }

    function toggleFormat(format) {
        if (selectedIndex === null) return;

        const page = bookData.pages[currentPageIndex];
        const textBlock = page.textBlocks[selectedIndex];
        if (!textBlock) return;

        if (!textBlock.style) textBlock.style = {};

        switch (format) {
            case 'bold':
                textBlock.fontWeight = textBlock.fontWeight >= 600 ? 400 : 700;
                document.getElementById('boldBtn')?.classList.toggle('active', textBlock.fontWeight >= 600);
                break;
            case 'italic':
                textBlock.style.fontStyle = textBlock.style.fontStyle === 'italic' ? 'normal' : 'italic';
                document.getElementById('italicBtn')?.classList.toggle('active', textBlock.style.fontStyle === 'italic');
                break;
            case 'underline':
                textBlock.style.textDecoration = textBlock.style.textDecoration === 'underline' ? 'none' : 'underline';
                document.getElementById('underlineBtn')?.classList.toggle('active', textBlock.style.textDecoration === 'underline');
                break;
        }

        saveBookData();
        renderCurrentPage();
    }

    function updateStyle(property, value) {
        if (selectedIndex === null) return;

        const page = bookData.pages[currentPageIndex];
        const textBlock = page.textBlocks[selectedIndex];
        if (!textBlock) return;

        if (!textBlock.style) textBlock.style = {};

        switch (property) {
            case 'fontFamily': textBlock.fontFamily = value; break;
            case 'fontSize': textBlock.fontSize = value; break;
            case 'fontWeight': textBlock.fontWeight = value; break;
            case 'color': textBlock.color = value; break;
            case 'align': textBlock.align = value; break;
            case 'position': textBlock.position = value; break;
            case 'backgroundColor': textBlock.style.backgroundColor = value; break;
            case 'backgroundOpacity': textBlock.style.backgroundOpacity = value; break;
            case 'rotation': textBlock.rotation = value; break;
            case 'lineHeight': textBlock.style.lineHeight = value; break;
            case 'letterSpacing': textBlock.style.letterSpacing = value; break;
        }

        saveBookData();
        renderCurrentPage();
        highlightSelected();
    }

    function updateContent(content) {
        if (selectedIndex === null) return;

        const page = bookData.pages[currentPageIndex];
        const textBlock = page.textBlocks[selectedIndex];
        if (!textBlock) return;

        textBlock.content = content;
        saveBookData();
        renderCurrentPage();
        renderTextBlocksList();
        highlightSelected();
    }

    function addTextBlock() {
        const page = bookData.pages[currentPageIndex];
        if (!page.textBlocks) page.textBlocks = [];

        // Get canvas dimensions for smart positioning
        const canvasEl = document.getElementById('pageCanvas');
        const canvasH = canvasEl ? canvasEl.offsetHeight : 500;
        const canvasW = canvasEl ? canvasEl.offsetWidth : 400;

        const newTextBlock = {
            id: 'text_' + Date.now(),
            content: 'New text block',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 16,
            fontWeight: 400,
            color: '#2c3e50',
            align: 'center',
            position: 'bottom',
            style: {
                fontStyle: 'normal',
                textDecoration: 'none',
                backgroundColor: '#ffffff',
                backgroundOpacity: 0
            },
            rotation: 0,
            // Always include position data so text is freely placed in both modes
            x: Math.max(10, (canvasW - 280) / 2),
            y: Math.min(canvasH - 60, canvasH * 0.75 + (page.textBlocks.length * 50)),
            width: 280,
            zIndex: 100 + page.textBlocks.length
        };

        page.textBlocks.push(newTextBlock);
        saveBookData();
        renderTextBlocksList();
        selectTextBlock(page.textBlocks.length - 1);
        renderCurrentPage();
        PageManager.renderThumbnailStrip();
        PageManager.showToast('Text block added');
    }

    function deleteSelectedTextBlock() {
        if (selectedIndex === null) return;
        if (!confirm('Delete this text block?')) return;

        const page = bookData.pages[currentPageIndex];
        page.textBlocks.splice(selectedIndex, 1);

        selectedIndex = null;
        hideTextEditor();
        saveBookData();
        renderTextBlocksList();
        renderCurrentPage();
        PageManager.renderThumbnailStrip();
        PageManager.showToast('Text block deleted');
    }

    function selectTextBlock(index) {
        selectedIndex = index;

        const page = bookData.pages[currentPageIndex];
        const textBlock = page.textBlocks[index];
        if (!textBlock) return;

        showTextEditor();
        populateEditor(textBlock);
        renderTextBlocksList();
        highlightSelected();
    }

    function populateEditor(textBlock) {
        const textContent = document.getElementById('textContent');
        const fontFamily = document.getElementById('fontFamily');
        const fontSize = document.getElementById('fontSize');
        const fontWeight = document.getElementById('fontWeight');
        const textColor = document.getElementById('textColor');
        const textPosition = document.getElementById('textPosition');
        const textBgColor = document.getElementById('textBgColor');
        const textBgOpacity = document.getElementById('textBgOpacity');
        const textRotation = document.getElementById('textRotation');

        if (textContent) textContent.value = textBlock.content || '';
        if (fontFamily) fontFamily.value = textBlock.fontFamily || "'Montserrat', sans-serif";
        if (fontSize) fontSize.value = textBlock.fontSize || 16;
        if (fontWeight) fontWeight.value = textBlock.fontWeight || 400;
        if (textColor) textColor.value = textBlock.color || '#2c3e50';
        if (textPosition) textPosition.value = textBlock.position || 'bottom';

        const style = textBlock.style || {};
        if (textBgColor) textBgColor.value = style.backgroundColor || '#ffffff';
        if (textBgOpacity) {
            textBgOpacity.value = style.backgroundOpacity || 0;
            const opacityValue = document.getElementById('textBgOpacityValue');
            if (opacityValue) opacityValue.textContent = Math.round((style.backgroundOpacity || 0) * 100) + '%';
        }
        if (textRotation) {
            textRotation.value = textBlock.rotation || 0;
            const rotationValue = document.getElementById('textRotationValue');
            if (rotationValue) rotationValue.textContent = (textBlock.rotation || 0) + '°';
        }

        // Line height
        const lineHeight = document.getElementById('lineHeight');
        if (lineHeight) {
            lineHeight.value = style.lineHeight || 1.5;
            const lineHeightValue = document.getElementById('lineHeightValue');
            if (lineHeightValue) lineHeightValue.textContent = (style.lineHeight || 1.5).toFixed(1);
        }

        // Letter spacing
        const letterSpacing = document.getElementById('letterSpacing');
        if (letterSpacing) {
            letterSpacing.value = style.letterSpacing || 0;
            const letterSpacingValue = document.getElementById('letterSpacingValue');
            if (letterSpacingValue) letterSpacingValue.textContent = (style.letterSpacing || 0) + 'px';
        }

        // Alignment
        document.querySelectorAll('[data-align]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.align === (textBlock.align || 'center'));
        });

        // Format buttons
        document.getElementById('boldBtn')?.classList.toggle('active', textBlock.fontWeight >= 600);
        document.getElementById('italicBtn')?.classList.toggle('active', style.fontStyle === 'italic');
        document.getElementById('underlineBtn')?.classList.toggle('active', style.textDecoration === 'underline');
    }

    function showTextEditor() {
        const editor = document.getElementById('textEditor');
        if (editor) editor.style.display = 'block';
    }

    function hideTextEditor() {
        const editor = document.getElementById('textEditor');
        if (editor) editor.style.display = 'none';
    }

    function renderTextBlocksList() {
        const list = document.getElementById('textBlocksList');
        if (!list) return;

        const page = bookData.pages[currentPageIndex];
        const textBlocks = page.textBlocks || [];

        if (textBlocks.length === 0) {
            list.innerHTML = '<p class="text-muted small text-center py-3">No text blocks yet. Click + to add one.</p>';
            return;
        }

        list.innerHTML = textBlocks.map((block, index) => `
            <div class="text-block-item ${index === selectedIndex ? 'active' : ''}" data-index="${index}">
                <div class="text-block-preview">${block.content || 'Empty text'}</div>
                <button class="text-block-delete" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        list.querySelectorAll('.text-block-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.text-block-delete')) {
                    selectTextBlock(parseInt(item.dataset.index));
                }
            });
        });

        list.querySelectorAll('.text-block-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedIndex = parseInt(btn.dataset.index);
                deleteSelectedTextBlock();
            });
        });
    }

    function highlightSelected() {
        document.querySelectorAll('.page-text-element').forEach(el => el.classList.remove('editing'));

        if (selectedIndex !== null) {
            const textElements = document.querySelectorAll('.page-text-element');
            if (textElements[selectedIndex]) {
                textElements[selectedIndex].classList.add('editing');
            }
        }
    }

    function clearSelection() {
        selectedIndex = null;
        hideTextEditor();
        renderTextBlocksList();
        document.querySelectorAll('.page-text-element').forEach(el => el.classList.remove('editing'));
    }

    function getSelectedIndex() {
        return selectedIndex;
    }

    return {
        init,
        addTextBlock,
        deleteSelectedTextBlock,
        selectTextBlock,
        clearSelection,
        renderTextBlocksList,
        getSelectedIndex,
        showTextEditor,
        hideTextEditor
    };
})();

window.TextEditor = TextEditor;
