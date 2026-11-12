import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { api, errMsg, photoSrc } from '../api';
import { useAuth, User } from '../store';

interface Info extends User { booksCount: number }
interface Req {
  id: number; bookId: number | null; bookName: string; read: boolean; createdAt: string;
  sender: { id: number; name: string; email: string };
}
interface Form { name: string; email: string; file?: FileList }

export default function Profile() {
  const setUser = useAuth((s) => s.setUser);
  const [info, setInfo] = useState<Info | null>(null);
  const [reqs, setReqs] = useState<Req[] | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>();

  useEffect(() => {
    api.get<Info>('/profile').then((r) => { setInfo(r.data); reset({ name: r.data.name, email: r.data.email }); });
    api.get<Req[]>('/profile/requests').then((r) => {
      setReqs(r.data);
      if (r.data.some((x) => !x.read)) api.post('/profile/requests/read'); // позначаємо прочитаними після показу
    });
  }, [reset]);

  const onSubmit = async (v: Form) => {
    setMsg(null);
    const fd = new FormData();
    fd.append('name', v.name);
    fd.append('email', v.email);
    if (v.file?.[0]) fd.append('file', v.file[0]);
    try {
      const { data } = await api.patch<User>('/profile', fd);
      setUser(data);
      setInfo((i) => (i ? { ...i, ...data } : i));
      setMsg({ ok: true, text: 'Профіль збережено.' });
    } catch (e) { setMsg({ ok: false, text: errMsg(e) }); }
  };

  if (!info) return <p>Завантаження…</p>;
  const avatar = photoSrc(info.avatar ?? null);

  return (
    <div className="grid gap-8 md:grid-cols-[320px_1fr]">
      <form onSubmit={handleSubmit(onSubmit)} className="h-fit space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-4">
          {avatar
            ? <img src={avatar} alt="Аватар" className="h-16 w-16 rounded-full object-cover" />
            : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-2xl font-semibold text-teal-800">{info.name[0]?.toUpperCase()}</span>}
          <div>
            <h1 className="font-serif text-xl font-bold">Профіль</h1>
            <Link to="/me/books" className="text-sm text-teal-800 underline">Книг: {info.booksCount}</Link>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="name">Ім’я</label>
          <input id="name" className="input" {...register('name', { required: 'Вкажіть ім’я', minLength: { value: 2, message: 'Мінімум 2 символи' } })} />
          {errors.name && <p className="err">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" {...register('email', { required: 'Вкажіть email' })} />
          {errors.email && <p className="err">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="file">Новий аватар</label>
          <input id="file" type="file" accept="image/*" className="text-sm" {...register('file')} />
        </div>
        {msg && <p role="status" className={`text-sm ${msg.ok ? 'text-teal-800' : 'err'}`}>{msg.text}</p>}
        <button className="btn w-full" disabled={isSubmitting}>Зберегти зміни</button>
      </form>

      <section>
        <h2 className="mb-4 font-serif text-2xl font-bold">Запити на обмін</h2>
        {!reqs ? <p>Завантаження…</p> : reqs.length === 0 ? (
          <p className="text-slate-600">Запитів поки немає. Коли хтось захоче обмінятися на вашу книгу, це з’явиться тут.</p>
        ) : (
          <ul className="space-y-3">
            {reqs.map((r) => (
              <li key={r.id} className={`rounded-lg border p-4 ${r.read ? 'border-slate-200 bg-white' : 'border-teal-700 bg-teal-50'}`}>
                <p>
                  <span className="font-semibold">{r.sender.name}</span> хоче обмінятися на{' '}
                  {r.bookId ? <Link className="underline" to={`/books/${r.bookId}`}>«{r.bookName}»</Link> : <>«{r.bookName}»</>}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <a className="underline" href={`mailto:${r.sender.email}`}>{r.sender.email}</a>
                  {' · '}{new Date(r.createdAt).toLocaleString('uk-UA')}
                  {!r.read && ' · нове'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
