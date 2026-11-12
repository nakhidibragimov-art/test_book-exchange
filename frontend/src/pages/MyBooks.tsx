import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, Book, errMsg } from '../api';
import { Cover } from './Books';

interface Form { name: string; author: string; photo?: string; file?: FileList }

export default function MyBooks() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>();

  const load = () => api.get<Book[]>('/me/books').then((r) => setBooks(r.data));
  useEffect(() => { load(); }, []);

  const onSubmit = async (v: Form) => {
    setError('');
    const fd = new FormData();
    fd.append('name', v.name);
    fd.append('author', v.author);
    if (v.file?.[0]) fd.append('file', v.file[0]);
    else if (v.photo) fd.append('photo', v.photo);
    try {
      await api.post('/me/books', fd);
      reset();
      load();
    } catch (e) { setError(errMsg(e)); }
  };

  const remove = async (id: number) => {
    if (!confirm('Видалити книгу?')) return;
    await api.delete(`/books/${id}`);
    load();
  };

  return (
    <div className="grid gap-8 md:grid-cols-[320px_1fr]">
      <form onSubmit={handleSubmit(onSubmit)} className="h-fit space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-serif text-xl font-bold">Додати книгу</h2>
        <div>
          <label className="label" htmlFor="name">Назва</label>
          <input id="name" className="input" {...register('name', { required: 'Вкажіть назву' })} />
          {errors.name && <p className="err">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="author">Автор</label>
          <input id="author" className="input" {...register('author', { required: 'Вкажіть автора' })} />
          {errors.author && <p className="err">{errors.author.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="file">Фото (файл)</label>
          <input id="file" type="file" accept="image/*" className="text-sm" {...register('file')} />
        </div>
        <div>
          <label className="label" htmlFor="photo">…або посилання на фото</label>
          <input id="photo" type="url" placeholder="https://" className="input" {...register('photo')} />
        </div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn w-full" disabled={isSubmitting}>Додати книгу</button>
      </form>

      <section>
        <h1 className="mb-4 font-serif text-2xl font-bold">Мої книги</h1>
        {!books ? <p>Завантаження…</p> : books.length === 0 ? (
          <p className="text-slate-600">У вас ще немає книг. Додайте першу — вона з’явиться в каталозі.</p>
        ) : (
          <ul className="space-y-3">
            {books.map((b) => (
              <li key={b.id} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-3">
                <Cover book={b} className="h-20 w-14 shrink-0 rounded" />
                <div className="mr-auto">
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-sm text-slate-600">{b.author}</p>
                </div>
                <button className="btn-danger" onClick={() => remove(b.id)}>Видалити</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
