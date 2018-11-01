/* global before:true, beforeEach:true, describe:true, expect:true, it:true, Modernizr:true */
const DRIVERS = [
    localforage.INDEXEDDB,
    localforage.LOCALSTORAGE,
    localforage.WEBSQL
];

DRIVERS.forEach(driverName => {
    if (
        (!localforage.supports(localforage.INDEXEDDB) &&
            driverName === localforage.INDEXEDDB) ||
        (!localforage.supports(localforage.LOCALSTORAGE) &&
            driverName === localforage.LOCALSTORAGE) ||
        (!localforage.supports(localforage.WEBSQL) &&
            driverName === localforage.WEBSQL)
    ) {
        // Browser doesn't support this storage library, so we exit the API
        // tests.
        return;
    }

    describe(`Web Worker support in ${driverName}`, () => {
        before(done => {
            localforage.setDriver(driverName).then(done);
        });

        beforeEach(done => {
            localforage.clear(done);
        });

        if (!Modernizr.webworkers) {
            it.skip("doesn't have web worker support");
            return;
        }

        if (
            driverName === localforage.LOCALSTORAGE ||
            driverName === localforage.WEBSQL
        ) {
            it.skip(`${driverName} is not supported in web workers`);
            return;
        }

        it('saves data', done => {
            const webWorker = new Worker('/test/webworker-client.js');

            webWorker.addEventListener('message', ({ data }) => {
                const body = data.body;

                window.console.log(body);
                expect(body).to.be('I have been set');
                done();
            });

            webWorker.addEventListener('error', e => {
                window.console.log(e);
            });

            webWorker.postMessage({
                driver: driverName,
                value: 'I have been set'
            });
        });
    });
});
