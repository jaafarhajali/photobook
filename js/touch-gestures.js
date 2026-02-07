/**
 * Touch Gestures Module
 * Handles advanced touch gestures: pinch-to-zoom, two-finger rotation, swipe detection
 */

const TouchGestures = (function() {
    // Touch state tracking
    let touchState = {
        touches: [],
        initialDistance: 0,
        initialAngle: 0,
        initialScale: 1,
        currentScale: 1,
        currentRotation: 0,
        isGesturing: false,
        target: null,
        startTime: 0
    };

    // Swipe detection
    const SWIPE_THRESHOLD = 50;
    const SWIPE_VELOCITY_THRESHOLD = 0.3;
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeStartTime = 0;

    function init() {
        console.log('TouchGestures: Initialized');
        setupGlobalListeners();
    }

    function setupGlobalListeners() {
        // Prevent default pinch-zoom on the entire page
        document.addEventListener('touchmove', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    /**
     * Enable pinch-to-zoom gesture on an element
     * @param {HTMLElement} element - The element to enable pinch zoom on
     * @param {Function} onScale - Callback function(scale, element)
     */
    function enablePinchZoom(element, onScale) {
        let initialWidth = 0;
        let initialHeight = 0;

        element.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                touchState.isGesturing = true;
                touchState.target = element;
                touchState.touches = Array.from(e.touches);
                touchState.initialDistance = getDistance(e.touches[0], e.touches[1]);
                touchState.initialScale = parseFloat(element.getAttribute('data-scale')) || 1;

                // Store initial dimensions
                initialWidth = element.offsetWidth;
                initialHeight = element.offsetHeight;
            }
        }, { passive: false });

        element.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2 && touchState.isGesturing && touchState.target === element) {
                e.preventDefault();

                const currentDistance = getDistance(e.touches[0], e.touches[1]);
                const scale = (currentDistance / touchState.initialDistance) * touchState.initialScale;

                touchState.currentScale = scale;
                element.setAttribute('data-scale', scale);

                // Calculate new dimensions
                const newWidth = initialWidth * scale;
                const newHeight = initialHeight * scale;

                // Call callback
                if (onScale && typeof onScale === 'function') {
                    onScale(scale, element, newWidth, newHeight);
                }
            }
        }, { passive: false });

        element.addEventListener('touchend', function(e) {
            if (e.touches.length < 2) {
                touchState.isGesturing = false;
                touchState.target = null;
            }
        });
    }

    /**
     * Enable two-finger rotation gesture on an element
     * @param {HTMLElement} element - The element to enable rotation on
     * @param {Function} onRotate - Callback function(angle, element)
     */
    function enableTwoFingerRotation(element, onRotate) {
        element.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                touchState.isGesturing = true;
                touchState.target = element;
                touchState.touches = Array.from(e.touches);
                touchState.initialAngle = getAngle(e.touches[0], e.touches[1]);
                touchState.currentRotation = parseFloat(element.getAttribute('data-rotation')) || 0;
            }
        }, { passive: false });

        element.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2 && touchState.isGesturing && touchState.target === element) {
                e.preventDefault();

                const currentAngle = getAngle(e.touches[0], e.touches[1]);
                const angleDiff = currentAngle - touchState.initialAngle;
                const rotation = touchState.currentRotation + angleDiff;

                element.setAttribute('data-rotation', rotation);

                // Call callback
                if (onRotate && typeof onRotate === 'function') {
                    onRotate(rotation, element);
                }
            }
        }, { passive: false });

        element.addEventListener('touchend', function(e) {
            if (e.touches.length < 2) {
                touchState.isGesturing = false;
                touchState.target = null;
            }
        });
    }

    /**
     * Enable combined pinch-zoom and rotation on an element
     * @param {HTMLElement} element - The element to enable gestures on
     * @param {Object} callbacks - { onScale, onRotate, onGestureEnd }
     */
    function enablePinchAndRotate(element, callbacks = {}) {
        let initialWidth = 0;
        let initialHeight = 0;

        element.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                touchState.isGesturing = true;
                touchState.target = element;
                touchState.touches = Array.from(e.touches);
                touchState.initialDistance = getDistance(e.touches[0], e.touches[1]);
                touchState.initialAngle = getAngle(e.touches[0], e.touches[1]);
                touchState.initialScale = parseFloat(element.getAttribute('data-scale')) || 1;
                touchState.currentRotation = parseFloat(element.getAttribute('data-rotation')) || 0;

                initialWidth = element.offsetWidth;
                initialHeight = element.offsetHeight;
                touchState.startTime = Date.now();
            }
        }, { passive: false });

        element.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2 && touchState.isGesturing && touchState.target === element) {
                e.preventDefault();

                // Calculate scale
                const currentDistance = getDistance(e.touches[0], e.touches[1]);
                const scale = (currentDistance / touchState.initialDistance) * touchState.initialScale;
                touchState.currentScale = scale;
                element.setAttribute('data-scale', scale);

                const newWidth = initialWidth * scale;
                const newHeight = initialHeight * scale;

                // Calculate rotation
                const currentAngle = getAngle(e.touches[0], e.touches[1]);
                const angleDiff = currentAngle - touchState.initialAngle;
                const rotation = touchState.currentRotation + angleDiff;
                element.setAttribute('data-rotation', rotation);

                // Call callbacks
                if (callbacks.onScale && typeof callbacks.onScale === 'function') {
                    callbacks.onScale(scale, element, newWidth, newHeight);
                }

                if (callbacks.onRotate && typeof callbacks.onRotate === 'function') {
                    callbacks.onRotate(rotation, element);
                }
            }
        }, { passive: false });

        element.addEventListener('touchend', function(e) {
            if (touchState.isGesturing && touchState.target === element) {
                touchState.isGesturing = false;
                touchState.target = null;

                // Call gesture end callback
                if (callbacks.onGestureEnd && typeof callbacks.onGestureEnd === 'function') {
                    callbacks.onGestureEnd(element);
                }
            }
        });
    }

    /**
     * Detect horizontal swipe gestures
     * @param {HTMLElement} element - The element to detect swipes on
     * @param {Object} callbacks - { onSwipeLeft, onSwipeRight }
     */
    function enableSwipe(element, callbacks = {}) {
        element.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                swipeStartX = e.touches[0].clientX;
                swipeStartY = e.touches[0].clientY;
                swipeStartTime = Date.now();
            }
        }, { passive: true });

        element.addEventListener('touchend', function(e) {
            if (e.changedTouches.length === 1) {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const endTime = Date.now();

                const deltaX = endX - swipeStartX;
                const deltaY = endY - swipeStartY;
                const deltaTime = endTime - swipeStartTime;

                const velocity = Math.abs(deltaX) / deltaTime;

                // Check if horizontal swipe (not vertical)
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (Math.abs(deltaX) > SWIPE_THRESHOLD && velocity > SWIPE_VELOCITY_THRESHOLD) {
                        if (deltaX > 0) {
                            // Swipe right
                            if (callbacks.onSwipeRight && typeof callbacks.onSwipeRight === 'function') {
                                callbacks.onSwipeRight(deltaX, velocity);
                            }
                        } else {
                            // Swipe left
                            if (callbacks.onSwipeLeft && typeof callbacks.onSwipeLeft === 'function') {
                                callbacks.onSwipeLeft(deltaX, velocity);
                            }
                        }
                    }
                }
            }
        }, { passive: true });
    }

    /**
     * Calculate distance between two touch points
     */
    function getDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate angle between two touch points (in degrees)
     */
    function getAngle(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }

    /**
     * Check if device supports touch
     */
    function isTouchDevice() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    // Public API
    return {
        init,
        enablePinchZoom,
        enableTwoFingerRotation,
        enablePinchAndRotate,
        enableSwipe,
        isTouchDevice
    };
})();

// Export for use in other modules
window.TouchGestures = TouchGestures;
