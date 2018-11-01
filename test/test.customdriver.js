/* global describe:true, expect:true, it:true, dummyStorageDriver:true */
describe('When Custom Drivers are used', () => {
    const errorMessage =
        'Custom driver not compliant; see ' +
        'https://mozilla.github.io/localForage/#definedriver';

    it('fails to define a no-name custom driver', done => {
        localforage.defineDriver(
            {
                _initStorage() {},
                iterate() {},
                getItem() {},
                setItem() {},
                removeItem() {},
                clear() {},
                length() {},
                key() {},
                keys() {}
            },
            null,
            err => {
                expect(err).to.be.an(Error);
                expect(err.message).to.be(errorMessage);
                done();
            }
        );
    });

    it('fails to define a no-name custom driver [promise]', done => {
        localforage
            .defineDriver({
                _initStorage() {},
                iterate() {},
                getItem() {},
                setItem() {},
                removeItem() {},
                clear() {},
                length() {},
                key() {},
                keys() {}
            })
            .then(null, err => {
                expect(err).to.be.an(Error);
                expect(err.message).to.be(errorMessage);
                done();
            });
    });

    it('fails to define a custom driver with missing methods', done => {
        localforage.defineDriver(
            {
                _driver: 'missingMethodsDriver',
                _initStorage() {},
                iterate() {},
                getItem() {},
                setItem() {},
                removeItem() {},
                clear() {}
            },
            null,
            err => {
                expect(err).to.be.an(Error);
                expect(err.message).to.be(errorMessage);
                done();
            }
        );
    });

    it('fails to define a custom driver with missing methods [promise]', done => {
        localforage
            .defineDriver({
                _driver: 'missingMethodsDriver',
                _initStorage() {},
                iterate() {},
                getItem() {},
                setItem() {},
                removeItem() {},
                clear() {}
            })
            .then(null, err => {
                expect(err).to.be.an(Error);
                expect(err.message).to.be(errorMessage);
                done();
            });
    });

    it('defines a compliant custom driver', done => {
        localforage.defineDriver(dummyStorageDriver, () => {
            done();
        });
    });

    it('defines a compliant custom driver [promise]', done => {
        localforage.defineDriver(dummyStorageDriver).then(() => {
            done();
        });
    });

    it('sets a custom driver', done => {
        localforage.defineDriver(dummyStorageDriver, () => {
            localforage.setDriver(dummyStorageDriver._driver, () => {
                expect(localforage.driver()).to.be(dummyStorageDriver._driver);
                done();
            });
        });
    });

    it('sets a custom driver [promise]', done => {
        localforage
            .defineDriver(dummyStorageDriver)
            .then(() => localforage.setDriver(dummyStorageDriver._driver))
            .then(() => {
                expect(localforage.driver()).to.be(dummyStorageDriver._driver);
                done();
            });
    });

    it("defines a driver synchronously when it doesn't have _supports()", done => {
        const customDriver = {
            _driver: `dummyStorageDriver${+new Date()}`,
            _initStorage() {},
            // _support: function() { return true; }
            iterate() {},
            getItem() {},
            setItem() {},
            removeItem() {},
            clear() {},
            length() {},
            key() {},
            keys() {}
        };

        localforage.defineDriver(customDriver);
        localforage.setDriver(customDriver._driver).then(() => {
            expect(localforage.driver()).to.be(customDriver._driver);
            done();
        });
    });

    it('defines a driver synchronously when it has boolean _supports()', done => {
        const customDriver = {
            _driver: `dummyStorageDriver${+new Date()}`,
            _initStorage() {},
            _support: true,
            iterate() {},
            getItem() {},
            setItem() {},
            removeItem() {},
            clear() {},
            length() {},
            key() {},
            keys() {}
        };

        localforage.defineDriver(customDriver);
        localforage.setDriver(customDriver._driver).then(() => {
            expect(localforage.driver()).to.be(customDriver._driver);
            done();
        });
    });

    it('defines a driver asynchronously when _supports() returns a Promise<boolean>', done => {
        const customDriver = {
            _driver: `dummyStorageDriver${+new Date()}`,
            _initStorage() {},
            _support() {
                return Promise.resolve(true);
            },
            iterate() {},
            getItem() {},
            setItem() {},
            removeItem() {},
            clear() {},
            length() {},
            key() {},
            keys() {}
        };

        localforage
            .defineDriver(customDriver)
            .then(() => localforage.setDriver(customDriver._driver))
            .then(() => {
                expect(localforage.driver()).to.be(customDriver._driver);
                done();
            });
    });

    it('sets and uses a custom driver', done => {
        localforage.defineDriver(dummyStorageDriver, () => {
            localforage.setDriver(dummyStorageDriver._driver, err => {
                expect(err).to.be(undefined);
                localforage.setItem(
                    'testCallbackKey',
                    'testCallbackValue',
                    err => {
                        expect(err).to.be(null);
                        localforage.getItem('testCallbackKey', (err, value) => {
                            expect(err).to.be(null);
                            expect(value).to.be('testCallbackValue');
                            done();
                        });
                    }
                );
            });
        });
    });

    it('sets and uses a custom driver [promise]', done => {
        localforage
            .defineDriver(dummyStorageDriver)
            .then(() => localforage.setDriver(dummyStorageDriver._driver))
            .then(() =>
                localforage.setItem('testPromiseKey', 'testPromiseValue')
            )
            .then(() => localforage.getItem('testPromiseKey'))
            .then(value => {
                expect(value).to.be('testPromiseValue');
                done();
            });
    });

    describe('when dropInstance is not defined', () => {
        it('rejects when it is used', done => {
            const customDriver = {
                _driver: `dummyStorageDriver${+new Date()}`,
                _initStorage() {},
                _support() {
                    return Promise.resolve(true);
                },
                iterate() {},
                getItem() {},
                setItem() {},
                removeItem() {},
                clear() {},
                length() {},
                key() {},
                keys() {}
            };

            localforage
                .defineDriver(customDriver)
                .then(() => localforage.setDriver(customDriver._driver))
                .then(() => localforage.dropInstance())
                .catch(({ message }) => {
                    expect(message).to.be(
                        'Method dropInstance is not implemented by the current driver'
                    );
                    done();
                });
        });
    });

    describe('when dropInstance is defined', () => {
        it('is does not reject', done => {
            const customDriver = {
                _driver: `dummyStorageDriver${+new Date()}`,
                _initStorage() {},
                _support() {
                    return Promise.resolve(true);
                },
                iterate() {},
                getItem() {},
                setItem() {},
                removeItem() {},
                clear() {},
                length() {},
                key() {},
                keys() {},
                dropInstance() {}
            };

            localforage
                .defineDriver(customDriver)
                .then(() => localforage.setDriver(customDriver._driver))
                .then(() => localforage.dropInstance())
                .then(() => {
                    done();
                });
        });
    });
});
