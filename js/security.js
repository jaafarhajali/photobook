/**
 * Security Module
 * Sanitization, validation, and XSS protection utilities
 */

const Security = (function() {

    /**
     * Escape HTML special characters to prevent XSS
     */
    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    /**
     * Sanitize user-provided HTML content (for text blocks that may contain basic formatting)
     * Allows only safe tags and strips everything else
     */
    function sanitizeHTML(html) {
        if (typeof html !== 'string') return '';

        const allowedTags = ['b', 'i', 'u', 'em', 'strong', 'br', 'span', 'p', 'div'];
        const allowedAttrs = ['style'];
        const safeStyleProps = [
            'color', 'font-size', 'font-weight', 'font-style', 'font-family',
            'text-align', 'text-decoration', 'line-height', 'letter-spacing',
            'background-color', 'background', 'opacity', 'padding', 'margin'
        ];

        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Remove script tags and event handlers
        const scripts = temp.querySelectorAll('script, iframe, object, embed, form, input, link, meta');
        scripts.forEach(function(el) { el.remove(); });

        // Walk all elements and sanitize
        const allElements = temp.querySelectorAll('*');
        allElements.forEach(function(el) {
            const tagName = el.tagName.toLowerCase();

            // Remove disallowed tags but keep their text content
            if (allowedTags.indexOf(tagName) === -1) {
                el.replaceWith(document.createTextNode(el.textContent));
                return;
            }

            // Remove all attributes except allowed ones
            const attrs = Array.from(el.attributes);
            attrs.forEach(function(attr) {
                if (attr.name.startsWith('on')) {
                    // Remove ALL event handlers
                    el.removeAttribute(attr.name);
                } else if (allowedAttrs.indexOf(attr.name) === -1) {
                    el.removeAttribute(attr.name);
                }
            });

            // Sanitize style attribute
            if (el.hasAttribute('style')) {
                var rawStyle = el.getAttribute('style');
                var cleanParts = [];
                rawStyle.split(';').forEach(function(part) {
                    var trimmed = part.trim();
                    if (!trimmed) return;
                    var colonIdx = trimmed.indexOf(':');
                    if (colonIdx === -1) return;
                    var prop = trimmed.substring(0, colonIdx).trim().toLowerCase();
                    var val = trimmed.substring(colonIdx + 1).trim();
                    // Block javascript: in style values
                    if (val.toLowerCase().indexOf('javascript') !== -1) return;
                    if (val.toLowerCase().indexOf('expression') !== -1) return;
                    if (val.toLowerCase().indexOf('url(') !== -1) return;
                    if (safeStyleProps.indexOf(prop) !== -1) {
                        cleanParts.push(prop + ': ' + val);
                    }
                });
                if (cleanParts.length > 0) {
                    el.setAttribute('style', cleanParts.join('; '));
                } else {
                    el.removeAttribute('style');
                }
            }
        });

        return temp.innerHTML;
    }

    /**
     * Validate and sanitize a filename
     */
    function sanitizeFilename(name) {
        if (typeof name !== 'string') return 'file';
        return name.replace(/[<>"'`;&|\\\/\x00-\x1f]/g, '').substring(0, 200);
    }

    /**
     * Validate image file before upload
     * Accepts all image/* MIME types the browser can handle
     * Returns { valid: boolean, error: string }
     */
    function validateImageFile(file, options) {
        var opts = options || {};
        var maxSize = opts.maxSize || 50 * 1024 * 1024; // 50MB default

        if (!file || !file.type) {
            return { valid: false, error: 'Invalid file' };
        }

        // Accept any image MIME type
        if (!file.type.startsWith('image/')) {
            return { valid: false, error: file.name + ': Not an image file (' + file.type + ')' };
        }

        // Validate file size
        if (file.size > maxSize) {
            var sizeMB = (maxSize / (1024 * 1024)).toFixed(0);
            return { valid: false, error: file.name + ': File too large (max ' + sizeMB + 'MB)' };
        }

        if (file.size === 0) {
            return { valid: false, error: file.name + ': File is empty' };
        }

        return { valid: true, error: null };
    }

    /**
     * Compress and resize an image data URL to reduce storage size.
     * Crucial for preventing localStorage quota crashes on heavy use.
     * @param {string} dataUrl - The original base64 data URL
     * @param {object} options - { maxWidth, maxHeight, quality }
     * @param {function} callback - function(compressedDataUrl, width, height)
     */
    function compressImage(dataUrl, options, callback) {
        var opts = options || {};
        var maxW = opts.maxWidth || 2048;
        var maxH = opts.maxHeight || 2048;
        var quality = opts.quality || 0.82;

        var img = new Image();
        img.onload = function() {
            var w = img.naturalWidth;
            var h = img.naturalHeight;

            // Only resize if the image exceeds limits
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
                var compressed = canvas.toDataURL('image/jpeg', quality);

                // Only use compressed if it's actually smaller
                if (compressed.length < dataUrl.length) {
                    callback(compressed, w, h);
                } else {
                    callback(dataUrl, img.naturalWidth, img.naturalHeight);
                }
            } catch (e) {
                console.warn('Image compression failed, using original:', e);
                callback(dataUrl, img.naturalWidth, img.naturalHeight);
            }
        };
        img.onerror = function() {
            // Can't compress, return original
            callback(dataUrl, 0, 0);
        };
        img.src = dataUrl;
    }

    /**
     * Estimate the byte size of a string (for localStorage budgeting)
     */
    function estimateStringSize(str) {
        if (typeof str !== 'string') return 0;
        // Each char is roughly 2 bytes in JS, but localStorage uses UTF-16
        return str.length * 2;
    }

    /**
     * Validate image dimensions after loading
     */
    function validateImageDimensions(img, options) {
        var opts = options || {};
        var maxWidth = opts.maxWidth || 8000;
        var maxHeight = opts.maxHeight || 8000;

        if (img.naturalWidth > maxWidth || img.naturalHeight > maxHeight) {
            return { valid: false, error: 'Image dimensions too large (max ' + maxWidth + 'x' + maxHeight + ')' };
        }

        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            return { valid: false, error: 'Invalid image dimensions' };
        }

        return { valid: true, error: null };
    }

    /**
     * Validate bookData structure on load from localStorage
     */
    function validateBookData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!Array.isArray(data.pages)) return false;
        if (typeof data.numPages !== 'number') return false;

        // Validate each page has required structure
        for (var i = 0; i < data.pages.length; i++) {
            var page = data.pages[i];
            if (!page || typeof page !== 'object') return false;
            if (!Array.isArray(page.images)) page.images = [];
            if (!Array.isArray(page.textBlocks)) page.textBlocks = [];

            // Sanitize text block content
            page.textBlocks.forEach(function(block) {
                if (block && block.content) {
                    block.content = sanitizeHTML(block.content);
                }
            });
        }

        // Validate photo library
        if (data.photoLibrary && !Array.isArray(data.photoLibrary)) {
            data.photoLibrary = [];
        }

        return true;
    }

    /**
     * Safe localStorage wrapper with quota handling
     */
    function safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.error('localStorage quota exceeded');
                if (typeof PageManager !== 'undefined' && PageManager.showToast) {
                    PageManager.showToast('Storage full. Try removing some photos.', 'error');
                }
            }
            return false;
        }
    }

    /**
     * Safe JSON parse with validation
     */
    function safeJSONParse(str, fallback) {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error('JSON parse error:', e);
            return fallback || null;
        }
    }

    /**
     * Validate a data URL is actually an image
     */
    function isValidDataURL(str) {
        if (typeof str !== 'string') return false;
        if (!str.startsWith('data:image/')) return false;
        if (str.indexOf('base64,') === -1) return false;
        // Block javascript: or other protocol injection in data URLs
        if (str.toLowerCase().indexOf('javascript') !== -1) return false;
        return true;
    }

    return {
        escapeHTML: escapeHTML,
        sanitizeHTML: sanitizeHTML,
        sanitizeFilename: sanitizeFilename,
        validateImageFile: validateImageFile,
        validateImageDimensions: validateImageDimensions,
        validateBookData: validateBookData,
        safeSetItem: safeSetItem,
        safeJSONParse: safeJSONParse,
        isValidDataURL: isValidDataURL,
        compressImage: compressImage,
        estimateStringSize: estimateStringSize
    };
})();

window.Security = Security;
