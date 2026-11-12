import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errMsg } from '../api';

interface Form { password: string; confirm: string }

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<Form>();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (v: Form) => {
    setError('');
    try { await api.post('/auth/reset-password', { token, password: v.password }); setDone(true); }
    catch (e) { setError(errMsg(e)); }
  };

  if (!token) return <p>Посилання недійсне. <Link className="underline" to="/forgot-password">Запросити нове</Link></p>;

  return (
    <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="font-serif text-2xl font-bold">Новий пароль</h1>
      {done ? (
        <p role="status">Пароль змінено. <Link className="text-teal-800 underline" to="/login">Увійти</Link></p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label" htmlFor="password">Новий пароль</label>
            <input id="password" type="password" className="input" {...register('password', { required: 'Вкажіть пароль', minLength: { value: 6, message: 'Мінімум 6 символів' } })} />
            {errors.password && <p className="err">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="confirm">Повторіть пароль</label>
            <input id="confirm" type="password" className="input" {...register('confirm', { validate: (v) => v === getValues('password') || 'Паролі не збігаються' })} />
            {errors.confirm && <p className="err">{errors.confirm.message}</p>}
          </div>
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn w-full" disabled={isSubmitting}>Зберегти пароль</button>
        </form>
      )}
    </div>
  );
}
