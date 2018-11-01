/* global beforeEach:true */
this.mocha.setup('bdd');

beforeEach(done => {
    let previousDriver = localforage.driver();

    function rerequirelocalforage() {
        // The API method stubs inserted by callWhenReady must be tested before
        // they are replaced by the driver, which happens as soon as it loads.
        //
        // To ensure that they work when the drivers are loaded asynchronously,
        // we run the entire test suite (except for config tests), but undefine
        // the localforage module and force it to reload before each test, so that
        // it will be initialized again.
        //
        // This ensures that the synchronous parts of localforage initialization
        // and the API calls in the tests occur first in every test, such that the
        // callWhenReady API method stubs are called before RequireJS
        // asynchronously loads the drivers that replace them.
        require.undef('localforage');
        require(['localforage'], localforage => {
            localforage.setDriver(previousDriver);
            window.localforage = localforage;
            done();
        });
    }

    localforage.ready().then(
        () => {
            previousDriver = localforage.driver();
            rerequirelocalforage();
        },
        () => {
            rerequirelocalforage();
        }
    );
});
