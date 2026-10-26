import type { Todo } from '../types';

interface Props {
  todo: Todo;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

export function TodoDetail({ todo, busy, onEdit, onToggle, onDelete }: Props) {
  return (
    <div className="detail-content">
      <span className={`badge ${todo.completed ? 'done' : ''}`}>{todo.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</span>
      <h2>{todo.title}</h2>
      <p className={`description ${todo.description ? '' : 'muted'}`}>{todo.description || 'Công việc này chưa có mô tả.'}</p>
      <dl className="timestamps">
        <div><dt>Ngày tạo</dt><dd><time dateTime={todo.createdAt}>{new Date(todo.createdAt).toLocaleString('vi-VN')}</time></dd></div>
        <div><dt>Cập nhật</dt><dd><time dateTime={todo.updatedAt}>{new Date(todo.updatedAt).toLocaleString('vi-VN')}</time></dd></div>
      </dl>
      <div className="actions">
        <button className="button primary" disabled={busy} onClick={onToggle}>{todo.completed ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}</button>
        <button className="button secondary" disabled={busy} onClick={onEdit}>Chỉnh sửa</button>
      </div>
      <button className="delete-button" disabled={busy} onClick={onDelete}>Xóa công việc</button>
    </div>
  );
}
