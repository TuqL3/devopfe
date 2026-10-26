import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, todoApi } from '../src/api';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); });

describe('API client', () => {
  it('uses same-origin paths and forwards cancellation signals', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ data: [] })));
    const controller = new AbortController();
    expect(await todoApi.list(controller.signal)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('/api/todos', { signal: controller.signal });
    await todoApi.get('id/with/slash');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/todos/id%2Fwith%2Fslash', { signal: undefined });
  });

  it('sends JSON for create and patch, and handles an empty delete response', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ data: { id: 'one' } })));
    await todoApi.create({ title: 'One', description: null });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/todos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"title":"One","description":null}',
    });
    await todoApi.update('one', { completed: true });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/todos/one', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"completed":true}',
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await todoApi.remove('one')).toBeUndefined();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/todos/one', { method: 'DELETE' });
  });

  it('preserves backend validation errors', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Invalid Todo data', details: { title: 'Too long' } } }), { status: 400 }));
    await expect(todoApi.create({ title: 'bad', description: null })).rejects.toMatchObject({
      message: 'Invalid Todo data', status: 400, details: { title: 'Too long' },
    });
  });

  it('handles HTML proxy errors and malformed successful responses', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Error</html>', { status: 502 }));
    await expect(todoApi.list()).rejects.toMatchObject({ status: 502, message: expect.stringContaining('502') });
    fetchMock.mockResolvedValueOnce(new Response('not JSON'));
    await expect(todoApi.list()).rejects.toThrow('Phản hồi từ máy chủ không hợp lệ');
    fetchMock.mockResolvedValueOnce(new Response('{}'));
    await expect(todoApi.list()).rejects.toThrow('Phản hồi từ máy chủ không hợp lệ');
  });

  it('reports network failures and preserves intentional aborts', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(todoApi.list()).rejects.toBeInstanceOf(ApiError);
    const abort = new DOMException('Aborted', 'AbortError');
    fetchMock.mockRejectedValueOnce(abort);
    await expect(todoApi.list()).rejects.toBe(abort);
  });
});
