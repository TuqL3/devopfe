import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { ApiError, todoApi } from '../src/api';
import type { Todo } from '../src/types';

vi.mock('../src/api', async importOriginal => ({
  ...await importOriginal<typeof import('../src/api')>(),
  todoApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const todo: Todo = {
  id: '212e2a2b-640e-46eb-867f-d523e1cfe398', title: 'Học DevOps', description: 'Áp dụng migration', completed: false,
  createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z',
};
const api = vi.mocked(todoApi);
const detail = () => within(screen.getByRole('region', { name: 'Chi tiết công việc' }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetAllMocks();
  api.list.mockResolvedValue([todo]);
  api.get.mockResolvedValue(todo);
});

describe('Todo interface', () => {
  it('shows loading and then an empty state', async () => {
    const pending = deferred<Todo[]>();
    api.list.mockReturnValue(pending.promise);
    render(<App />);
    expect(screen.getByText('Đang tải công việc…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm công việc/ })).toBeDisabled();
    await act(async () => { pending.resolve([]); });
    expect(await screen.findByText('Mọi thứ bắt đầu từ một việc nhỏ.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm công việc/ })).toBeEnabled();
  });

  it('retries a failed list request', async () => {
    api.list.mockRejectedValueOnce(new ApiError('Máy chủ không khả dụng', 503)).mockResolvedValueOnce([todo]);
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ không khả dụng');
    await user.click(screen.getByRole('button', { name: 'Thử lại danh sách' }));
    expect(await screen.findByRole('button', { name: /Học DevOps/ })).toBeInTheDocument();
  });

  it('loads detail from its endpoint and supports retrying errors', async () => {
    api.get.mockRejectedValueOnce(new ApiError('Không tải được chi tiết', 500)).mockResolvedValueOnce(todo);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Học DevOps/ }));
    expect(await detail().findByRole('alert')).toHaveTextContent('Không tải được chi tiết');
    await user.click(detail().getByRole('button', { name: 'Thử lại chi tiết' }));
    expect(await detail().findByRole('heading', { name: todo.title })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(todo.id, expect.any(AbortSignal));
    expect(detail().getByText('Áp dụng migration')).toBeInTheDocument();
  });

  it('creates a Todo and displays it in the list and detail', async () => {
    const created = { ...todo, id: 'new-id', title: 'Việc mới', description: null };
    api.create.mockResolvedValue(created);
    api.get.mockResolvedValue(created);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: /Học DevOps/ });
    await user.click(screen.getByRole('button', { name: /Thêm công việc/ }));
    await user.type(screen.getByLabelText(/Tiêu đề/), '  Việc mới  ');
    await user.click(screen.getByRole('button', { name: 'Tạo công việc' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith({ title: 'Việc mới', description: null }));
    expect(await screen.findByRole('button', { name: /Việc mới/ })).toBeInTheDocument();
    expect(await detail().findByRole('heading', { name: 'Việc mới' })).toBeInTheDocument();
  });

  it('preserves form input and shows field errors when saving fails', async () => {
    api.create.mockRejectedValue(new ApiError('Dữ liệu không hợp lệ', 400, { title: 'Tiêu đề bị từ chối' }));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: /Học DevOps/ });
    await user.click(screen.getByRole('button', { name: /Thêm công việc/ }));
    await user.type(screen.getByLabelText(/Tiêu đề/), 'Bản nháp');
    await user.click(screen.getByRole('button', { name: 'Tạo công việc' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Dữ liệu không hợp lệ');
    expect(screen.getByLabelText(/Tiêu đề/)).toHaveValue('Bản nháp');
    expect(screen.getByLabelText(/Tiêu đề/)).toHaveAccessibleDescription('Tiêu đề bị từ chối');
    expect(screen.getByRole('button', { name: 'Tạo công việc' })).toBeEnabled();
  });

  it('rejects whitespace-only titles before making a request and can cancel creation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: /Học DevOps/ });
    await user.click(screen.getByRole('button', { name: /Thêm công việc/ }));
    await user.type(screen.getByLabelText(/Tiêu đề/), '   ');
    await user.click(screen.getByRole('button', { name: 'Tạo công việc' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng nhập tiêu đề');
    expect(api.create).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('edits title and description', async () => {
    const updated = { ...todo, title: 'Đã chỉnh sửa', description: null };
    api.update.mockResolvedValue(updated);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Học DevOps/ }));
    await user.click(await detail().findByRole('button', { name: 'Chỉnh sửa' }));
    await user.clear(screen.getByLabelText(/Tiêu đề/));
    await user.type(screen.getByLabelText(/Tiêu đề/), updated.title);
    await user.clear(screen.getByLabelText(/Mô tả/));
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(api.update).toHaveBeenCalledWith(todo.id, { title: updated.title, description: null });
    expect(await detail().findByRole('heading', { name: updated.title })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đã chỉnh sửa/ })).toBeInTheDocument();
  });

  it('keeps the previous checkbox state on failure and toggles after success', async () => {
    api.update.mockRejectedValueOnce(new ApiError('Không thể cập nhật', 500)).mockResolvedValueOnce({ ...todo, completed: true });
    const user = userEvent.setup();
    render(<App />);
    const checkbox = await screen.findByRole('checkbox', { name: `Hoàn thành: ${todo.title}` });
    await user.click(checkbox);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể cập nhật');
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toBeChecked());
    expect(api.update).toHaveBeenLastCalledWith(todo.id, { completed: true });
  });

  it('marks a completed Todo as incomplete', async () => {
    api.list.mockResolvedValue([{ ...todo, completed: true }]);
    api.update.mockResolvedValue(todo);
    const user = userEvent.setup();
    render(<App />);
    const checkbox = await screen.findByRole('checkbox');
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).not.toBeChecked());
    expect(api.update).toHaveBeenCalledWith(todo.id, { completed: false });
  });

  it('confirms deletion and keeps the record visible if the server rejects it', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    api.remove.mockRejectedValueOnce(new ApiError('Xóa thất bại', 500)).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Học DevOps/ }));
    const remove = await detail().findByRole('button', { name: 'Xóa công việc' });
    await user.click(remove);
    expect(api.remove).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.click(remove);
    expect(await screen.findByRole('alert')).toHaveTextContent('Xóa thất bại');
    expect(screen.getByRole('button', { name: /Học DevOps/ })).toBeInTheDocument();
    await user.click(remove);
    expect(await screen.findByText('Mọi thứ bắt đầu từ một việc nhỏ.')).toBeInTheDocument();
  });

  it('ignores a stale detail response after selecting another Todo', async () => {
    const first = deferred<Todo>();
    const second = { ...todo, id: 'second', title: 'Việc thứ hai' };
    api.list.mockResolvedValue([todo, second]);
    api.get.mockImplementation(id => id === todo.id ? first.promise : Promise.resolve(second));
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Học DevOps/ }));
    expect(detail().getByText('Đang tải chi tiết…')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Việc thứ hai/ }));
    expect(await detail().findByRole('heading', { name: second.title })).toBeInTheDocument();
    await act(async () => { first.resolve(todo); });
    expect(detail().queryByRole('heading', { name: todo.title })).not.toBeInTheDocument();
    expect(detail().getByRole('heading', { name: second.title })).toBeInTheDocument();
  });

  it('disables duplicate mutations while a request is pending', async () => {
    const pending = deferred<Todo>();
    api.update.mockReturnValue(pending.promise);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Thêm công việc/ })).toBeDisabled();
    expect(screen.getByText('Đang cập nhật công việc…')).toBeInTheDocument();
    await act(async () => { pending.resolve({ ...todo, completed: true }); });
    expect(screen.getByRole('checkbox')).toBeEnabled();
  });
});
