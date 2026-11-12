import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Role, useAuth } from './store';
import Auth from './pages/Auth';
import Books from './pages/Books';
import BookDetail from './pages/BookDetail';
import MyBooks from './pages/MyBooks';
import Admin from './pages/Admin';
import Welcome from './pages/Welcome';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { photoSrc } from './api';

function Protected({ role, children }: { role?: Role; children: JSX.Element }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/books" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
        <Link to="/books" className="mr-auto font-serif text-xl font-bold text-teal-800">Обмін книгами</Link>
        <Link to="/books" className="text-sm hover:underline">Книги</Link>
        {user ? (
          <>
            <Link to="/me/books" className="text-sm hover:underline">Мої книги</Link>
            {user.role === 'ADMIN' && <Link to="/admin" className="text-sm hover:underline">Адмін</Link>}
            <Link to="/profile" className="flex items-center gap-2 text-sm hover:underline">
              {user.avatar
                ? <img src={photoSrc(user.avatar)!} alt="" className="h-7 w-7 rounded-full object-cover" />
                : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">{user.name[0]?.toUpperCase()}</span>}
              {user.name}
            </Link>
            <button className="btn-ghost" onClick={() => { logout(); nav('/login'); }}>Вийти</button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-sm hover:underline">Увійти</Link>
            <Link to="/register" className="btn">Реєстрація</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/books" element={<Books />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/me/books" element={<Protected><MyBooks /></Protected>} />
          <Route path="/admin" element={<Protected role="ADMIN"><Admin /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<p>Сторінку не знайдено.</p>} />
        </Routes>
      </main>
    </>
  );
}
