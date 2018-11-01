/*globals importScripts:true, self:true */
importScripts('/dist/localforage.js');

self.addEventListener(
    'message',
    ({ data }) => {
        function handleError(e) {
            self.postMessage({
                error: JSON.stringify(e),
                body: e,
                fail: true
            });
        }

        localforage.setDriver(
            data.driver,
            () => {
                localforage
                    .setItem(
                        'web worker',
                        data.value,
                        () => {
                            localforage.getItem('web worker', (err, value) => {
                                self.postMessage({
                                    body: value
                                });
                            });
                        },
                        handleError
                    )
                    .catch(handleError);
            },
            handleError
        );
    },
    false
);
