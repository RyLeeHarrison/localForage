import isWebSQLValid from '../utils/isWebSQLValid';
import serializer from '../utils/serializer';
import Promise from '../utils/promise';
import executeCallback from '../utils/executeCallback';
import normalizeKey from '../utils/normalizeKey';
import getCallback from '../utils/getCallback';

/*
 * Includes code from:
 *
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */

function createDbTable(t, { storeName }, callback, errorCallback) {
    t.executeSql(
        `${`CREATE TABLE IF NOT EXISTS ${storeName} `}(id INTEGER PRIMARY KEY, key unique, value)`,
        [],
        callback,
        errorCallback
    );
}

// Open the WebSQL database (automatically creates one if one didn't
// previously exist), using any options set in the config.
function _initStorage(options) {
    const self = this;
    const dbInfo = {
        db: null
    };

    if (options) {
        for (const i in options) {
            dbInfo[i] =
                typeof options[i] !== 'string'
                    ? options[i].toString()
                    : options[i];
        }
    }

    const dbInfoPromise = new Promise((resolve, reject) => {
        // Open the database; the openDatabase API will automatically
        // create it for us if it doesn't exist.
        try {
            dbInfo.db = openDatabase(
                dbInfo.name,
                String(dbInfo.version),
                dbInfo.description,
                dbInfo.size
            );
        } catch (e) {
            return reject(e);
        }

        // Create our key/value table if it doesn't exist.
        dbInfo.db.transaction(t => {
            createDbTable(
                t,
                dbInfo,
                () => {
                    self._dbInfo = dbInfo;
                    resolve();
                },
                (t, error) => {
                    reject(error);
                }
            );
        }, reject);
    });

    dbInfo.serializer = serializer;
    return dbInfoPromise;
}

function tryExecuteSql(t, dbInfo, sqlStatement, args, callback, errorCallback) {
    t.executeSql(
        sqlStatement,
        args,
        callback,
        (t, error) => {
            if (error.code === error.SYNTAX_ERR) {
                t.executeSql(
                    'SELECT name FROM sqlite_master ' +
                        "WHERE type='table' AND name = ?",
                    [dbInfo.storeName],
                    (t, { rows }) => {
                        if (!rows.length) {
                            // if the table is missing (was deleted)
                            // re-create it table and retry
                            createDbTable(
                                t,
                                dbInfo,
                                () => {
                                    t.executeSql(
                                        sqlStatement,
                                        args,
                                        callback,
                                        errorCallback
                                    );
                                },
                                errorCallback
                            );
                        } else {
                            errorCallback(t, error);
                        }
                    },
                    errorCallback
                );
            } else {
                errorCallback(t, error);
            }
        },
        errorCallback
    );
}

