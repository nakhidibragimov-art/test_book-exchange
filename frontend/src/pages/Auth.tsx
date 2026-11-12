import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { api, errMsg } from '../api';
import { useAuth } from '../store';

interface Form { name?: string; email: string; password: string }

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const isReg = mode === 'register';
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>();
  const [error, setError] = useState('');
  const setAuth = useAuth((s) => s.setAuth);
  const nav = useNavigate();

  const onSubmit = async (data: Form) => {
    setError('');
    try {
      const { data: res } = await api.post(`/auth/${mode}`, data);
      setAuth(res.token, res.user);
      nav('/books');
    } catch (e) { setError(errMsg(e)); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="font-serif text-2xl font-bold">{isReg ? 'Створити акаунт' : 'Вхід'}</h1>
      {isReg && (
        <div>
          <label className="label" htmlFor="name">Ім’я</label>
          <input id="name" className="input" {...register('name', { required: 'Вкажіть ім’я', minLength: { value: 2, message: 'Мінімум 2 символи' } })} />
          {errors.name && <p className="err">{errors.name.message}</p>}
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" className="input" {...register('email', { required: 'Вкажіть email' })} />
        {errors.email && <p className="err">{errors.email.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="password">Пароль</label>
        <input id="password" type="password" className="input" {...register('password', { required: 'Вкажіть пароль', minLength: { value: 6, message: 'Мінімум 6 символів' } })} />
        {errors.password && <p className="err">{errors.password.message}</p>}
      </div>
      {!isReg && (
        <p className="text-sm"><Link className="text-teal-800 underline" to="/forgot-password">Забули пароль?</Link></p>
      )}
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn w-full" disabled={isSubmitting}>{isReg ? 'Зареєструватися' : 'Увійти'}</button>
      <p className="text-sm text-slate-600">
        {isReg ? <>Уже є акаунт? <Link className="text-teal-800 underline" to="/login">Увійти</Link></> : <>Немає акаунта? <Link className="text-teal-800 underline" to="/register">Зареєструватися</Link></>}
      </p>
    </form>
  );
}
