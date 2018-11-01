export default function getCallback(...args) {
    if (args.length && typeof args[args.length - 1] === 'function') {
        return args[args.length - 1];
    }
}
