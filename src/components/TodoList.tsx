import type { Todo } from '../types';

interface Props {
  todos: Todo[];
  selectedId: string | null;
  busy: boolean;
  toggleDisabled: boolean;
  onSelect: (id: string) => void;
  onToggle: (todo: Todo) => void;
}

export function TodoList({ todos, selectedId, busy, toggleDisabled, onSelect, onToggle }: Props) {
  return (
    <ul className="todo-list" aria-label="Danh sách công việc">
      {todos.map(todo => (
        <li key={todo.id} className={`todo-row ${selectedId === todo.id ? 'selected' : ''} ${todo.completed ? 'completed' : ''}`}>
          <input type="checkbox" checked={todo.completed} disabled={toggleDisabled}
            aria-label={`Hoàn thành: ${todo.title}`} onChange={() => onToggle(todo)} />
          <button className="todo-select" disabled={busy} aria-pressed={selectedId === todo.id} onClick={() => onSelect(todo.id)}>
            <span className="todo-title">{todo.title}</span>
            <span className="todo-preview">{todo.description || 'Chưa có mô tả'}</span>
          </button>
          <span className="row-arrow" aria-hidden="true">↗</span>
        </li>
      ))}
    </ul>
  );
}
