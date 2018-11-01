// If IndexedDB isn't available, we'll fall back to localStorage.
// Note that this will have considerable performance and storage
// side-effects (all data will be serialized on save and only data that
// can be converted to a string via `JSON.stringify()` will be saved).

import isLocalStorageValid from '../utils/isLocalStorageValid';
import serializer from '../utils/serializer';
import Promise from '../utils/promise';
import executeCallback from '../utils/executeCallback';
import normalizeKey from '../utils/normalizeKey';
import getCallback from '../utils/getCallback';

function _getKeyPrefix(options, defaultConfig) {
    let keyPrefix = `${options.name}/`;

    if (options.storeName !== defaultConfig.storeName) {
        keyPrefix += `${options.storeName}/`;
    }
    return keyPrefix;
}

// Check if localStorage throws when saving an item
function checkIfLocalStorageThrows() {
    const localStorageTestKey = '_localforage_support_test';

    try {
        localStorage.setItem(localStorageTestKey, true);
        localStorage.removeItem(localStorageTestKey);

        return false;
    } catch (e) {
        return true;
    }
}

// Check if localStorage is usable and allows to save an item
// This method checks if localStorage is usable in Safari Private Browsing
// mode, or in any other case where the available quota for localStorage
// is 0 and there wasn't any saved items yet.
function _isLocalStorageUsable() {
    return !checkIfLocalStorageThrows() || localStorage.length > 0;
}

// Config the localStorage backend, using options set in the config.
function _initStorage(options) {
    const self = this;
    const dbInfo = {};
    if (options) {
        for (const i in options) {
            dbInfo[i] = options[i];
        }
    }

    dbInfo.keyPrefix = _getKeyPrefix(options, self._defaultConfig);

    if (!_isLocalStorageUsable()) {
        return Promise.reject();
    }

    self._dbInfo = dbInfo;
    dbInfo.serializer = serializer;

    return Promise.resolve();
}

// Remove all keys from the datastore, effectively destroying all data in
// the app's key/value store!
function clear(callback) {
    const self = this;
    const promise = self.ready().then(() => {
        const keyPrefix = self._dbInfo.keyPrefix;

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);

            if (key.indexOf(keyPrefix) === 0) {
                localStorage.removeItem(key);
            }
        }
    });

    executeCallback(promise, callback);
    return promise;
}

// Retrieve an item from the store. Unlike the original async_storage
// library in Gaia, we don't modify return values at all. If a key's value
// is `undefined`, we pass that value to the callback function.
function getItem(key, callback) {
    const self = this;

    key = normalizeKey(key);

    const promise = self.ready().then(() => {
        const dbInfo = self._dbInfo;
        let result = localStorage.getItem(dbInfo.keyPrefix + key);

        // If a result was found, parse it from the serialized
        // string into a JS object. If result isn't truthy, the key
        // is likely undefined and we'll pass it straight to the
        // callback.
        if (result) {
            result = dbInfo.serializer.deserialize(result);
        }

        return result;
    });

    executeCallback(promise, callback);
    return promise;
}

// Iterate over all items in the store.
function iterate(iterator, callback) {
    const self = this;

    const promise = self.ready().then(() => {
        const dbInfo = self._dbInfo;
        const keyPrefix = dbInfo.keyPrefix;
        const keyPrefixLength = keyPrefix.length;
        const length = localStorage.length;

        // We use a dedicated iterator instead of the `i` variable below
        // so other keys we fetch in localStorage aren't counted in
        // the `iterationNumber` argument passed to the `iterate()`
        // callback.
        //
        // See: github.com/mozilla/localForage/pull/435#discussion_r38061530
        let iterationNumber = 1;

        for (let i = 0; i < length; i++) {
            const key = localStorage.key(i);
            if (key.indexOf(keyPrefix) !== 0) {
                continue;
            }
            let value = localStorage.getItem(key);

            // If a result was found, parse it from the serialized
            // string into a JS object. If result isn't truthy, the
            // key is likely undefined and we'll pass it straight
            // to the iterator.
            if (value) {
                value = dbInfo.serializer.deserialize(value);
            }

            value = iterator(
                value,
                key.substring(keyPrefixLength),
                iterationNumber++
            );

            if (value !== void 0) {
                return value;
            }
        }
    });

    executeCallback(promise, callback);
    return promise;
}

