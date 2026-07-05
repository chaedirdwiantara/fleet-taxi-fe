import { describe, it, expect } from 'vitest';
import { env } from './index';

describe('env (zod-validated import.meta.env)', () => {
  it('parses the vitest-provided env', () => {
    expect(env.VITE_API_BASE_URL).toBe('http://localhost:3000');
    expect(env.VITE_APP_ENV).toBe('local');
    expect(env.VITE_USE_MSW).toBe('false');
  });
});
