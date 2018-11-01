/* global beforeEach:true, describe:true, expect:true, it:true */
describe('When Driver Fails to Initialize', () => {
    const FAULTYDRIVERS = [
        localforage.INDEXEDDB,
        localforage.WEBSQL,
        localforage.LOCALSTORAGE
    ]
        .filter(localforage.supports)
        .filter(
            (
                driverName // FF doesn't allow you to override `localStorage.setItem`
            ) =>
                // so if the faulty driver setup didn't succeed
                // then skip the localStorage tests
                !(
                    driverName === localforage.LOCALSTORAGE &&
                    localStorage.setItem.toString().includes('[native code]')
                )
        );

    FAULTYDRIVERS.forEach(driverName => {
        describe(driverName, () => {
            beforeEach(() => {
                if (driverName === localforage.LOCALSTORAGE) {
                    localStorage.clear();
                }
            });

            it(`fails to setDriver ${driverName} [callback]`, done => {
                localforage.setDriver(driverName, () => {
                    localforage.ready(err => {
                        expect(err).to.be.an(Error);
                        expect(err.message).to.be(
                            'No available storage method found.'
                        );
                        done();
                    });
                });
            });

            it(`fails to setDriver ${driverName} [promise]`, done => {
                localforage
                    .setDriver(driverName)
                    .then(() => localforage.ready())
                    .then(null, err => {
                        expect(err).to.be.an(Error);
                        expect(err.message).to.be(
                            'No available storage method found.'
                        );
                        done();
                    });
            });
        });
    });
});
