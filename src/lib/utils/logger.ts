export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function parseLevel(raw: string | undefined): LogLevel {
  const value = (raw || 'info').trim().toLowerCase();
  if (value === 'error' || value === 'warn' || value === 'info' || value === 'debug') {
    return value;
  }
  return 'info';
}

/** Resolve LOG_LEVEL from Node env or Vite-exposed import.meta.env. */
export function getLogLevel(): LogLevel {
  const fromProcess =
    typeof process !== 'undefined' && process.env && typeof process.env.LOG_LEVEL === 'string'
      ? process.env.LOG_LEVEL
      : undefined;
  const fromVite =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.LOG_LEVEL === 'string'
      ? import.meta.env.LOG_LEVEL
      : undefined;
  return parseLevel(fromProcess || fromVite);
}

function enabled(level: LogLevel): boolean {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[getLogLevel()];
}

export const log = {
  error(...args: unknown[]): void {
    if (enabled('error')) console.error(...args);
  },
  warn(...args: unknown[]): void {
    if (enabled('warn')) console.warn(...args);
  },
  info(...args: unknown[]): void {
    if (enabled('info')) console.log(...args);
  },
  debug(...args: unknown[]): void {
    if (enabled('debug')) console.log(...args);
  },
};
