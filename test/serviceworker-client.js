/*globals importScripts:true, self:true */
importScripts('/dist/localforage.js');

self.onmessage = ({ data, ports }) =>
    localforage
        .setDriver(data.driver)
        .then(() => localforage.setItem('service worker', data.value))
        .then(() => localforage.getItem('service worker'))
        .then(value => {
            ports[0].postMessage({
                body: `${value} using ${localforage.driver()}`
            });
        })
        .catch(error => {
            ports[0].postMessage({
                error: JSON.stringify(error),
                body: error,
                fail: true
            });
        });

self.oninstall = event => {
    event.waitUntil(
        localforage
            .setItem('service worker registration', 'serviceworker present')
            .then(value => {
                console.log(value);
            })
    );
};
