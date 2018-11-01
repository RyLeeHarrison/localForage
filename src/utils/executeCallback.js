function executeCallback(promise, callback) {
    if (callback) {
        promise.then(
            result => {
                callback(null, result);
            },
            error => {
                callback(error);
            }
        );
    }
}

export default executeCallback;
