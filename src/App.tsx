import { useEffect, useState } from 'react';
import { errorMessage, todoApi } from './api';
import { TodoList } from './components/TodoList';
import { TodoDetail } from './components/TodoDetail';
import { TodoForm } from './components/TodoForm';
import type { Todo, TodoDraft } from './types';

type Remote<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

export default function App() {
  const [list, setList] = useState<Remote<Todo[]>>({ status: 'loading' });
  const [listAttempt, setListAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Remote<Todo> | null>(null);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [panel, setPanel] = useState<'none' | 'view' | 'new' | 'edit'>('none');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setList({ status: 'loading' });
    todoApi.list(controller.signal).then(data => {
      if (!controller.signal.aborted) setList({ status: 'ready', data });
    }).catch(error => {
      if (!controller.signal.aborted) setList({ status: 'error', message: errorMessage(error) });
    });
    return () => controller.abort();
  }, [listAttempt]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    const controller = new AbortController();
    setDetail({ status: 'loading' });
    todoApi.get(selectedId, controller.signal).then(data => {
      if (!controller.signal.aborted) setDetail({ status: 'ready', data });
    }).catch(error => {
      if (!controller.signal.aborted) setDetail({ status: 'error', message: errorMessage(error) });
    });
    return () => controller.abort();
  }, [selectedId, detailAttempt]);

  function updateList(todo: Todo) {
    setList(current => current.status !== 'ready' ? current : {
      status: 'ready', data: current.data.some(item => item.id === todo.id)
        ? current.data.map(item => item.id === todo.id ? todo : item)
        : [todo, ...current.data],
    });
  }

  async function save(input: TodoDraft) {
    setBusy(true);
    setNotice(null);
    try {
      const todo = panel === 'edit' && selectedId ? await todoApi.update(selectedId, input) : await todoApi.create(input);
      updateList(todo);
      setSelectedId(todo.id);
      setDetail({ status: 'ready', data: todo });
      setPanel('view');
      setNotice({ error: false, text: 'Đã lưu công việc.' });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(todo: Todo) {
    setBusy(true);
    setNotice(null);
    try {
      const updated = await todoApi.update(todo.id, { completed: !todo.completed });
      updateList(updated);
      if (selectedId === todo.id) setDetail({ status: 'ready', data: updated });
      setNotice({ error: false, text: updated.completed ? 'Đã hoàn thành công việc.' : 'Đã đánh dấu chưa hoàn thành.' });
    } catch (error) {
      setNotice({ error: true, text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function remove(todo: Todo) {
    if (!window.confirm(`Xóa công việc “${todo.title}”?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      await todoApi.remove(todo.id);
      setList(current => current.status === 'ready' ? { status: 'ready', data: current.data.filter(item => item.id !== todo.id) } : current);
      setSelectedId(null);
      setPanel('none');
      setNotice({ error: false, text: 'Đã xóa công việc.' });
    } catch (error) {
      setNotice({ error: true, text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  const todos = list.status === 'ready' ? list.data : [];
  const completed = todos.filter(todo => todo.completed).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Todo — Trang chủ"><span className="brand-mark" aria-hidden="true">✓</span>todo<span className="brand-dot">.</span></a>
        <span className="topbar-note">TỪNG VIỆC MỘT</span>
      </header>
      <main>
        <section className="intro" aria-labelledby="page-title">
          <div><p className="eyebrow">MỘT NGÀY CÓ CHỦ ĐÍCH</p><h1 id="page-title">Việc hôm nay.</h1><p className="intro-copy">Ghi lại điều cần làm. Tập trung vào điều quan trọng.</p></div>
          <button className="button primary add-button" disabled={busy || list.status !== 'ready'} onClick={() => { setSelectedId(null); setPanel('new'); setNotice(null); }}><span aria-hidden="true">＋</span> Thêm công việc</button>
        </section>
        {notice && <div className={`alert ${notice.error ? 'error' : 'success'}`} role={notice.error ? 'alert' : 'status'}>{notice.text}</div>}
        {busy && <p className="muted" role="status">Đang cập nhật công việc…</p>}
        <div className="workspace">
          <section className="card list-card" aria-labelledby="list-heading" aria-busy={list.status === 'loading' || busy}>
            <div className="card-heading"><h2 id="list-heading">Công việc của bạn</h2>{list.status === 'ready' && <span className="count">{todos.length}</span>}</div>
            {list.status === 'loading' && <div className="empty-state" role="status"><span className="spinner" aria-hidden="true" />Đang tải công việc…</div>}
            {list.status === 'error' && <div className="empty-state"><p role="alert">{list.message}</p><button className="button secondary" onClick={() => setListAttempt(value => value + 1)}>Thử lại danh sách</button></div>}
            {list.status === 'ready' && (todos.length ? <TodoList todos={todos} selectedId={selectedId} busy={busy} toggleDisabled={busy || detail?.status === 'loading' || panel === 'edit'}
              onSelect={id => { if (id !== selectedId) setDetail({ status: 'loading' }); setSelectedId(id); setPanel('view'); setNotice(null); }} onToggle={todo => { void toggle(todo); }} />
              : <div className="empty-state"><span className="empty-icon" aria-hidden="true">✓</span><h3>Mọi thứ bắt đầu từ một việc nhỏ.</h3><p>Chưa có công việc nào. Thêm việc đầu tiên để bắt đầu.</p></div>)}
            {list.status === 'ready' && todos.length > 0 && <div className="list-footer"><span>{completed}/{todos.length} đã hoàn thành</span><span className="muted">Cứ từng bước một.</span></div>}
          </section>
          <section className="card detail-card" aria-label="Chi tiết công việc" aria-busy={busy || detail?.status === 'loading'}>
            {panel === 'none' && <div className="empty-state detail-placeholder"><span className="empty-icon" aria-hidden="true">↗</span><h2>Một chút tập trung.</h2><p>Chọn một công việc để xem chi tiết,<br />hoặc thêm điều bạn muốn làm hôm nay.</p></div>}
            {panel === 'new' && <TodoForm key="new" busy={busy} onSubmit={save} onCancel={() => setPanel('none')} />}
            {(panel === 'view' || panel === 'edit') && detail?.status === 'loading' && <div className="empty-state" role="status">Đang tải chi tiết…</div>}
            {(panel === 'view' || panel === 'edit') && detail?.status === 'error' && <div className="empty-state"><p role="alert">{detail.message}</p><button className="button secondary" onClick={() => setDetailAttempt(value => value + 1)}>Thử lại chi tiết</button></div>}
            {panel === 'view' && detail?.status === 'ready' && <TodoDetail todo={detail.data} busy={busy} onEdit={() => setPanel('edit')}
              onToggle={() => { void toggle(detail.data); }} onDelete={() => { void remove(detail.data); }} />}
            {panel === 'edit' && detail?.status === 'ready' && <TodoForm key={detail.data.id} todo={detail.data} busy={busy} onSubmit={save} onCancel={() => setPanel('view')} />}
          </section>
        </div>
        <footer className="page-footer">Một nơi gọn gàng cho những điều cần làm.</footer>
      </main>
    </div>
  );
}
