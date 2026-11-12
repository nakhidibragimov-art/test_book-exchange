import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { api, Book, Paged, photoSrc } from '../api';

export function Cover({ book, className = '' }: { book: Book; className?: string }) {
  const src = photoSrc(book.photo);
  return src
    ? <img src={src} alt={`Обкладинка: ${book.name}`} className={`object-cover ${className}`} />
    : <div className={`flex items-center justify-center bg-teal-50 p-2 text-center font-serif text-sm text-teal-800 ${className}`}>{book.name}</div>;
}

export default function Books() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Book> | null>(null);
  const [loading, setLoading] = useState(true);

  // debounce пошуку
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    // скасовуємо попередній запит, щоб повільна стара відповідь не перезаписала нову
    const controller = new AbortController();
    setLoading(true);
    api.get<Paged<Book>>('/books', { params: { search: query, order, page, limit: 8 }, signal: controller.signal })
      .then((r) => setData(r.data))
      .catch((e) => { if (!axios.isCancel(e)) console.error(e); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, order, page]);

  return (
    <div>
      <h1 className="mb-4 font-serif text-2xl font-bold">Каталог книг</h1>
      <div className="mb-6 flex flex-wrap gap-3">
        <input className="input max-w-sm" placeholder="Пошук за назвою або автором" aria-label="Пошук" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-auto" aria-label="Сортування" value={order} onChange={(e) => { setOrder(e.target.value as 'asc' | 'desc'); setPage(1); }}>
          <option value="asc">Назва А → Я</option>
          <option value="desc">Назва Я → А</option>
        </select>
      </div>

      {loading && !data ? <p>Завантаження…</p> : data && data.items.length === 0 ? (
        <p className="text-slate-600">Нічого не знайдено. Спробуйте інший запит.</p>
      ) : (
        <ul className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
          {data?.items.map((b) => (
            <li key={b.id}>
              <Link to={`/books/${b.id}`} className="block overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-teal-700">
                <Cover book={b} className="h-44 w-full" />
                <div className="p-3">
                  <p className="font-semibold leading-tight">{b.name}</p>
                  <p className="text-sm text-slate-600">{b.author}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data && data.pages > 1 && (
        <div className="mt-6 flex items-center gap-3">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Назад</button>
          <span className="text-sm">Сторінка {data.page} з {data.pages}</span>
          <button className="btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Далі</button>
        </div>
      )}
    </div>
  );
}
