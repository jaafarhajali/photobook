/**
 * Page Manager Module
 * Handles multi-page management: thumbnails, add/delete, reorder
 */

const PageManager = (function() {
    let draggedThumbnail = null;
    let draggedIndex = null;

    function init() {
        renderThumbnailStrip();

        // Enable swipe navigation on canvas
        if (TouchGestures && TouchGestures.isTouchDevice()) {
            enableSwipeNavigation();
        }
    }

    function renderThumbnailStrip() {
        const container = document.getElementById('pageThumbnailStrip');
        if (!container) return;

        container.innerHTML = '';

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'thumbnail-nav-btn prev';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.onclick = () => scrollThumbnails(-1);
        container.appendChild(prevBtn);

        // Thumbnails wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'thumbnails-wrapper';
        wrapper.id = 'thumbnailsWrapper';

        bookData.pages.forEach((page, index) => {
            const thumbnail = createThumbnail(page, index);
            wrapper.appendChild(thumbnail);
        });

        // Add page button
        const addBtn = document.createElement('div');
        addBtn.className = 'page-thumbnail add-page';
        addBtn.innerHTML = '<i class="fas fa-plus"></i><span>Add Page</span>';
        addBtn.onclick = () => addPage();
        wrapper.appendChild(addBtn);

        container.appendChild(wrapper);

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'thumbnail-nav-btn next';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = () => scrollThumbnails(1);
        container.appendChild(nextBtn);

        updateThumbnailSelection();
    }

    function createThumbnail(page, index) {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'page-thumbnail';
        thumbnail.dataset.index = index;
        thumbnail.draggable = true;

        const preview = document.createElement('div');
        preview.className = 'thumbnail-preview';
        preview.style.backgroundColor = page.backgroundColor || '#ffffff';

        // Add mini previews of images
        if (page.images && page.images.length > 0) {
            const previewGrid = document.createElement('div');
            previewGrid.className = 'thumbnail-preview-grid';

            page.images.slice(0, 4).forEach(img => {
                const src = typeof img === 'string' ? img : img.src;
                const miniImg = document.createElement('div');
                miniImg.className = 'thumbnail-mini-image';
                miniImg.style.backgroundImage = `url(${src})`;
                previewGrid.appendChild(miniImg);
            });

            preview.appendChild(previewGrid);
        }

        thumbnail.appendChild(preview);

        const label = document.createElement('div');
        label.className = 'thumbnail-label';
        label.textContent = `Page ${index + 1}`;
        thumbnail.appendChild(label);

        // Duplicate button
        const dupBtn = document.createElement('button');
        dupBtn.className = 'thumbnail-duplicate';
        dupBtn.innerHTML = '<i class="fas fa-copy"></i>';
        dupBtn.title = 'Duplicate page';
        dupBtn.onclick = (e) => {
            e.stopPropagation();
            duplicatePage(index);
        };
        thumbnail.appendChild(dupBtn);

        if (bookData.pages.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'thumbnail-delete';
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deletePage(index);
            };
            thumbnail.appendChild(deleteBtn);
        }

        thumbnail.onclick = () => goToPage(index);

        // Drag events
        thumbnail.addEventListener('dragstart', handleDragStart);
        thumbnail.addEventListener('dragend', handleDragEnd);
        thumbnail.addEventListener('dragover', handleDragOver);
        thumbnail.addEventListener('dragleave', handleDragLeave);
        thumbnail.addEventListener('drop', handleDrop);

        return thumbnail;
    }

    function updateThumbnailSelection() {
        const thumbnails = document.querySelectorAll('.page-thumbnail:not(.add-page)');
        thumbnails.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === currentPageIndex);
        });

        const activeThumb = document.querySelector('.page-thumbnail.active');
        if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    function scrollThumbnails(direction) {
        const wrapper = document.getElementById('thumbnailsWrapper');
        if (wrapper) {
            wrapper.scrollBy({ left: 150 * direction, behavior: 'smooth' });
        }
    }

    function goToPage(index) {
        if (index >= 0 && index < bookData.pages.length) {
            currentPageIndex = index;
            saveCurrentPageIndex();
            renderCurrentPage();
            updateNavigationButtons();
            updateThumbnailSelection();
        }
    }

    function addPage() {
        const newPage = {
            id: 'page_' + Date.now(),
            backgroundColor: '#ffffff',
            bgPattern: 'none',
            layoutMode: 'grid',
            gridTemplate: '2x2',
            gridRows: 2,
            gridCols: 2,
            gridSpacing: 20,
            gridPadding: 40,
            elements: [],
            images: [],
            textBlocks: [],
            imageColumns: 2,
            imageSpacing: 20
        };

        const insertIndex = currentPageIndex + 1;
        bookData.pages.splice(insertIndex, 0, newPage);
        bookData.numPages = bookData.pages.length;

        saveBookData();
        renderThumbnailStrip();
        goToPage(insertIndex);
        updatePageCountDisplay();
        showToast('Page added');
    }

    function deletePage(index) {
        if (bookData.pages.length <= 1) {
            showToast('Cannot delete the only page', 'error');
            return;
        }

        if (!confirm(`Delete Page ${index + 1}?`)) return;

        bookData.pages.splice(index, 1);
        bookData.numPages = bookData.pages.length;

        if (currentPageIndex >= bookData.pages.length) {
            currentPageIndex = bookData.pages.length - 1;
        } else if (currentPageIndex > index) {
            currentPageIndex--;
        }

        saveBookData();
        saveCurrentPageIndex();
        renderThumbnailStrip();
        renderCurrentPage();
        updateNavigationButtons();
        updatePageCountDisplay();
        showToast('Page deleted');
    }

    function duplicatePage(index) {
        const sourcePage = bookData.pages[index];
        if (!sourcePage) return;

        // Deep clone the page
        const duplicatedPage = JSON.parse(JSON.stringify(sourcePage));
        duplicatedPage.id = 'page_' + Date.now();

        const insertIndex = index + 1;
        bookData.pages.splice(insertIndex, 0, duplicatedPage);
        bookData.numPages = bookData.pages.length;

        saveBookData();
        renderThumbnailStrip();
        goToPage(insertIndex);
        updatePageCountDisplay();
        showToast('Page duplicated');
    }

    function clearPage(index) {
        if (!confirm(`Clear all content from Page ${index + 1}?`)) return;

        const page = bookData.pages[index];
        page.images = [];
        page.textBlocks = [];
        page.elements = [];

        saveBookData();
        renderThumbnailStrip();
        if (index === currentPageIndex) {
            renderCurrentPage();
        }
        showToast('Page cleared');
    }

    function updatePageCountDisplay() {
        const totalPages = document.getElementById('totalPages');
        const totalPagesIndicator = document.getElementById('totalPagesIndicator');
        if (totalPages) totalPages.textContent = bookData.numPages;
        if (totalPagesIndicator) totalPagesIndicator.textContent = bookData.numPages;
    }

    function handleDragStart(e) {
        draggedThumbnail = this;
        draggedIndex = parseInt(this.dataset.index);
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        document.querySelectorAll('.page-thumbnail').forEach(thumb => {
            thumb.classList.remove('drag-over');
        });
        draggedThumbnail = null;
        draggedIndex = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
        if (this !== draggedThumbnail && !this.classList.contains('add-page')) {
            this.classList.add('drag-over');
        }
    }

    function handleDragLeave() {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');

        if (this === draggedThumbnail || this.classList.contains('add-page')) return;

        const targetIndex = parseInt(this.dataset.index);
        if (draggedIndex !== null && targetIndex !== draggedIndex) {
            const [movedPage] = bookData.pages.splice(draggedIndex, 1);
            bookData.pages.splice(targetIndex, 0, movedPage);

            if (currentPageIndex === draggedIndex) {
                currentPageIndex = targetIndex;
            } else if (draggedIndex < currentPageIndex && targetIndex >= currentPageIndex) {
                currentPageIndex--;
            } else if (draggedIndex > currentPageIndex && targetIndex <= currentPageIndex) {
                currentPageIndex++;
            }

            saveBookData();
            saveCurrentPageIndex();
            renderThumbnailStrip();
            renderCurrentPage();
            showToast('Page order updated');
        }
    }

    function showToast(message, type = 'success') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function enableSwipeNavigation() {
        const canvasArea = document.getElementById('pageCanvas');
        if (!canvasArea) return;

        console.log('PageManager: Enabling swipe navigation on canvas');

        TouchGestures.enableSwipe(canvasArea, {
            onSwipeLeft: function(delta, velocity) {
                // Swipe left = next page
                if (currentPageIndex < bookData.numPages - 1) {
                    goToPage(currentPageIndex + 1);
                    showSwipeFeedback('left');
                }
            },
            onSwipeRight: function(delta, velocity) {
                // Swipe right = previous page
                if (currentPageIndex > 0) {
                    goToPage(currentPageIndex - 1);
                    showSwipeFeedback('right');
                }
            }
        });
    }

    function showSwipeFeedback(direction) {
        // Create visual feedback for swipe
        const feedback = document.createElement('div');
        feedback.className = 'swipe-feedback';
        feedback.innerHTML = direction === 'left'
            ? '<i class="fas fa-chevron-right"></i>'
            : '<i class="fas fa-chevron-left"></i>';

        feedback.style.cssText = `
            position: fixed;
            ${direction === 'left' ? 'right' : 'left'}: 20px;
            top: 50%;
            transform: translateY(-50%);
            background: var(--primary-color);
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            z-index: 10000;
            box-shadow: var(--shadow-lg);
            animation: swipeIndicator 0.4s ease-out;
        `;

        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.remove();
        }, 400);
    }

    return {
        init,
        renderThumbnailStrip,
        updateThumbnailSelection,
        goToPage,
        addPage,
        deletePage,
        duplicatePage,
        clearPage,
        showToast
    };
})();

window.PageManager = PageManager;
