import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api';

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (v: { email: string }) => {
    setError('');
    try { await api.post('/auth/forgot-password', v); setSent(true); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <div className="mx-auto max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="font-serif text-2xl font-bold">Відновлення пароля</h1>
      {sent ? (
        <p role="status">Якщо акаунт з таким email існує, ми надіслали лист із посиланням для зміни пароля. Воно діє 1 годину.</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" {...register('email', { required: 'Вкажіть email' })} />
            {errors.email && <p className="err">{errors.email.message}</p>}
          </div>
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn w-full" disabled={isSubmitting}>Надіслати посилання</button>
        </form>
      )}
      <p className="text-sm"><Link className="text-teal-800 underline" to="/login">Повернутися до входу</Link></p>
    </div>
  );
}
