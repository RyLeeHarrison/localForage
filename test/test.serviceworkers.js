/* global navigator:true, window:true, Modernizr:true, describe:true, expect:true, it:true, xit:true, before:true, beforeEach:true, after:true*/
const DRIVERS = [
    localforage.INDEXEDDB,
    localforage.LOCALSTORAGE,
    localforage.WEBSQL
];

DRIVERS.forEach(driverName => {
    if (
        (!Modernizr.indexeddb && driverName === localforage.INDEXEDDB) ||
        (!Modernizr.localstorage && driverName === localforage.LOCALSTORAGE) ||
        (!Modernizr.websqldatabase && driverName === localforage.WEBSQL)
    ) {
        // Browser doesn't support this storage library, so we exit the API
        // tests.
        return;
    }

    describe(`Service Worker support in ${driverName}`, () => {
        // Use this until a test is added to Modernizr
        if (!('serviceworker' in Modernizr)) {
            Modernizr.serviceworker = 'serviceWorker' in navigator;
        }

        if (!Modernizr.serviceworker) {
            before.skip("doesn't have service worker support");
            beforeEach.skip("doesn't have service worker support");
            it.skip("doesn't have service worker support");
            after.skip("doesn't have service worker support");
            return;
        }

        if (!window.MessageChannel) {
            before.skip("doesn't have MessageChannel support");
            beforeEach.skip("doesn't have MessageChannel support");
            it.skip("doesn't have MessageChannel support");
            after.skip("doesn't have MessageChannel support");
            return;
        }

        before(done => {
            navigator.serviceWorker
                .register('/test/serviceworker-client.js')
                .then(() => localforage.setDriver(driverName))
                .then(done);
        });

        after(done => {
            navigator.serviceWorker.ready
                .then(registration => registration.unregister())
                .then(bool => {
                    if (bool) {
                        done();
                    } else {
                        done('service worker failed to unregister');
                    }
                });
        });

        beforeEach(done => {
            localforage.clear(done);
        });

        if (
            driverName === localforage.LOCALSTORAGE ||
            driverName === localforage.WEBSQL
        ) {
            it.skip(`${driverName} is not supported in service workers`);
            return;
        }

        xit('should set a value on registration', done => {
            navigator.serviceWorker.ready
                .then(() => localforage.getItem('service worker registration'))
                .then(result => {
                    expect(result).to.equal('serviceworker present');
                    done();
                })
                .catch(error => {
                    done(error);
                });
        });

        it('saves data', done => {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = ({ data }) => {
                expect(data.body).to.be(`I have been set using ${driverName}`);
                done();
            };

            navigator.serviceWorker.ready
                .then(({ active }) => {
                    active.postMessage(
                        {
                            driver: driverName,
                            value: 'I have been set'
                        },
                        [messageChannel.port2]
                    );
                })
                .catch(error => {
                    done(error);
                });
        });
    });
});
