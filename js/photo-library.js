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
                    <span>No photos</span>
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

            item.addEventListener('dblclick', () => addPhotoToPage(photo.id));
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
        const fileArray = Array.from(files);
        let processed = 0;
        const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            PageManager.showToast('No valid image files selected', 'error');
            return;
        }

        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Create an image to get dimensions
                const img = new Image();
                img.onload = function() {
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

                    if (processed === imageFiles.length) {
                        saveBookData();
                        renderLibrary();
                        PageManager.showToast(`${processed} photo(s) added`);
                    }
                };
                img.onerror = function() {
                    processed++;
                    PageManager.showToast(`Failed to load ${file.name}`, 'error');
                    if (processed === imageFiles.length && bookData.photoLibrary.length > 0) {
                        saveBookData();
                        renderLibrary();
                    }
                };
                img.src = e.target.result;
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
        if (!photo) return;

        const page = bookData.pages[currentPageIndex];
        if (!page.images) page.images = [];

        const canvas = document.getElementById('pageCanvas');
        const rect = canvas.getBoundingClientRect();

        const width = 220;
        const height = 220;
        const posX = x !== null ? x : (rect.width - width) / 2;
        const posY = y !== null ? y : (rect.height - height) / 2;

        if (page.layoutMode === 'free') {
            page.images.push({
                src: photo.src,
                photoId: photoId,
                x: posX,
                y: posY,
                width: width,
                height: height,
                rotation: 0,
                zIndex: page.images.length + 1
            });
        } else {
            page.images.push(photo.src);
        }

        saveBookData();
        renderCurrentPage();
        PageManager.renderThumbnailStrip();
        PageManager.showToast('Photo added to page');
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
            if (draggedPhoto) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                canvas.classList.add('drop-target');
            }
        });

        canvas.addEventListener('dragleave', (e) => {
            if (!canvas.contains(e.relatedTarget)) {
                canvas.classList.remove('drop-target');
            }
        });

        canvas.addEventListener('drop', (e) => {
            canvas.classList.remove('drop-target');
            if (draggedPhoto) {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left - 110;
                const y = e.clientY - rect.top - 110;
                addPhotoToPage(draggedPhoto.id, x, y);
            }
        });
    }

    return {
        init,
        loadLibrary,
        renderLibrary,
        uploadPhotos,
        deleteFromLibrary,
        addPhotoToPage
    };
})();

window.PhotoLibrary = PhotoLibrary;
