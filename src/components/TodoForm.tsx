import { useState, type FormEvent } from 'react';
import { ApiError, errorMessage } from '../api';
import type { Todo, TodoDraft } from '../types';

interface Props {
  todo?: Todo;
  busy: boolean;
  onSubmit: (input: TodoDraft) => Promise<void>;
  onCancel: () => void;
}

export function TodoForm({ todo, busy, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setDetails({});
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề công việc.');
      return;
    }
    try {
      await onSubmit({ title: title.trim(), description: description || null });
    } catch (error) {
      setError(errorMessage(error));
      if (error instanceof ApiError) setDetails(error.details ?? {});
    }
  }

  return (
    <form className="todo-form" onSubmit={submit} aria-label={todo ? 'Chỉnh sửa công việc' : 'Tạo công việc'}>
      <span className="eyebrow">{todo ? 'ĐIỀU CHỈNH MỘT CHÚT' : 'BẮT ĐẦU MỘT VIỆC MỚI'}</span>
      <h2>{todo ? 'Chỉnh sửa công việc' : 'Bạn cần làm gì?'}</h2>
      <p className="muted">Một tiêu đề rõ ràng là một khởi đầu tốt.</p>
      {error && <div className="alert error" role="alert">{error}</div>}
      <label htmlFor="title">Tiêu đề <span className="muted">(bắt buộc)</span></label>
      <input id="title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={200}
        disabled={busy} autoFocus placeholder="Ví dụ: Hoàn thành mini-project DevOps"
        aria-invalid={Boolean(details.title)} aria-describedby={details.title ? 'title-error' : undefined} />
      {typeof details.title === 'string' && <p className="field-error" id="title-error">{details.title}</p>}
      <label htmlFor="description">Mô tả <span className="muted">(tùy chọn)</span></label>
      <textarea id="description" value={description} onChange={event => setDescription(event.target.value)} maxLength={5000}
        disabled={busy} rows={5} placeholder="Thêm một vài chi tiết…"
        aria-invalid={Boolean(details.description)} aria-describedby={details.description ? 'description-error' : undefined} />
      {typeof details.description === 'string' && <p className="field-error" id="description-error">{details.description}</p>}
      <div className="actions">
        <button className="button primary" type="submit" disabled={busy}>{busy ? 'Đang lưu…' : todo ? 'Lưu thay đổi' : 'Tạo công việc'}</button>
        <button className="button secondary" type="button" disabled={busy} onClick={onCancel}>Hủy</button>
      </div>
    </form>
  );
}
