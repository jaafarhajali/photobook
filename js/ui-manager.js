/**
 * UI Manager Module
 * Handles mobile UI interactions: bottom sheet, overlay, touch gestures
 */

const UIManager = (function() {
    let sidebar = null;
    let overlay = null;
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    const SWIPE_THRESHOLD = 50;

    function init() {
        sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        // Only enable on mobile
        if (window.innerWidth <= 768) {
            setupBottomSheet();
            setupOverlay();
        }

        // Re-initialize on resize
        window.addEventListener('resize', handleResize);
    }

    function handleResize() {
        const isMobile = window.innerWidth <= 768;

        if (isMobile && sidebar && !sidebar.hasAttribute('data-touch-enabled')) {
            setupBottomSheet();
            setupOverlay();
        } else if (!isMobile && sidebar && sidebar.hasAttribute('data-touch-enabled')) {
            cleanupBottomSheet();
            cleanupOverlay();
        }
    }

    function setupBottomSheet() {
        if (!sidebar) return;

        sidebar.setAttribute('data-touch-enabled', 'true');

        // Add touch event listeners
        sidebar.addEventListener('touchstart', onTouchStart, { passive: false });
        sidebar.addEventListener('touchmove', onTouchMove, { passive: false });
        sidebar.addEventListener('touchend', onTouchEnd, { passive: false });

        // Add click to toggle on handle area
        sidebar.addEventListener('click', function(e) {
            const rect = sidebar.getBoundingClientRect();
            const clickY = e.clientY - rect.top;

            // If click is in top 60px (handle area), toggle
            if (clickY < 60 && !sidebar.classList.contains('open')) {
                openBottomSheet();
            }
        });
    }

    function cleanupBottomSheet() {
        if (!sidebar) return;

        sidebar.removeAttribute('data-touch-enabled');
        sidebar.removeEventListener('touchstart', onTouchStart);
        sidebar.removeEventListener('touchmove', onTouchMove);
        sidebar.removeEventListener('touchend', onTouchEnd);
    }

    function setupOverlay() {
        // Create overlay if it doesn't exist
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bottomSheetOverlay';
            overlay.className = 'bottom-sheet-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(overlay);

            overlay.addEventListener('click', closeBottomSheet);
        }
    }

    function cleanupOverlay() {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
            overlay = null;
        }
    }

    function onTouchStart(e) {
        // Only handle touches on the sidebar itself, not its children (except handle area)
        const rect = sidebar.getBoundingClientRect();
        const touchY = e.touches[0].clientY - rect.top;

        // Allow dragging from anywhere in the sidebar
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
    }

    function onTouchMove(e) {
        if (!isDragging) return;

        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        // Only allow downward dragging when open, or upward dragging when closed
        if (sidebar.classList.contains('open')) {
            // When open, only respond to downward swipes
            if (deltaY > 0) {
                e.preventDefault();
                const newTransform = Math.min(deltaY, window.innerHeight);
                sidebar.style.transform = `translateY(${newTransform}px)`;
            }
        } else {
            // When closed, only respond to upward swipes
            if (deltaY < 0) {
                e.preventDefault();
                const currentTranslate = sidebar.offsetHeight - 60; // Current closed position
                const newTransform = Math.max(currentTranslate + deltaY, 0);
                sidebar.style.transform = `translateY(${newTransform}px)`;
            }
        }
    }

    function onTouchEnd(e) {
        if (!isDragging) return;

        const deltaY = currentY - startY;

        // Reset transform
        sidebar.style.transform = '';

        // Determine if should open or close based on swipe distance and direction
        if (sidebar.classList.contains('open')) {
            // Close if swiped down more than threshold
            if (deltaY > SWIPE_THRESHOLD) {
                closeBottomSheet();
            }
        } else {
            // Open if swiped up more than threshold
            if (deltaY < -SWIPE_THRESHOLD) {
                openBottomSheet();
            }
        }

        isDragging = false;
    }

    function openBottomSheet() {
        if (!sidebar) return;

        sidebar.classList.add('open');

        if (overlay) {
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'auto';
        }

        // Emit custom event
        document.dispatchEvent(new CustomEvent('bottomSheetOpened'));
    }

    function closeBottomSheet() {
        if (!sidebar) return;

        sidebar.classList.remove('open');

        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
        }

        // Emit custom event
        document.dispatchEvent(new CustomEvent('bottomSheetClosed'));
    }

    function toggleBottomSheet() {
        if (sidebar && sidebar.classList.contains('open')) {
            closeBottomSheet();
        } else {
            openBottomSheet();
        }
    }

    function isOpen() {
        return sidebar && sidebar.classList.contains('open');
    }

    // Public API
    return {
        init,
        openBottomSheet,
        closeBottomSheet,
        toggleBottomSheet,
        isOpen
    };
})();

// Export for use in other modules
window.UIManager = UIManager;
