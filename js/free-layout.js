/**
 * Free Layout Module
 * Handles free positioning, resize, rotate using interact.js
 */

const FreeLayout = (function() {
    let selectedElement = null;
    let alignmentGuides = null;
    const SNAP_THRESHOLD = 10;

    function init() {
        if (typeof interact === 'undefined') {
            console.warn('interact.js not loaded');
            return;
        }
        setupInteract();
        setupKeyboardShortcuts();
        createAlignmentGuides();

        // Enable touch gestures if module available
        if (TouchGestures) {
            console.log('FreeLayout: Enabling touch gestures');
            setupTouchGestures();
        }
    }

    function createAlignmentGuides() {
        const canvas = document.getElementById('pageCanvas');
        if (!canvas || document.getElementById('alignmentGuides')) return;

        alignmentGuides = document.createElement('div');
        alignmentGuides.id = 'alignmentGuides';
        alignmentGuides.className = 'alignment-guides';
        alignmentGuides.innerHTML = `
            <div class="guide-line vertical" id="guideVerticalCenter" style="left: 50%; display: none;"></div>
            <div class="guide-line horizontal" id="guideHorizontalCenter" style="top: 50%; display: none;"></div>
            <div class="guide-line vertical" id="guideLeft" style="left: 0; display: none;"></div>
            <div class="guide-line vertical" id="guideRight" style="right: 0; display: none;"></div>
            <div class="guide-line horizontal" id="guideTop" style="top: 0; display: none;"></div>
            <div class="guide-line horizontal" id="guideBottom" style="bottom: 0; display: none;"></div>
        `;
        canvas.appendChild(alignmentGuides);
    }

    function showAlignmentGuides(element) {
        if (!alignmentGuides) return;

        const canvas = document.getElementById('pageCanvas');
        const canvasRect = canvas.getBoundingClientRect();
        const elemRect = element.getBoundingClientRect();

        const elemCenterX = elemRect.left - canvasRect.left + elemRect.width / 2;
        const elemCenterY = elemRect.top - canvasRect.top + elemRect.height / 2;
        const canvasCenterX = canvasRect.width / 2;
        const canvasCenterY = canvasRect.height / 2;

        const guideVCenter = document.getElementById('guideVerticalCenter');
        const guideHCenter = document.getElementById('guideHorizontalCenter');

        // Show vertical center guide
        if (Math.abs(elemCenterX - canvasCenterX) < SNAP_THRESHOLD) {
            guideVCenter.style.display = 'block';
        } else {
            guideVCenter.style.display = 'none';
        }

        // Show horizontal center guide
        if (Math.abs(elemCenterY - canvasCenterY) < SNAP_THRESHOLD) {
            guideHCenter.style.display = 'block';
        } else {
            guideHCenter.style.display = 'none';
        }

        alignmentGuides.classList.add('visible');
    }

    function hideAlignmentGuides() {
        if (!alignmentGuides) return;
        alignmentGuides.classList.remove('visible');
        alignmentGuides.querySelectorAll('.guide-line').forEach(g => g.style.display = 'none');
    }

    function setupInteract() {
        // Draggable for images
        interact('.free-positioned.uploaded-image, .free-positioned.page-element-image')
            .draggable({
                inertia: true,
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                listeners: {
                    start: onDragStart,
                    move: onDragMove,
                    end: onDragEnd
                }
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                listeners: {
                    move: onResizeMove,
                    end: onResizeEnd
                },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 100, height: 100 }
                    }),
                    interact.modifiers.aspectRatio({
                        ratio: 'preserve'
                    })
                ]
            });

        // Draggable for text
        interact('.free-positioned.page-text-element')
            .draggable({
                inertia: true,
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                listeners: {
                    start: onDragStart,
                    move: onDragMove,
                    end: onDragEnd
                }
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                listeners: {
                    move: onResizeMove,
                    end: onResizeEnd
                },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 100, height: 30 }
                    })
                ]
            });

        // Rotation handle
        interact('.rotation-handle')
            .draggable({
                onmove: onRotateMove,
                onend: onRotateEnd
            });
    }

    function onDragStart(event) {
        selectElementByDOM(event.target);
        event.target.classList.add('dragging');
    }

    function onDragMove(event) {
        const target = event.target;
        let x = (parseFloat(target.getAttribute('data-x')) || parseFloat(target.style.left) || 0) + event.dx;
        let y = (parseFloat(target.getAttribute('data-y')) || parseFloat(target.style.top) || 0) + event.dy;

        // Snap to center if close
        const canvas = document.getElementById('pageCanvas');
        if (canvas) {
            const canvasWidth = canvas.offsetWidth;
            const canvasHeight = canvas.offsetHeight;
            const elemWidth = target.offsetWidth;
            const elemHeight = target.offsetHeight;

            const elemCenterX = x + elemWidth / 2;
            const elemCenterY = y + elemHeight / 2;
            const canvasCenterX = canvasWidth / 2;
            const canvasCenterY = canvasHeight / 2;

            // Snap to horizontal center
            if (Math.abs(elemCenterX - canvasCenterX) < SNAP_THRESHOLD) {
                x = canvasCenterX - elemWidth / 2;
            }

            // Snap to vertical center
            if (Math.abs(elemCenterY - canvasCenterY) < SNAP_THRESHOLD) {
                y = canvasCenterY - elemHeight / 2;
            }
        }

        target.style.left = x + 'px';
        target.style.top = y + 'px';
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

        updatePositionDisplay(x, y);
        showAlignmentGuides(target);
    }

    function onDragEnd(event) {
        event.target.classList.remove('dragging');
        saveElementPosition(event.target);
        hideAlignmentGuides();
    }

    function onResizeMove(event) {
        const target = event.target;
        let x = parseFloat(target.getAttribute('data-x')) || parseFloat(target.style.left) || 0;
        let y = parseFloat(target.getAttribute('data-y')) || parseFloat(target.style.top) || 0;

        target.style.width = event.rect.width + 'px';
        target.style.height = event.rect.height + 'px';

        x += event.deltaRect.left;
        y += event.deltaRect.top;

        target.style.left = x + 'px';
        target.style.top = y + 'px';
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

        updateSizeDisplay(event.rect.width, event.rect.height);
    }

    function onResizeEnd(event) {
        saveElementPosition(event.target);
    }

    function onRotateMove(event) {
        const element = event.target.closest('.free-positioned');
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        let degrees = angle * (180 / Math.PI) + 90;

        if (event.shiftKey) {
            degrees = Math.round(degrees / 15) * 15;
        }

        element.style.transform = `rotate(${degrees}deg)`;
        element.setAttribute('data-rotation', degrees);

        const rotationInput = document.getElementById('rotationValue');
        if (rotationInput) rotationInput.value = Math.round(degrees);
    }

    function onRotateEnd(event) {
        const element = event.target.closest('.free-positioned');
        if (element) saveElementPosition(element);
    }

    function selectElementByDOM(domElement) {
        document.querySelectorAll('.free-positioned.selected').forEach(el => {
            el.classList.remove('selected');
        });

        domElement.classList.add('selected');
        selectedElement = domElement;
        showElementToolbar();

        // Update rotation input to show current rotation
        const currentRotation = parseFloat(domElement.getAttribute('data-rotation')) || 0;
        const rotationInput = document.getElementById('rotationValue');
        if (rotationInput) {
            rotationInput.value = Math.round(currentRotation);
        }
    }

    function selectElement(elementId) {
        const element = document.querySelector(`[data-element-id="${elementId}"]`);
        if (element) selectElementByDOM(element);
    }

    function deselectElement() {
        if (selectedElement) {
            selectedElement.classList.remove('selected');
        }
        selectedElement = null;
        hideElementToolbar();
    }

    function saveElementPosition(domElement) {
        const page = bookData.pages[currentPageIndex];
        const index = parseInt(domElement.dataset.index);

        const x = parseFloat(domElement.style.left) || 0;
        const y = parseFloat(domElement.style.top) || 0;
        const width = parseFloat(domElement.style.width) || 0;
        const height = parseFloat(domElement.style.height) || 0;
        const rotation = parseFloat(domElement.getAttribute('data-rotation')) || 0;

        const isImage = domElement.classList.contains('uploaded-image') || domElement.classList.contains('page-element-image');

        if (isImage && page.images && page.images[index]) {
            const img = page.images[index];
            if (typeof img === 'object') {
                img.x = x;
                img.y = y;
                img.width = width;
                img.height = height;
                img.rotation = rotation;
            }
        } else if (!isImage && page.textBlocks && page.textBlocks[index]) {
            page.textBlocks[index].x = x;
            page.textBlocks[index].y = y;
            page.textBlocks[index].width = width;
            page.textBlocks[index].rotation = rotation;
        }

        saveBookData();
        PageManager.renderThumbnailStrip();
    }

    function showElementToolbar() {
        const toolbar = document.getElementById('elementToolbar');
        if (toolbar) toolbar.classList.add('active');
    }

    function hideElementToolbar() {
        const toolbar = document.getElementById('elementToolbar');
        if (toolbar) toolbar.classList.remove('active');
    }

    function updatePositionDisplay(x, y) {
        const display = document.getElementById('positionDisplay');
        if (display) display.textContent = `X: ${Math.round(x)} Y: ${Math.round(y)}`;
    }

    function updateSizeDisplay(width, height) {
        const display = document.getElementById('sizeDisplay');
        if (display) display.textContent = `${Math.round(width)} × ${Math.round(height)}`;
    }

    function bringToFront() {
        if (!selectedElement) return;
        const elements = document.querySelectorAll('.free-positioned');
        let maxZ = 0;
        elements.forEach(el => {
            const z = parseInt(el.style.zIndex) || 0;
            if (z > maxZ) maxZ = z;
        });
        selectedElement.style.zIndex = maxZ + 1;
        saveElementZIndex(maxZ + 1);
    }

    function sendToBack() {
        if (!selectedElement) return;
        const elements = document.querySelectorAll('.free-positioned');
        let minZ = 999999;
        elements.forEach(el => {
            if (el !== selectedElement) {
                const z = parseInt(el.style.zIndex) || 0;
                if (z < minZ) minZ = z;
            }
        });
        const newZ = Math.max(0, minZ - 1);
        selectedElement.style.zIndex = newZ;
        saveElementZIndex(newZ);
    }

    function saveElementZIndex(zIndex) {
        const page = bookData.pages[currentPageIndex];
        const index = parseInt(selectedElement.dataset.index);
        const isImage = selectedElement.classList.contains('uploaded-image');

        if (isImage && page.images && page.images[index] && typeof page.images[index] === 'object') {
            page.images[index].zIndex = zIndex;
        } else if (!isImage && page.textBlocks && page.textBlocks[index]) {
            page.textBlocks[index].zIndex = zIndex;
        }
        saveBookData();
    }

    function setRotation(degrees) {
        if (!selectedElement) return;
        selectedElement.style.transform = `rotate(${degrees}deg)`;
        selectedElement.setAttribute('data-rotation', degrees);
        saveElementPosition(selectedElement);
    }

    function deleteSelected() {
        if (!selectedElement) return;
        if (!confirm('Delete this element?')) return;

        const page = bookData.pages[currentPageIndex];
        const index = parseInt(selectedElement.dataset.index);
        const isImage = selectedElement.classList.contains('uploaded-image');

        if (isImage && page.images) {
            page.images.splice(index, 1);
        } else if (!isImage && page.textBlocks) {
            page.textBlocks.splice(index, 1);
        }

        selectedElement.remove();
        deselectElement();
        saveBookData();
        renderCurrentPage();
        PageManager.renderThumbnailStrip();
        PageManager.showToast('Element deleted');
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!selectedElement) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    deleteSelected();
                    break;
                case 'Escape':
                    deselectElement();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    nudgeElement(0, e.shiftKey ? -20 : -5);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    nudgeElement(0, e.shiftKey ? 20 : 5);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    nudgeElement(e.shiftKey ? -20 : -5, 0);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    nudgeElement(e.shiftKey ? 20 : 5, 0);
                    break;
            }
        });
    }

    function nudgeElement(dx, dy) {
        if (!selectedElement) return;
        const x = (parseFloat(selectedElement.style.left) || 0) + dx;
        const y = (parseFloat(selectedElement.style.top) || 0) + dy;
        selectedElement.style.left = x + 'px';
        selectedElement.style.top = y + 'px';
        selectedElement.setAttribute('data-x', x);
        selectedElement.setAttribute('data-y', y);
        saveElementPosition(selectedElement);
    }

    function setupTouchGestures() {
        // Enable touch gestures on all free-positioned elements
        enableTouchGesturesOnElements();

        // Re-enable touch gestures when new elements are added (via MutationObserver)
        const canvas = document.getElementById('pageCanvas');
        if (canvas) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('free-positioned')) {
                            enableTouchGesturesOnElement(node);
                        }
                    });
                });
            });

            observer.observe(canvas, { childList: true, subtree: true });
        }
    }

    function enableTouchGesturesOnElements() {
        const elements = document.querySelectorAll('.free-positioned');
        elements.forEach(element => {
            enableTouchGesturesOnElement(element);
        });
    }

    function enableTouchGesturesOnElement(element) {
        if (!TouchGestures) return;

        // Enable pinch-to-zoom and two-finger rotation
        TouchGestures.enablePinchAndRotate(element, {
            onScale: function(scale, elem, newWidth, newHeight) {
                // Update element size
                elem.style.width = newWidth + 'px';
                elem.style.height = newHeight + 'px';
            },
            onRotate: function(rotation, elem) {
                // Update element rotation
                elem.style.transform = `rotate(${rotation}deg)`;

                // Update rotation input if element is selected
                if (selectedElement === elem) {
                    const rotationInput = document.getElementById('rotationValue');
                    if (rotationInput) {
                        rotationInput.value = Math.round(rotation);
                    }
                }
            },
            onGestureEnd: function(elem) {
                // Save position after gesture
                saveElementPosition(elem);
                PageManager.renderThumbnailStrip();
            }
        });
    }

    function reinitialize() {
        if (typeof interact !== 'undefined') {
            setupInteract();

            // Re-enable touch gestures
            if (TouchGestures) {
                setupTouchGestures();
            }
        }
    }

    // Click outside to deselect
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.free-positioned') && !e.target.closest('#elementToolbar')) {
            deselectElement();
        }
    });

    return {
        init,
        reinitialize,
        selectElement,
        deselectElement,
        bringToFront,
        sendToBack,
        setRotation,
        deleteSelected
    };
})();

window.FreeLayout = FreeLayout;
