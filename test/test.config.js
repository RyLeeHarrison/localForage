/* global before:true, beforeEach:true, describe:true, expect:true, it:true */
describe('Config API', () => {
    const DRIVERS = [
        localforage.INDEXEDDB,
        localforage.LOCALSTORAGE,
        localforage.WEBSQL
    ];
    let supportedDrivers = [];

    before(function() {
        this.defaultConfig = localforage.config();

        supportedDrivers = [];
        for (let i = 0; i <= DRIVERS.length; i++) {
            if (localforage.supports(DRIVERS[i])) {
                supportedDrivers.push(DRIVERS[i]);
            }
        }
    });

    // Reset localForage before each test so we can call `config()` without
    // errors.
    beforeEach(function() {
        localforage._ready = null;
        localforage.config(this.defaultConfig);
    });

    it('returns the default values', done => {
        expect(localforage.config('description')).to.be('');
        expect(localforage.config('name')).to.be('localforage');
        expect(localforage.config('size')).to.be(4980736);
        expect(localforage.config('storeName')).to.be('keyvaluepairs');
        expect(localforage.config('version')).to.be(1.0);
        localforage.ready(() => {
            expect(localforage.config('driver')).to.be(localforage.driver());
            done();
        });
    });

    it('returns error if API call was already made', done => {
        localforage.length(() => {
            const configResult = localforage.config({
                description: '123',
                driver: 'I a not set driver',
                name: 'My Cool App',
                storeName: 'myStoreName',
                version: 2.0
            });

            const error =
                "Error: Can't call config() after localforage " +
                'has been used.';

            expect(configResult).to.not.be(true);
            expect(configResult.toString()).to.be(error);

            // Expect the config values to be as they were before.
            expect(localforage.config('description')).to.not.be('123');
            expect(localforage.config('description')).to.be('');
            expect(localforage.config('driver')).to.be(localforage.driver());
            expect(localforage.config('driver')).to.not.be(
                'I a not set driver'
            );
            expect(localforage.config('name')).to.be('localforage');
            expect(localforage.config('name')).to.not.be('My Cool App');
            expect(localforage.config('size')).to.be(4980736);
            expect(localforage.config('storeName')).to.be('keyvaluepairs');
            expect(localforage.config('version')).to.be(1.0);

            done();
        });
    });

    it('sets new values and returns them properly', done => {
        const secondSupportedDriver =
            supportedDrivers.length >= 2 ? supportedDrivers[1] : null;

        localforage.config({
            description: 'The offline datastore for my cool app',
            driver: secondSupportedDriver,
            name: 'My Cool App',
            storeName: 'myStoreName',
            version: 2.0
        });

        expect(localforage.config('description')).to.not.be('');
        expect(localforage.config('description')).to.be(
            'The offline datastore for my cool app'
        );
        expect(localforage.config('driver')).to.be(secondSupportedDriver);
        expect(localforage.config('name')).to.be('My Cool App');
        expect(localforage.config('size')).to.be(4980736);
        expect(localforage.config('storeName')).to.be('myStoreName');
        expect(localforage.config('version')).to.be(2.0);

        localforage.ready(() => {
            if (supportedDrivers.length >= 2) {
                expect(localforage.config('driver')).to.be(
                    secondSupportedDriver
                );
            } else {
                expect(localforage.config('driver')).to.be(supportedDrivers[0]);
            }
            done();
        });
    });

    if (supportedDrivers.length >= 2) {
        it('sets new driver using preference order', done => {
            const otherSupportedDrivers = supportedDrivers.slice(1);

            const configResult = localforage.config({
                driver: otherSupportedDrivers
            });

            expect(configResult).to.be.a(Promise);
            localforage
                .ready(() => {
                    expect(localforage.config('driver')).to.be(
                        otherSupportedDrivers[0]
                    );
                    return configResult;
                })
                .then(() => {
                    done();
                });
        });
    }

    it('it does not set an unsupported driver', done => {
        const oldDriver = localforage.driver();
        const configResult = localforage.config({
            driver: 'I am a not supported driver'
        });

        expect(configResult).to.be.a(Promise);
        localforage
            .ready(() => {
                expect(localforage.config('driver')).to.be(oldDriver);
                return configResult;
            })
            .catch(error => {
                expect(error).to.be.an(Error);
                expect(error.message).to.be(
                    'No available storage method found.'
                );
                done();
            });
    });

    it('it does not set an unsupported driver using preference order', done => {
        const oldDriver = localforage.driver();
        localforage.config({
            driver: [
                'I am a not supported driver',
                'I am a an other not supported driver'
            ]
        });

        localforage.ready(() => {
            expect(localforage.config('driver')).to.be(oldDriver);
            done();
        });
    });

    it('converts bad config values across drivers', () => {
        localforage.config({
            name: 'My Cool App',
            // https://github.com/mozilla/localForage/issues/247
            storeName: 'my store&name-v1',
            version: 2.0
        });

        expect(localforage.config('name')).to.be('My Cool App');
        expect(localforage.config('storeName')).to.be('my_store_name_v1');
        expect(localforage.config('version')).to.be(2.0);
    });

    it(`uses the config values in ${localforage.driver()}`, done => {
        localforage.config({
            description: 'The offline datastore for my cool app',
            driver: localforage.driver(),
            name: 'My Cool App',
            storeName: 'myStoreName',
            version: 2.0
        });

        localforage.setItem('some key', 'some value').then(value => {
            if (localforage.driver() === localforage.INDEXEDDB) {
                var indexedDB =
                    indexedDB ||
                    window.indexedDB ||
                    window.webkitIndexedDB ||
                    window.mozIndexedDB ||
                    window.OIndexedDB ||
                    window.msIndexedDB;
                const req = indexedDB.open('My Cool App', 2.0);

                req.onsuccess = () => {
                    const dbValue = req.result
                        .transaction('myStoreName', 'readonly')
                        .objectStore('myStoreName')
                        .get('some key');
                    expect(dbValue).to.be(value);
                    done();
                };
            } else if (localforage.driver() === localforage.WEBSQL) {
                window
                    .openDatabase('My Cool App', String(2.0), '', 4980736)
                    .transaction(t => {
                        t.executeSql(
                            'SELECT * FROM myStoreName WHERE key = ? ' +
                                'LIMIT 1',
                            ['some key'],
                            (t, { rows }) => {
                                const dbValue = JSON.parse(rows.item(0).value);

                                expect(dbValue).to.be(value);
                                done();
                            }
                        );
                    });
            } else if (localforage.driver() === localforage.LOCALSTORAGE) {
                const dbValue = JSON.parse(
                    localStorage['My Cool App/myStoreName/some key']
                );

                expect(dbValue).to.be(value);
                done();
            }
        });
    });

    it("returns all values when config isn't passed arguments", () => {
        expect(localforage.config()).to.be.an('object');
        expect(Object.keys(localforage.config()).length).to.be(6);
    });

    // This may go away when https://github.com/mozilla/localForage/issues/168
    // is fixed.
    it('maintains config values across setDriver calls', done => {
        localforage.config({
            name: 'Mega Mozilla Dino'
        });

        localforage
            .length()
            .then(() => localforage.setDriver(localforage.LOCALSTORAGE))
            .then(() => {
                expect(localforage.config('name')).to.be('Mega Mozilla Dino');
                done();
            });
    });

    it('returns error if database version is not a number', done => {
        const configResult = localforage.config({
            version: '2.0'
        });

        const error = 'Error: Database version must be a number.';

        expect(configResult).to.not.be(true);
        expect(configResult.toString()).to.be(error);
        done();
    });
});
