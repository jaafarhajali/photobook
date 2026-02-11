/**
 * IndexedDB Photo Storage Module
 * Stores photo image data (base64/blob) in IndexedDB to avoid localStorage size limits.
 * localStorage holds only metadata (id, name, dimensions); actual image data lives here.
 */

const PhotoDB = (function() {
    const DB_NAME = 'photobookDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'photos';
    let db = null;

    /**
     * Open (or create) the database. Returns a promise.
     * Called once on app startup; all other methods wait for this.
     */
    function open() {
        return new Promise(function(resolve, reject) {
            if (db) { resolve(db); return; }

            var request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function(e) {
                var database = e.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = function(e) {
                db = e.target.result;
                resolve(db);
            };

            request.onerror = function(e) {
                console.error('PhotoDB: Failed to open IndexedDB', e.target.error);
                reject(e.target.error);
            };
        });
    }

    /**
     * Save a photo's image data.
     * @param {string} id - The photo ID (matches bookData.photoLibrary[].id)
     * @param {string} src - The base64 data URL of the image
     * @returns {Promise}
     */
    function savePhoto(id, src) {
        return open().then(function(database) {
            return new Promise(function(resolve, reject) {
                var tx = database.transaction(STORE_NAME, 'readwrite');
                var store = tx.objectStore(STORE_NAME);
                store.put({ id: id, src: src });

                tx.oncomplete = function() { resolve(); };
                tx.onerror = function(e) {
                    console.error('PhotoDB: Failed to save photo', id, e.target.error);
                    reject(e.target.error);
                };
            });
        });
    }

    /**
     * Save multiple photos at once (single transaction).
     * @param {Array} photos - Array of { id, src } objects
     * @returns {Promise}
     */
    function saveMany(photos) {
        if (!photos || photos.length === 0) return Promise.resolve();

        return open().then(function(database) {
            return new Promise(function(resolve, reject) {
                var tx = database.transaction(STORE_NAME, 'readwrite');
                var store = tx.objectStore(STORE_NAME);

                photos.forEach(function(photo) {
                    store.put({ id: photo.id, src: photo.src });
                });

                tx.oncomplete = function() { resolve(); };
                tx.onerror = function(e) {
                    console.error('PhotoDB: Failed to save photos batch', e.target.error);
                    reject(e.target.error);
                };
            });
        });
    }

    /**
     * Get a single photo's image data by ID.
     * @param {string} id - The photo ID
     * @returns {Promise<string|null>} The base64 src, or null if not found
     */
    function getPhoto(id) {
        return open().then(function(database) {
            return new Promise(function(resolve, reject) {
                var tx = database.transaction(STORE_NAME, 'readonly');
                var store = tx.objectStore(STORE_NAME);
                var request = store.get(id);

                request.onsuccess = function() {
                    resolve(request.result ? request.result.src : null);
                };
                request.onerror = function(e) {
                    console.error('PhotoDB: Failed to get photo', id, e.target.error);
                    reject(e.target.error);
                };
            });
        });
    }

    /**
     * Get all photo image data as a Map of id -> src.
     * @returns {Promise<Object>} Map of { photoId: base64Src }
     */
    function getAllPhotos() {
        return open().then(function(database) {
            return new Promise(function(resolve, reject) {
                var tx = database.transaction(STORE_NAME, 'readonly');
                var store = tx.objectStore(STORE_NAME);
                var request = store.getAll();

                request.onsuccess = function() {
                    var map = {};
                    (request.result || []).forEach(function(item) {
                        map[item.id] = item.src;
                    });
                    resolve(map);
                };
                request.onerror = function(e) {
                    console.error('PhotoDB: Failed to get all photos', e.target.error);
                    reject(e.target.error);
                };
            });
        });
    }

    /**
     * Delete a single photo's image data.
     * @param {string} id - The photo ID
     * @returns {Promise}
     */
    function deletePhoto(id) {
        return open().then(function(database) {
            return new Promise(function(resolve, reject) {
                var tx = database.transaction(STORE_NAME, 'readwrite');
                var store = tx.objectStore(STORE_NAME);
                store.delete(id);

                tx.oncomplete = function() { resolve(); };
                tx.onerror = function(e) {
                    console.error('PhotoDB: Failed to delete photo', id, e.target.error);
                    reject(e.target.error);
                };
            });
        });
    }

    /**
     * Clear all photo data from IndexedDB.
     * @returns {Promise}
     */
    function clearAll() {
        return open().then(function(database) {
            return new Promise(function(resolve, reject) {
                var tx = database.transaction(STORE_NAME, 'readwrite');
                var store = tx.objectStore(STORE_NAME);
                store.clear();

                tx.oncomplete = function() { resolve(); };
                tx.onerror = function(e) {
                    console.error('PhotoDB: Failed to clear store', e.target.error);
                    reject(e.target.error);
                };
            });
        });
    }

    return {
        open: open,
        savePhoto: savePhoto,
        saveMany: saveMany,
        getPhoto: getPhoto,
        getAllPhotos: getAllPhotos,
        deletePhoto: deletePhoto,
        clearAll: clearAll
    };
})();

window.PhotoDB = PhotoDB;
