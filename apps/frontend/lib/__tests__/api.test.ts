import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from '../api';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('returns the parsed body on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, { ok: true })));
    await expect(apiFetch('/health')).resolves.toEqual({ ok: true });
  });

  it("does not retry a 4xx, which is the server's final answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(429, { error: 'TooManyRequests' }));
    vi.stubGlobal('fetch', fetchMock);

    const err = await apiFetch('/leads', { retries: 2 }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(429);
    expect((err as ApiError).body).toEqual({ error: 'TooManyRequests' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a transport failure and succeeds on a later attempt', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(json(200, { items: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const pending = apiFetch('/products', { retries: 1 });
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual({ items: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('builds the URL from the configured API base', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/products?page=1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:4000/api/products?page=1');
  });
});
