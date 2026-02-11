/**
 * Photo Library Module
 * Handles global photo storage, upload, and drag-to-canvas.
 * Image data (src) is stored in IndexedDB via PhotoDB.
 * Only metadata (id, name, dimensions) is kept in bookData/localStorage.
 */

const PhotoLibrary = (function() {
    let draggedPhoto = null;

    // In-memory cache of photo src data loaded from IndexedDB
    // Key: photo id, Value: base64 data URL
    let srcCache = {};

    /**
     * Compress an image to reduce storage usage.
     * Resizes to max 1600px and compresses to JPEG ~80% quality.
     */
    function compressImage(dataUrl, callback) {
        var img = new Image();
        img.onload = function() {
            var maxW = 1600, maxH = 1600;
            var w = img.naturalWidth;
            var h = img.naturalHeight;

            if (w > maxW || h > maxH) {
                var ratio = Math.min(maxW / w, maxH / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }

            try {
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                var compressed = canvas.toDataURL('image/jpeg', 0.80);
                // Use compressed only if smaller
                callback(compressed.length < dataUrl.length ? compressed : dataUrl, w, h);
            } catch (e) {
                callback(dataUrl, img.naturalWidth, img.naturalHeight);
            }
        };
        img.onerror = function() {
            callback(dataUrl, 0, 0);
        };
        img.src = dataUrl;
    }

    function init() {
        loadLibrary();
    }

    /**
     * Load the library: migrate any old src data into IndexedDB,
     * then load all src from IndexedDB into memory cache, then render.
     */
    function loadLibrary() {
        if (!bookData.photoLibrary) {
            bookData.photoLibrary = [];
            // Migrate existing page images into library
            bookData.pages.forEach(page => {
                if (page.images && page.images.length > 0) {
                    page.images.forEach(img => {
                        const src = typeof img === 'string' ? img : img.src;
                        const exists = bookData.photoLibrary.some(p => p.id && srcCache[p.id] === src);
                        if (!exists && src) {
                            bookData.photoLibrary.push({
                                id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                                src: src, // will be migrated below
                                name: 'Image ' + (bookData.photoLibrary.length + 1),
                                dateAdded: new Date().toISOString()
                            });
                        }
                    });
                }
            });
        }

        // Migrate: if any library entries still have a .src field, move it to IndexedDB
        var toMigrate = [];
        bookData.photoLibrary.forEach(function(photo) {
            if (photo.src) {
                toMigrate.push({ id: photo.id, src: photo.src });
                srcCache[photo.id] = photo.src;
            }
        });

        if (toMigrate.length > 0) {
            PhotoDB.saveMany(toMigrate).then(function() {
                // Remove src from metadata to free localStorage space
                bookData.photoLibrary.forEach(function(photo) {
                    delete photo.src;
                });
                saveBookData();
                renderLibrary();
                setupDropZone();
            }).catch(function() {
                // If IndexedDB fails, keep src in memory at least
                renderLibrary();
                setupDropZone();
            });
        } else {
            // Load src data from IndexedDB into cache
            PhotoDB.getAllPhotos().then(function(map) {
                srcCache = map;
                renderLibrary();
                setupDropZone();
            }).catch(function() {
                renderLibrary();
                setupDropZone();
            });
        }
    }

    /**
     * Get the image src for a photo (from in-memory cache).
     * Returns the base64 data URL or empty string if not loaded yet.
     */
    function getPhotoSrc(photoId) {
        return srcCache[photoId] || '';
    }

    function renderLibrary() {
        const container = document.getElementById('photoLibraryGrid');
        if (!container) return;

        if (bookData.photoLibrary.length === 0) {
            container.innerHTML = '<div class="empty-state-compact">' +
                '<i class="fas fa-images"></i>' +
                '<span>No photos yet</span>' +
                '<label for="libraryUpload" class="btn-action" style="margin-top: 8px; padding: 8px 16px; font-size: 0.8125rem; cursor: pointer;">' +
                '<i class="fas fa-upload"></i> Upload Photos</label></div>';
            updatePhotoCount();
            return;
        }

        container.innerHTML = '';
        bookData.photoLibrary.forEach((photo, index) => {
            const src = srcCache[photo.id] || '';
            if (!src) return; // skip if image not loaded yet

            const item = document.createElement('div');
            item.className = 'photo-grid-item';
            item.dataset.photoId = photo.id;
            item.draggable = true;

            item.innerHTML =
                '<img src="' + src + '" alt="' + (photo.name || 'Photo') + '" loading="lazy">' +
                '<button class="photo-grid-delete" title="Remove from library">' +
                '<i class="fas fa-times"></i></button>';

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
        const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));

        console.log('Found', imageFiles.length, 'image files');

        if (imageFiles.length === 0) {
            if (typeof PageManager !== 'undefined' && PageManager.showToast) {
                PageManager.showToast('No valid image files selected', 'error');
            }
            return;
        }

        let processed = 0;

        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Compress before storing
                compressImage(e.target.result, function(compressedSrc, w, h) {
                    const photoId = 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

                    // Metadata only (no src) — goes to bookData/localStorage
                    const photo = {
                        id: photoId,
                        name: file.name,
                        width: w,
                        height: h,
                        aspectRatio: (w && h) ? w / h : 1,
                        fileSize: file.size,
                        dateAdded: new Date().toISOString()
                    };

                    bookData.photoLibrary.push(photo);

                    // Image data goes to IndexedDB
                    srcCache[photoId] = compressedSrc;
                    PhotoDB.savePhoto(photoId, compressedSrc).then(function() {
                        processed++;
                        if (processed === imageFiles.length) {
                            saveBookData();
                            renderLibrary();
                            if (typeof PageManager !== 'undefined' && PageManager.showToast) {
                                PageManager.showToast(processed + ' photo(s) added');
                            }
                        }
                    }).catch(function(err) {
                        console.error('Failed to save photo to IndexedDB:', err);
                        processed++;
                        if (processed === imageFiles.length) {
                            saveBookData();
                            renderLibrary();
                        }
                    });
                });
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

        // Remove from IndexedDB and cache
        delete srcCache[photoId];
        PhotoDB.deletePhoto(photoId);

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

        const src = srcCache[photoId];
        if (!src) {
            console.warn('PhotoLibrary: Photo src not loaded for:', photoId);
            PageManager.showToast('Photo not ready yet, try again', 'error');
            return;
        }

        const page = bookData.pages[currentPageIndex];
        if (!page.images) page.images = [];

        const canvas = document.getElementById('pageCanvas');
        if (!canvas) {
            console.error('PhotoLibrary: pageCanvas element not found');
            return;
        }

        let placedIndex = -1;

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
                src: src,
                photoId: photoId,
                x: posX,
                y: posY,
                width: width,
                height: height,
                aspectRatio: aspectRatio,
                rotation: 0,
                zIndex: page.images.length + 1
            });
            placedIndex = page.images.length - 1;
        } else {
            // Grid mode: place at selected slot or next available
            const maxSlots = getGridMaxSlots(page);
            const targetSlot = (typeof window.selectedGridSlot === 'number') ? window.selectedGridSlot : null;

            if (targetSlot !== null && targetSlot < maxSlots) {
                while (page.images.length <= targetSlot) {
                    page.images.push(null);
                }
                page.images[targetSlot] = src;
                placedIndex = targetSlot;
                window.selectedGridSlot = null;
            } else {
                const filledCount = page.images.filter(img => img !== null && img !== undefined).length;
                if (filledCount >= maxSlots) {
                    PageManager.showToast('Grid is full. Use a larger template or switch to Free mode.', 'error');
                    return;
                }

                let placed = false;
                for (let i = 0; i < page.images.length; i++) {
                    if (page.images[i] === null) {
                        page.images[i] = src;
                        placedIndex = i;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    page.images.push(src);
                    placedIndex = page.images.length - 1;
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

        canvas.addEventListener('dragover', (e) => {
            if (draggedPhoto || isDragFromLibrary(e)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                canvas.classList.add('drop-target');
            }
        });

        canvas.addEventListener('dragleave', (e) => {
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
        getPhotoSrc: getPhotoSrc,
        getDraggedPhoto: function() { return draggedPhoto; }
    };
})();

window.PhotoLibrary = PhotoLibrary;
