/* global requirejs:true */
// Run before window.onload to make sure the specs have access to describe()
// and other mocha methods. All feels very hacky though :-/
this.mocha.setup('bdd');

function runTests() {
    const runner = this.mocha.run();

    const failedTests = [];

    runner.on('end', () => {
        window.mochaResults = runner.stats;
        window.mochaResults.reports = failedTests;
    });

    function flattenTitles(test) {
        const titles = [];

        while (test.parent.title) {
            titles.push(test.parent.title);
            test = test.parent;
        }

        return titles.reverse();
    }

    function logFailure(test, { message, stack }) {
        failedTests.push({
            name: test.title,
            result: false,
            message: message,
            stack: stack,
            titles: flattenTitles(test)
        });
    }

    runner.on('fail', logFailure);
}

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(callback, thisArg) {
        if (typeof callback !== 'function') {
            throw new TypeError(`${callback} is not a function!`);
        }
        const len = this.length;
        for (let i = 0; i < len; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

const require = this.require;
if (require) {
    requirejs.config({
        paths: {
            localforage: '/dist/localforage'
        }
    });
    require(['localforage'], localforage => {
        window.localforage = localforage;

        require([
            '/test/test.api.js',
            '/test/test.config.js',
            '/test/test.datatypes.js',
            '/test/test.drivers.js',
            '/test/test.iframes.js',
            '/test/test.webworkers.js'
        ], runTests);
    });
} else if (this.addEventListener) {
    this.addEventListener('load', runTests);
} else if (this.attachEvent) {
    this.attachEvent('onload', runTests);
}
