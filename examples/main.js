requirejs.config({
    paths: {
        localforage: './../dist/localforage'
    }
});
define(['localforage'], lf => {
    lf.ready(() => {
        const key = 'STORE_KEY';
        const value = 'What we save offline';
        const UNKNOWN_KEY = 'unknown_key';

        lf.setItem(key, value, () => {
            console.log('SAVING', value);

            lf.getItem(key, readValue => {
                console.log('READING', readValue);
            });
        });

        // Promises code.
        lf.setItem('promise', 'ring', () => {
            lf.getItem('promise').then(readValue => {
                console.log('YOU PROMISED!', readValue);
            });
        });

        // Since this key hasn't been set yet, we'll get a null value
        lf.getItem(UNKNOWN_KEY, readValue => {
            console.log('FAILED READING', UNKNOWN_KEY, readValue);
        });
    });

    lf.ready().then(() => {
        console.log('You can use ready from Promises too');
    });
});
