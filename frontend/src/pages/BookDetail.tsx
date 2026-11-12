import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Book, errMsg } from '../api';
import { useAuth } from '../store';
import { Cover } from './Books';

export default function BookDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const [book, setBook] = useState<Book | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Book>(`/books/${id}`).then((r) => setBook(r.data)).catch(() => setNotFound(true));
  }, [id]);

  if (notFound) return <p>Книгу не знайдено. <Link className="underline" to="/books">До каталогу</Link></p>;
  if (!book) return <p>Завантаження…</p>;

  const isOwner = user?.id === book.ownerId;

  const requestExchange = async () => {
    setBusy(true); setMsg(null);
    try {
      await api.post(`/books/${book.id}/exchange`);
      setMsg({ ok: true, text: 'Запит надіслано власнику на email.' });
    } catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm('Видалити цю книгу?')) return;
    await api.delete(`/books/${book.id}`);
    nav('/books');
  };

  return (
    <div className="grid gap-6 sm:grid-cols-[240px_1fr]">
      <Cover book={book} className="h-80 w-full rounded-lg" />
      <div>
        <h1 className="font-serif text-3xl font-bold">{book.name}</h1>
        <p className="mt-1 text-lg text-slate-600">{book.author}</p>
        <p className="mt-4 text-sm text-slate-600">Власник: {book.owner?.name}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!user ? (
            <Link to="/login" className="btn">Увійдіть, щоб запросити обмін</Link>
          ) : isOwner ? (
            <p className="text-sm text-slate-600">Це ваша книга — запросити обмін на неї не можна.</p>
          ) : (
            <button className="btn" onClick={requestExchange} disabled={busy}>Запросити обмін</button>
          )}
          {user && (isOwner || user.role === 'ADMIN') && <button className="btn-danger" onClick={remove}>Видалити книгу</button>}
        </div>
        {msg && <p role="status" className={`mt-4 text-sm ${msg.ok ? 'text-teal-800' : 'err'}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
