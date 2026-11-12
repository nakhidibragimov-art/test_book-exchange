import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, errMsg } from '../api';
import { Role, useAuth } from '../store';

interface Row { id: number; name: string; email: string; role: Role; _count: { books: number } }
interface Form { name: string; email: string; password: string; role: Role }

export default function Admin() {
  const me = useAuth((s) => s.user);
  const [users, setUsers] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ defaultValues: { role: 'USER' } });

  const load = () => api.get<Row[]>('/users').then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const create = async (v: Form) => {
    setError('');
    try { await api.post('/users', v); reset(); setOpen(false); load(); }
    catch (e) { setError(errMsg(e)); }
  };
  const setRole = async (id: number, role: Role) => {
    try { await api.patch(`/users/${id}`, { role }); load(); } catch (e) { alert(errMsg(e)); }
  };
  const remove = async (id: number) => {
    if (!confirm('Видалити користувача разом з його книгами?')) return;
    await api.delete(`/users/${id}`);
    load();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">Користувачі</h1>
        <button className="btn" onClick={() => setOpen(!open)}>{open ? 'Закрити' : 'Додати користувача'}</button>
      </div>

      {open && (
        <form onSubmit={handleSubmit(create)} className="mb-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="n">Ім’я</label>
            <input id="n" className="input" {...register('name', { required: 'Вкажіть ім’я' })} />
            {errors.name && <p className="err">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="e">Email</label>
            <input id="e" type="email" className="input" {...register('email', { required: 'Вкажіть email' })} />
            {errors.email && <p className="err">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="p">Пароль</label>
            <input id="p" type="password" className="input" {...register('password', { required: 'Вкажіть пароль', minLength: { value: 6, message: 'Мінімум 6 символів' } })} />
            {errors.password && <p className="err">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="r">Роль</label>
            <select id="r" className="input" {...register('role')}><option value="USER">User</option><option value="ADMIN">Admin</option></select>
          </div>
          {error && <p className="err sm:col-span-2" role="alert">{error}</p>}
          <button className="btn sm:col-span-2 sm:w-fit">Створити</button>
        </form>
      )}

      {!users ? <p>Завантаження…</p> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><th className="p-3">Ім’я</th><th className="p-3">Email</th><th className="p-3">Роль</th><th className="p-3">Книг</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <select className="input w-auto py-1" aria-label={`Роль ${u.name}`} value={u.role} disabled={u.id === me?.id} onChange={(e) => setRole(u.id, e.target.value as Role)}>
                      <option value="USER">User</option><option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="p-3">{u._count.books}</td>
                  <td className="p-3 text-right">{u.id !== me?.id && <button className="btn-danger" onClick={() => remove(u.id)}>Видалити</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
