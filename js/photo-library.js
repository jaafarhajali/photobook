/**
 * Photo Library Module
 * Handles global photo storage, upload, and drag-to-canvas
 */

const PhotoLibrary = (function() {
    let draggedPhoto = null;

    function init() {
        loadLibrary();
        renderLibrary();
        setupDropZone();
    }

    function loadLibrary() {
        if (!bookData.photoLibrary) {
            bookData.photoLibrary = [];
            // Migrate existing images
            bookData.pages.forEach(page => {
                if (page.images && page.images.length > 0) {
                    page.images.forEach(img => {
                        const src = typeof img === 'string' ? img : img.src;
                        const exists = bookData.photoLibrary.some(p => p.src === src);
                        if (!exists) {
                            bookData.photoLibrary.push({
                                id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                                src: src,
                                name: `Image ${bookData.photoLibrary.length + 1}`,
                                dateAdded: new Date().toISOString()
                            });
                        }
                    });
                }
            });
            saveBookData();
        }
    }

    function renderLibrary() {
        const container = document.getElementById('photoLibraryGrid');
        if (!container) return;

        if (bookData.photoLibrary.length === 0) {
            container.innerHTML = `
                <div class="empty-state-compact">
                    <i class="fas fa-images"></i>
                    <span>No photos yet</span>
                    <label for="libraryUpload" class="btn-action" style="margin-top: 8px; padding: 8px 16px; font-size: 0.8125rem; cursor: pointer;">
                        <i class="fas fa-upload"></i> Upload Photos
                    </label>
                </div>
            `;
            updatePhotoCount();
            return;
        }

        container.innerHTML = '';
        bookData.photoLibrary.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'photo-grid-item';
            item.dataset.photoId = photo.id;
            item.draggable = true;

            item.innerHTML = `
                <img src="${photo.src}" alt="${photo.name || 'Photo'}" loading="lazy">
                <button class="photo-grid-delete" title="Remove from library">
                    <i class="fas fa-times"></i>
                </button>
            `;

            // Single click adds photo to current page
            item.addEventListener('click', (e) => {
                if (e.target.closest('.photo-grid-delete')) return;
                addPhotoToPage(photo.id);

                // Visual feedback: brief pulse
                item.style.transform = 'scale(0.9)';
                item.style.opacity = '0.6';
                setTimeout(() => {
                    item.style.transform = '';
                    item.style.opacity = '';
                }, 300);
            });

            item.addEventListener('dragstart', (e) => handleDragStart(e, photo));
            item.addEventListener('dragend', handleDragEnd);
            item.querySelector('.photo-grid-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFromLibrary(photo.id);
            });

            container.appendChild(item);
        });

        updatePhotoCount();
    }

    function updatePhotoCount() {
        const countEl = document.getElementById('libraryPhotoCount');
        const countEl2 = document.getElementById('libraryCount');
        if (countEl) countEl.textContent = bookData.photoLibrary?.length || 0;
        if (countEl2) countEl2.textContent = bookData.photoLibrary?.length || 0;
    }

    function uploadPhotos(files) {
        console.log('PhotoLibrary.uploadPhotos called with', files.length, 'files');
        const fileArray = Array.from(files);
        let processed = 0;
        const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));

        console.log('Found', imageFiles.length, 'image files');

        if (imageFiles.length === 0) {
            alert('No valid image files selected');
            return;
        }

        imageFiles.forEach(file => {
            console.log('Processing file:', file.name);
            const reader = new FileReader();
            reader.onload = function(e) {
                console.log('File read successfully:', file.name);
                // Create an image to get dimensions
                const img = new Image();
                img.onload = function() {
                    console.log('Image loaded:', file.name, img.naturalWidth + 'x' + img.naturalHeight);
                    const photo = {
                        id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        src: e.target.result,
                        name: file.name,
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        aspectRatio: img.naturalWidth / img.naturalHeight,
                        fileSize: file.size,
                        dateAdded: new Date().toISOString()
                    };

                    bookData.photoLibrary.push(photo);
                    processed++;
                    console.log('Photo added. Total in library:', bookData.photoLibrary.length);

                    if (processed === imageFiles.length) {
                        console.log('All photos processed. Saving and rendering...');
                        saveBookData();
                        renderLibrary();
                        alert(`${processed} photo(s) added successfully!`);
                    }
                };
                img.onerror = function() {
                    console.error('Image load failed:', file.name);
                    processed++;
                    alert(`Failed to load ${file.name}`);
                    if (processed === imageFiles.length && bookData.photoLibrary.length > 0) {
                        saveBookData();
                        renderLibrary();
                    }
                };
                img.src = e.target.result;
            };
            reader.onerror = function(error) {
                console.error('FileReader error:', error);
            };
            reader.readAsDataURL(file);
        });
    }

    function deleteFromLibrary(photoId) {
        if (!confirm('Remove this photo from the library?')) return;

        const index = bookData.photoLibrary.findIndex(p => p.id === photoId);
        if (index !== -1) {
            bookData.photoLibrary.splice(index, 1);
        }

        saveBookData();
        renderLibrary();
        PageManager.showToast('Photo removed');
    }

    function addPhotoToPage(photoId, x = null, y = null) {
        const photo = bookData.photoLibrary.find(p => p.id === photoId);
        if (!photo) {
            console.warn('PhotoLibrary: Photo not found in library:', photoId);
            PageManager.showToast('Photo not found in library', 'error');
            return;
        }

        const page = bookData.pages[currentPageIndex];
        if (!page.images) page.images = [];

        const canvas = document.getElementById('pageCanvas');
        if (!canvas) {
            console.error('PhotoLibrary: pageCanvas element not found');
            return;
        }

        if (page.layoutMode === 'free') {
            // Free mode: position-based placement
            const rect = canvas.getBoundingClientRect();
            const baseWidth = 220;
            const aspectRatio = photo.aspectRatio || (photo.width && photo.height ? photo.width / photo.height : 1);
            const width = baseWidth;
            const height = baseWidth / aspectRatio;
            const posX = x !== null ? x : (rect.width - width) / 2;
            const posY = y !== null ? y : (rect.height - height) / 2;

            page.images.push({
                src: photo.src,
                photoId: photoId,
                x: posX,
                y: posY,
                width: width,
                height: height,
                aspectRatio: aspectRatio,
                rotation: 0,
                zIndex: page.images.length + 1
            });
        } else {
            // Grid mode: place at selected slot or next available
            const maxSlots = getGridMaxSlots(page);
            const targetSlot = (typeof window.selectedGridSlot === 'number') ? window.selectedGridSlot : null;

            if (targetSlot !== null && targetSlot < maxSlots) {
                // Place at the specific slot the user clicked
                while (page.images.length <= targetSlot) {
                    page.images.push(null);
                }
                page.images[targetSlot] = photo.src;
                window.selectedGridSlot = null;
            } else {
                // Find next empty slot (null gap or append)
                const filledCount = page.images.filter(img => img !== null && img !== undefined).length;
                if (filledCount >= maxSlots) {
                    PageManager.showToast('Grid is full. Use a larger template or switch to Free mode.', 'error');
                    return;
                }

                let placed = false;
                // First try to fill a null gap
                for (let i = 0; i < page.images.length; i++) {
                    if (page.images[i] === null) {
                        page.images[i] = photo.src;
                        placed = true;
                        break;
                    }
                }
                // Otherwise append
                if (!placed) {
                    page.images.push(photo.src);
                }
                window.selectedGridSlot = null;
            }
        }

        saveBookData();
        renderCurrentPage();
        PageManager.renderThumbnailStrip();
        PageManager.showToast('Photo added to page');
    }

    function getGridMaxSlots(page) {
        if (typeof GridLayout !== 'undefined') {
            const templateDef = GridLayout.getTemplate(page.gridTemplate);
            if (templateDef) {
                return templateDef.cells ? templateDef.cells.length : templateDef.rows * templateDef.cols;
            }
        }
        return (page.gridRows || 2) * (page.gridCols || 2);
    }

    function handleDragStart(e, photo) {
        draggedPhoto = photo;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', photo.id);
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
        draggedPhoto = null;
        const canvas = document.getElementById('pageCanvas');
        if (canvas) canvas.classList.remove('drop-target');
    }

    function setupDropZone() {
        const canvas = document.getElementById('pageCanvas');
        if (!canvas) return;

        // Handle dragover on canvas and all children (via capture phase for reliability)
        canvas.addEventListener('dragover', (e) => {
            if (draggedPhoto || isDragFromLibrary(e)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                canvas.classList.add('drop-target');
            }
        });

        canvas.addEventListener('dragleave', (e) => {
            // Check if mouse left canvas entirely (not just moved to child element)
            const rect = canvas.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX >= rect.right ||
                e.clientY < rect.top || e.clientY >= rect.bottom) {
                canvas.classList.remove('drop-target');
            }
        });

        canvas.addEventListener('drop', (e) => {
            canvas.classList.remove('drop-target');
            if (draggedPhoto) {
                e.preventDefault();
                e.stopPropagation();
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left - 110;
                const y = e.clientY - rect.top - 110;
                addPhotoToPage(draggedPhoto.id, x, y);
            } else if (isDragFromLibrary(e)) {
                e.preventDefault();
                e.stopPropagation();
                const photoId = e.dataTransfer.getData('text/plain');
                if (photoId) {
                    addPhotoToPage(photoId);
                }
            }
        });

        // Also listen on imageContainer to ensure events aren't swallowed
        const imageContainer = document.getElementById('imageContainer');
        if (imageContainer) {
            imageContainer.addEventListener('dragover', (e) => {
                if (draggedPhoto || isDragFromLibrary(e)) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    canvas.classList.add('drop-target');
                }
            });

            imageContainer.addEventListener('drop', (e) => {
                canvas.classList.remove('drop-target');
                if (draggedPhoto) {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left - 110;
                    const y = e.clientY - rect.top - 110;
                    addPhotoToPage(draggedPhoto.id, x, y);
                } else if (isDragFromLibrary(e)) {
                    e.preventDefault();
                    e.stopPropagation();
                    const photoId = e.dataTransfer.getData('text/plain');
                    if (photoId) {
                        addPhotoToPage(photoId);
                    }
                }
            });
        }
    }

    function isDragFromLibrary(e) {
        try {
            return e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('text/plain');
        } catch (err) {
            return false;
        }
    }

    return {
        init,
        loadLibrary,
        renderLibrary,
        uploadPhotos,
        deleteFromLibrary,
        addPhotoToPage,
        getGridMaxSlots,
        getDraggedPhoto: function() { return draggedPhoto; }
    };
})();

window.PhotoLibrary = PhotoLibrary;
