const isArray =
    Array.isArray ||
    (arg => Object.prototype.toString.call(arg) === '[object Array]');

export default isArray;
