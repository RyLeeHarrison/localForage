/* global beforeEach:true, describe:true, expect:true, it:true */
describe('Driver API', () => {
    beforeEach(done => {
        if (localforage.supports(localforage.INDEXEDDB)) {
            localforage.setDriver(localforage.INDEXEDDB, () => {
                done();
            });
        } else if (localforage.supports(localforage.WEBSQL)) {
            localforage.setDriver(localforage.WEBSQL, () => {
                done();
            });
        } else {
            done();
        }
    });

    if (
        (localforage.supports(localforage.INDEXEDDB) &&
            localforage.driver() === localforage.INDEXEDDB) ||
        (localforage.supports(localforage.WEBSQL) &&
            localforage.driver() === localforage.WEBSQL)
    ) {
        it(`can change to localStorage from ${localforage.driver()} [callback]`, done => {
            const previousDriver = localforage.driver();

            localforage.setDriver(localforage.LOCALSTORAGE, () => {
                expect(localforage.driver()).to.be(localforage.LOCALSTORAGE);
                expect(localforage.driver()).to.not.be(previousDriver);
                done();
            });
        });
        it(`can change to localStorage from ${localforage.driver()} [promise]`, done => {
            const previousDriver = localforage.driver();

            localforage.setDriver(localforage.LOCALSTORAGE).then(() => {
                expect(localforage.driver()).to.be(localforage.LOCALSTORAGE);
                expect(localforage.driver()).to.not.be(previousDriver);
                done();
            });
        });
    }

    if (!localforage.supports(localforage.INDEXEDDB)) {
        it("can't use unsupported IndexedDB [callback]", done => {
            const previousDriver = localforage.driver();
            expect(previousDriver).to.not.be(localforage.INDEXEDDB);

            // These should be rejected in component builds but aren't.
            // TODO: Look into why.
            localforage.setDriver(localforage.INDEXEDDB, null, () => {
                expect(localforage.driver()).to.be(previousDriver);
                done();
            });
        });
        it("can't use unsupported IndexedDB [promise]", done => {
            const previousDriver = localforage.driver();
            expect(previousDriver).to.not.be(localforage.INDEXEDDB);

            // These should be rejected in component builds but aren't.
            // TODO: Look into why.
            localforage.setDriver(localforage.INDEXEDDB).then(null, () => {
                expect(localforage.driver()).to.be(previousDriver);
                done();
            });
        });
    } else {
        it('can set already active IndexedDB [callback]', done => {
            const previousDriver = localforage.driver();
            expect(previousDriver).to.be(localforage.INDEXEDDB);

            localforage.setDriver(localforage.INDEXEDDB, () => {
                expect(localforage.driver()).to.be(previousDriver);
                done();
            });
        });
        it('can set already active IndexedDB [promise]', done => {
            const previousDriver = localforage.driver();
            expect(previousDriver).to.be(localforage.INDEXEDDB);

            localforage.setDriver(localforage.INDEXEDDB).then(() => {
                expect(localforage.driver()).to.be(previousDriver);
                done();
            });
        });
    }

    if (!localforage.supports(localforage.LOCALSTORAGE)) {
        it("can't use unsupported localStorage [callback]", done => {
            const previousDriver = localforage.driver();
            expect(previousDriver).to.not.be(localforage.LOCALSTORAGE);

            localforage.setDriver(localforage.LOCALSTORAGE, null, () => {
                expect(localforage.driver()).to.be(previousDriver);
                done();
            });
        });
        it("can't use unsupported localStorage [promise]", done => {
            const previousDriver = localforage.driver();
            expect(previousDriver).to.not.be(localforage.LOCALSTORAGE);

            localforage.setDriver(localforage.LOCALSTORAGE).then(null, () => {
                expect(localforage.driver()).to.be(previousDriver);
                done();
            });
        });
    } else if (
        !localforage.supports(localforage.INDEXEDDB) &&
        !localforage.supports(localforage.WEBSQL)
    ) {
        it('can set already active localStorage [callback]', done => {
            const previousDriver = localforage.driver();
            expect(previousDriver).to.be(localforage.LOCALSTORAGE);

            localforage.setDriver(localforage.LOCALSTORAGE, () => {
                expect(localforage.driver()).to.be(previousDriver);
                done();
            });
        });
        it('can set already active localStorage [promise]', done => {
            const previousDriver = localforage.driver();
            expect(previousDriver).to.be(localforage.LOCALSTORAGE);

            localforage.setDriver(localforage.LOCALSTORAGE).then(() => {
                expect(localforage.driver()).to.be(previousDriver);
                done();
            });
        });
    }

    if (!localforage.supports(localforage.WEBSQL)) {
        it("can't use unsupported WebSQL [callback]", done => {
            const previousDriver = localforage.driver();
            expect(previousDriver).to.not.be(localforage.WEBSQL);

            localforage.setDriver(localforage.WEBSQL, null, () => {
                expect(localforage.driver()).to.be(previousDriver);
                done();
            });
        });
        it("can't use unsupported WebSQL [promise]", done => {
            const previousDriver = localforage.driver();
            expect(previousDriver).to.not.be(localforage.WEBSQL);

            localforage.setDriver(localforage.WEBSQL).then(null, () => {
                expect(localforage.driver()).to.be(previousDriver);
                done();
            });
        });
    } else {
        it('can set already active WebSQL [callback]', done => {
            localforage.setDriver(localforage.WEBSQL, () => {
                const previousDriver = localforage.driver();
                expect(previousDriver).to.be(localforage.WEBSQL);

                localforage.setDriver(localforage.WEBSQL, () => {
                    expect(localforage.driver()).to.be(previousDriver);
                    done();
                });
            });
        });
        it('can set already active WebSQL [promise]', done => {
            localforage.setDriver(localforage.WEBSQL).then(() => {
                const previousDriver = localforage.driver();
                expect(previousDriver).to.be(localforage.WEBSQL);

                localforage.setDriver(localforage.WEBSQL).then(() => {
                    expect(localforage.driver()).to.be(previousDriver);
                    done();
                });
            });
        });
    }
});
