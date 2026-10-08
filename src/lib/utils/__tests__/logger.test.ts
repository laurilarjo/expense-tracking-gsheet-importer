import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLogLevel, log } from '../logger';

describe('logger', () => {
  const original = process.env.LOG_LEVEL;

  afterEach(() => {
    if (original === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = original;
    vi.restoreAllMocks();
  });

  it('defaults to info', () => {
    delete process.env.LOG_LEVEL;
    expect(getLogLevel()).toBe('info');
  });

  it('emits debug only when LOG_LEVEL=debug', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    process.env.LOG_LEVEL = 'info';
    log.debug('secret-tx');
    expect(spy).not.toHaveBeenCalled();

    process.env.LOG_LEVEL = 'debug';
    log.debug('secret-tx');
    expect(spy).toHaveBeenCalledWith('secret-tx');
  });
});
