import log from 'loglevel';

const isDevelopment = import.meta.env.MODE === 'development';
const logLevel =
  import.meta.env.VITE_LOG_LEVEL || (isDevelopment ? 'debug' : 'warn');

log.setLevel(logLevel);

if (isDevelopment) {
  log.setDefaultLevel('debug');
}

export default log;

export const debug = (...args) => log.debug(...args);
export const info = (...args) => log.info(...args);
export const warn = (...args) => log.warn(...args);
export const error = (...args) => log.error(...args);
