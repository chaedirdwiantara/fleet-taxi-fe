import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { api, unwrap, unwrapWithMeta, ApiErrorException, type Envelope } from './client';

describe('unwrap (standard envelope, PROJECT-BRIEF.md §6)', () => {
  it('returns data on success', () => {
    const res: Envelope<{ a: number }> = { success: true, data: { a: 1 } };
    expect(unwrap(res)).toEqual({ a: 1 });
  });

  it('throws ApiErrorException carrying code/message/details on error', () => {
    const res: Envelope<never> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Human readable',
        details: [{ field: 'pickup_at', message: 'required' }],
      },
    };
    try {
      unwrap(res);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiErrorException);
      const err = e as ApiErrorException;
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.message).toBe('Human readable');
      expect(err.details).toEqual([{ field: 'pickup_at', message: 'required' }]);
    }
  });

  it('throws on empty body', () => {
    expect(() => unwrap(undefined)).toThrow(ApiErrorException);
  });

  it('unwrapWithMeta keeps pagination meta', () => {
    const res: Envelope<number[]> = {
      success: true,
      data: [1, 2],
      meta: { page: 1, pageSize: 50, total: 320 },
    };
    expect(unwrapWithMeta(res)).toEqual({
      data: [1, 2],
      meta: { page: 1, pageSize: 50, total: 320 },
    });
  });
});

describe('generated client ↔ MSW (single mock layer)', () => {
  it('fetches the gojek import list through the typed client', async () => {
    const { data, error } = await api.GET('/admin/fleet/{platform}/imports', {
      params: { path: { platform: 'gojek' } },
    });
    expect(error).toBeUndefined();
    const batches = unwrap(data) as { filename: string; status: string }[];
    expect(batches.length).toBeGreaterThan(0);
    expect(batches[0]).toMatchObject({ filename: expect.any(String), status: expect.any(String) });
  });

  it('fetches the gojek grid with query params', async () => {
    const { data } = await api.GET('/admin/fleet/gojek/grid', {
      params: { query: { month: '6', year: '2026' } },
    });
    const grid = unwrap(data) as {
      month: number;
      daysInMonth: number;
      rows: { dailyTarget: number; summary: { outstanding: number } }[];
    };
    expect(grid.month).toBe(6);
    expect(grid.daysInMonth).toBe(30);
    expect(grid.rows.length).toBeGreaterThan(0);
    // money is integer rupiah — never a float (guardrail §11)
    for (const row of grid.rows.slice(0, 5)) {
      expect(Number.isInteger(row.dailyTarget)).toBe(true);
      expect(Number.isInteger(row.summary.outstanding)).toBe(true);
    }
  });

  it('pagination meta round-trips through the typed client (unwrapWithMeta)', async () => {
    server.use(
      http.get('*/partner/portal/plates', () =>
        HttpResponse.json({
          success: true,
          data: [{ id: 1 }, { id: 2 }],
          meta: { page: 2, pageSize: 10, total: 120 },
        }),
      ),
    );
    const { data } = await api.GET('/partner/portal/plates');
    const { data: rows, meta } = unwrapWithMeta(data);
    expect(rows).toHaveLength(2);
    expect(meta).toEqual({ page: 2, pageSize: 10, total: 120 });
  });

  it('surfaces the standard error envelope', async () => {
    server.use(
      http.get('*/partner/portal/me', () =>
        HttpResponse.json(
          { success: false, error: { code: 'UNAUTHENTICATED', message: 'Login required' } },
          { status: 401 },
        ),
      ),
    );
    const { data, error, response } = await api.GET('/partner/portal/me');
    expect(response.status).toBe(401);
    expect(data).toBeUndefined();
    expect(error).toMatchObject({ success: false, error: { code: 'UNAUTHENTICATED' } });
  });
});
