/* global describe:true, expect:true, it:true, Modernizr:true */
describe('When No Drivers Are Available', () => {
    const DRIVERS = [
        localforage.INDEXEDDB,
        localforage.LOCALSTORAGE,
        localforage.WEBSQL
    ];

    it('agrees with Modernizr on storage drivers support', () => {
        expect(localforage.supports(localforage.INDEXEDDB)).to.be(false);
        expect(localforage.supports(localforage.INDEXEDDB)).to.be(
            Modernizr.indexeddb
        );

        expect(localforage.supports(localforage.LOCALSTORAGE)).to.be(false);
        expect(localforage.supports(localforage.LOCALSTORAGE)).to.be(
            Modernizr.localstorage
        );

        expect(localforage.supports(localforage.WEBSQL)).to.be(false);
        expect(localforage.supports(localforage.WEBSQL)).to.be(
            Modernizr.websqldatabase
        );
    });

    it('fails to load localForage [callback]', done => {
        localforage.ready(err => {
            expect(err).to.be.an(Error);
            expect(err.message).to.be('No available storage method found.');
            done();
        });
    });

    it('fails to load localForage [promise]', done => {
        localforage.ready().then(null, err => {
            expect(err).to.be.an(Error);
            expect(err.message).to.be('No available storage method found.');
            done();
        });
    });

    it('has no driver set', done => {
        localforage.ready(() => {
            expect(localforage.driver()).to.be(null);
            done();
        });
    });

    DRIVERS.forEach(driverName => {
        it(`fails to setDriver ${driverName} [callback]`, done => {
            localforage.setDriver(driverName, null, err => {
                expect(err).to.be.an(Error);
                expect(err.message).to.be('No available storage method found.');
                done();
            });
        });

        it(`fails to setDriver ${driverName} [promise]`, done => {
            localforage.setDriver(driverName).then(null, err => {
                expect(err).to.be.an(Error);
                expect(err.message).to.be('No available storage method found.');
                done();
            });
        });
    });

    it('fails to setDriver using array parameter [callback]', done => {
        localforage.setDriver(DRIVERS, null, err => {
            expect(err).to.be.an(Error);
            expect(err.message).to.be('No available storage method found.');
            done();
        });
    });

    it('fails to setDriver using array parameter [promise]', done => {
        localforage.setDriver(DRIVERS).then(null, err => {
            expect(err).to.be.an(Error);
            expect(err.message).to.be('No available storage method found.');
            done();
        });
    });
});