function getItem(key, callback) {
    const self = this;

    key = normalizeKey(key);

    const promise = new Promise((resolve, reject) => {
        self
            .ready()
            .then(() => {
                const dbInfo = self._dbInfo;
                dbInfo.db.transaction(t => {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `SELECT * FROM ${
                            dbInfo.storeName
                        } WHERE key = ? LIMIT 1`,
                        [key],
                        (t, { rows }) => {
                            let result = rows.length
                                ? rows.item(0).value
                                : null;

                            // Check to see if this is serialized content we need to
                            // unpack.
                            if (result) {
                                result = dbInfo.serializer.deserialize(result);
                            }

                            resolve(result);
                        },
                        (t, error) => {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function iterate(iterator, callback) {
    const self = this;

    const promise = new Promise((resolve, reject) => {
        self
            .ready()
            .then(() => {
                const dbInfo = self._dbInfo;

                dbInfo.db.transaction(t => {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `SELECT * FROM ${dbInfo.storeName}`,
                        [],
                        (t, results) => {
                            const rows = results.rows;
                            const length = rows.length;

                            for (let i = 0; i < length; i++) {
                                const item = rows.item(i);
                                let result = item.value;

                                // Check to see if this is serialized content
                                // we need to unpack.
                                if (result) {
                                    result = dbInfo.serializer.deserialize(
                                        result
                                    );
                                }

                                result = iterator(result, item.key, i + 1);

                                // void(0) prevents problems with redefinition
                                // of `undefined`.
                                if (result !== void 0) {
                                    resolve(result);
                                    return;
                                }
                            }

                            resolve();
                        },
                        (t, error) => {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function _setItem(key, value, callback, retriesLeft) {
    const self = this;

    key = normalizeKey(key);

    const promise = new Promise((resolve, reject) => {
        self
            .ready()
            .then(() => {
                // The localStorage API doesn't return undefined values in an
                // "expected" way, so undefined is always cast to null in all
                // drivers. See: https://github.com/mozilla/localForage/pull/42
                if (value === undefined) {
                    value = null;
                }

                // Save the original value to pass to the callback.
                const originalValue = value;

                const dbInfo = self._dbInfo;
                dbInfo.serializer.serialize(value, (value, error) => {
                    if (error) {
                        reject(error);
                    } else {
                        dbInfo.db.transaction(
                            t => {
                                tryExecuteSql(
                                    t,
                                    dbInfo,
                                    `${`INSERT OR REPLACE INTO ${
                                        dbInfo.storeName
                                    } `}(key, value) VALUES (?, ?)`,
                                    [key, value],
                                    () => {
                                        resolve(originalValue);
                                    },
                                    (t, error) => {
                                        reject(error);
                                    }
                                );
                            },
                            sqlError => {
                                // The transaction failed; check
                                // to see if it's a quota error.
                                if (sqlError.code === sqlError.QUOTA_ERR) {
                                    // We reject the callback outright for now, but
                                    // it's worth trying to re-run the transaction.
                                    // Even if the user accepts the prompt to use
                                    // more storage on Safari, this error will
                                    // be called.
                                    //
                                    // Try to re-run the transaction.
                                    if (retriesLeft > 0) {
                                        resolve(
                                            _setItem.apply(self, [
                                                key,
                                                originalValue,
                                                callback,
                                                retriesLeft - 1
                                            ])
                                        );
                                        return;
                                    }
                                    reject(sqlError);
                                }
                            }
                        );
                    }
                });
            })
            .catch(reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function setItem(key, value, callback) {
    return _setItem.apply(this, [key, value, callback, 1]);
}

function removeItem(key, callback) {
    const self = this;

    key = normalizeKey(key);

    const promise = new Promise((resolve, reject) => {
        self
            .ready()
            .then(() => {
                const dbInfo = self._dbInfo;
                dbInfo.db.transaction(t => {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `DELETE FROM ${dbInfo.storeName} WHERE key = ?`,
                        [key],
                        () => {
                            resolve();
                        },
                        (t, error) => {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// Deletes every item in the table.
// TODO: Find out if this resets the AUTO_INCREMENT number.
function clear(callback) {
    const self = this;

    const promise = new Promise((resolve, reject) => {
        self
            .ready()
            .then(() => {
                const dbInfo = self._dbInfo;
                dbInfo.db.transaction(t => {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `DELETE FROM ${dbInfo.storeName}`,
                        [],
                        () => {
                            resolve();
                        },
                        (t, error) => {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// Does a simple `COUNT(key)` to get the number of items stored in
// localForage.
function length(callback) {
    const self = this;

    const promise = new Promise((resolve, reject) => {
        self
            .ready()
            .then(() => {
                const dbInfo = self._dbInfo;
                dbInfo.db.transaction(t => {
                    // Ahhh, SQL makes this one soooooo easy.
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `SELECT COUNT(key) as c FROM ${dbInfo.storeName}`,
                        [],
                        (t, { rows }) => {
                            const result = rows.item(0).c;
                            resolve(result);
                        },
                        (t, error) => {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// Return the key located at key index X; essentially gets the key from a
// `WHERE id = ?`. This is the most efficient way I can think to implement
// this rarely-used (in my experience) part of the API, but it can seem
// inconsistent, because we do `INSERT OR REPLACE INTO` on `setItem()`, so
// the ID of each key will change every time it's updated. Perhaps a stored
// procedure for the `setItem()` SQL would solve this problem?
// TODO: Don't change ID on `setItem()`.
function key(n, callback) {
    const self = this;

    const promise = new Promise((resolve, reject) => {
        self
            .ready()
            .then(() => {
                const dbInfo = self._dbInfo;
                dbInfo.db.transaction(t => {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `SELECT key FROM ${
                            dbInfo.storeName
                        } WHERE id = ? LIMIT 1`,
                        [n + 1],
                        (t, { rows }) => {
                            const result = rows.length
                                ? rows.item(0).key
                                : null;
                            resolve(result);
                        },
                        (t, error) => {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function keys(callback) {
    const self = this;

    const promise = new Promise((resolve, reject) => {
        self
            .ready()
            .then(() => {
                const dbInfo = self._dbInfo;
                dbInfo.db.transaction(t => {
                    tryExecuteSql(
                        t,
                        dbInfo,
                        `SELECT key FROM ${dbInfo.storeName}`,
                        [],
                        (t, { rows }) => {
                            const keys = [];

                            for (let i = 0; i < rows.length; i++) {
                                keys.push(rows.item(i).key);
                            }

                            resolve(keys);
                        },
                        (t, error) => {
                            reject(error);
                        }
                    );
                });
            })
            .catch(reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// https://www.w3.org/TR/webdatabase/#databases
// > There is no way to enumerate or delete the databases available for an origin from this API.
function getAllStoreNames(db) {
    return new Promise((resolve, reject) => {
        db.transaction(
            t => {
                t.executeSql(
                    'SELECT name FROM sqlite_master ' +
                        "WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'",
                    [],
                    (t, { rows }) => {
                        const storeNames = [];

                        for (let i = 0; i < rows.length; i++) {
                            storeNames.push(rows.item(i).name);
                        }

                        resolve({
                            db,
                            storeNames
                        });
                    },
                    (t, error) => {
                        reject(error);
                    }
                );
            },
            sqlError => {
                reject(sqlError);
            }
        );
    });
}

function dropInstance(options, callback) {
    callback = getCallback.apply(this, arguments);

    const currentConfig = this.config();
    options = (typeof options !== 'function' && options) || {};
    if (!options.name) {
        options.name = options.name || currentConfig.name;
        options.storeName = options.storeName || currentConfig.storeName;
    }

    const self = this;
    let promise;
    if (!options.name) {
        promise = Promise.reject('Invalid arguments');
    } else {
        promise = new Promise(resolve => {
            let db;
            if (options.name === currentConfig.name) {
                // use the db reference of the current instance
                db = self._dbInfo.db;
            } else {
                db = openDatabase(options.name, '', '', 0);
            }

            if (!options.storeName) {
                // drop all database tables
                resolve(getAllStoreNames(db));
            } else {
                resolve({
                    db,
                    storeNames: [options.storeName]
                });
            }
        }).then(
            ({ db, storeNames }) =>
                new Promise((resolve, reject) => {
                    db.transaction(
                        t => {
                            function dropTable(storeName) {
                                return new Promise((resolve, reject) => {
                                    t.executeSql(
                                        `DROP TABLE IF EXISTS ${storeName}`,
                                        [],
                                        () => {
                                            resolve();
                                        },
                                        (t, error) => {
                                            reject(error);
                                        }
                                    );
                                });
                            }

                            const operations = [];
                            for (
                                let i = 0, len = storeNames.length;
                                i < len;
                                i++
                            ) {
                                operations.push(dropTable(storeNames[i]));
                            }

                            Promise.all(operations)
                                .then(() => {
                                    resolve();
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        },
                        sqlError => {
                            reject(sqlError);
                        }
                    );
                })
        );
    }

    executeCallback(promise, callback);
    return promise;
}

const webSQLStorage = {
    _driver: 'webSQLStorage',
    _initStorage,
    _support: isWebSQLValid(),
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

export default webSQLStorage;