// Same as localStorage's key() method, except takes a callback.
function key(n, callback) {
    const self = this;
    const promise = self.ready().then(() => {
        const dbInfo = self._dbInfo;
        let result;
        try {
            result = localStorage.key(n);
        } catch (error) {
            result = null;
        }

        // Remove the prefix from the key, if a key is found.
        if (result) {
            result = result.substring(dbInfo.keyPrefix.length);
        }

        return result;
    });

    executeCallback(promise, callback);
    return promise;
}

function keys(callback) {
    const self = this;
    const promise = self.ready().then(() => {
        const dbInfo = self._dbInfo;
        const length = localStorage.length;
        const keys = [];

        for (let i = 0; i < length; i++) {
            const itemKey = localStorage.key(i);
            if (itemKey.indexOf(dbInfo.keyPrefix) === 0) {
                keys.push(itemKey.substring(dbInfo.keyPrefix.length));
            }
        }

        return keys;
    });

    executeCallback(promise, callback);
    return promise;
}

// Supply the number of keys in the datastore to the callback function.
function length(callback) {
    const self = this;
    const promise = self.keys().then(keys => keys.length);

    executeCallback(promise, callback);
    return promise;
}

// Remove an item from the store, nice and simple.
function removeItem(key, callback) {
    const self = this;

    key = normalizeKey(key);

    const promise = self.ready().then(() => {
        const dbInfo = self._dbInfo;
        localStorage.removeItem(dbInfo.keyPrefix + key);
    });

    executeCallback(promise, callback);
    return promise;
}

// Set a key's value and run an optional callback once the value is set.
// Unlike Gaia's implementation, the callback function is passed the value,
// in case you want to operate on that value only after you're sure it
// saved, or something like that.
function setItem(key, value, callback) {
    const self = this;

    key = normalizeKey(key);

    const promise = self.ready().then(() => {
        // Convert undefined values to null.
        // https://github.com/mozilla/localForage/pull/42
        if (value === undefined) {
            value = null;
        }

        // Save the original value to pass to the callback.
        const originalValue = value;

        return new Promise((resolve, reject) => {
            const dbInfo = self._dbInfo;
            dbInfo.serializer.serialize(value, (value, error) => {
                if (error) {
                    reject(error);
                } else {
                    try {
                        localStorage.setItem(dbInfo.keyPrefix + key, value);
                        resolve(originalValue);
                    } catch (e) {
                        // localStorage capacity exceeded.
                        // TODO: Make this a specific error/event.
                        if (
                            e.name === 'QuotaExceededError' ||
                            e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
                        ) {
                            reject(e);
                        }
                        reject(e);
                    }
                }
            });
        });
    });

    executeCallback(promise, callback);
    return promise;
}

function dropInstance(options, callback) {
    callback = getCallback.apply(this, arguments);

    options = (typeof options !== 'function' && options) || {};
    if (!options.name) {
        const currentConfig = this.config();
        options.name = options.name || currentConfig.name;
        options.storeName = options.storeName || currentConfig.storeName;
    }

    const self = this;
    let promise;
    if (!options.name) {
        promise = Promise.reject('Invalid arguments');
    } else {
        promise = new Promise(resolve => {
            if (!options.storeName) {
                resolve(`${options.name}/`);
            } else {
                resolve(_getKeyPrefix(options, self._defaultConfig));
            }
        }).then(keyPrefix => {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);

                if (key.indexOf(keyPrefix) === 0) {
                    localStorage.removeItem(key);
                }
            }
        });
    }

    executeCallback(promise, callback);
    return promise;
}

const localStorageWrapper = {
    _driver: 'localStorageWrapper',
    _initStorage,
    _support: isLocalStorageValid(),
    iterate,
    getItem,
    setItem,
    removeItem,
    clear,
    length,
    key,
    keys,
    dropInstance
};

export default localStorageWrapper;
