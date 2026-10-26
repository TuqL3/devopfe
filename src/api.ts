import type { Todo, TodoDraft, TodoPatch } from './types';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: Record<string, string>) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, init);
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') throw error;
    throw new ApiError('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.', 0);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      typeof body?.error?.message === 'string' ? body.error.message : `Yêu cầu thất bại (${response.status}). Vui lòng thử lại.`,
      response.status,
      body?.error?.details,
    );
  }
  if (response.status === 204) return undefined as T;
  try {
    const body = await response.json();
    if (!body || !Object.hasOwn(body, 'data')) throw new Error();
    return body.data as T;
  } catch {
    throw new ApiError('Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại.', response.status);
  }
}

function jsonBody(method: string, body: TodoDraft | TodoPatch): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const todoApi = {
  list: (signal?: AbortSignal) => request<Todo[]>('/todos', { signal }),
  get: (id: string, signal?: AbortSignal) => request<Todo>(`/todos/${encodeURIComponent(id)}`, { signal }),
  create: (input: TodoDraft) => request<Todo>('/todos', jsonBody('POST', input)),
  update: (id: string, input: TodoPatch) => request<Todo>(`/todos/${encodeURIComponent(id)}`, jsonBody('PATCH', input)),
  remove: (id: string) => request<void>(`/todos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
}
