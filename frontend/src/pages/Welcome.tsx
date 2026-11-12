import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../store';

function BookCover({ title, author, className }: { title: string; author: string; className: string }) {
  return (
    <div className={`absolute left-1/2 top-1/2 -ml-16 -mt-24 flex h-48 w-32 flex-col justify-between rounded-r-md rounded-l-sm border-l-8 p-3 shadow-lg ${className}`}>
      <p className="font-serif text-lg font-bold leading-tight">{title}</p>
      <p className="text-xs opacity-80">{author}</p>
    </div>
  );
}

export default function Welcome() {
  const user = useAuth((s) => s.user);
  if (user) return <Navigate to="/books" replace />;

  return (
    <section className="flex flex-col items-center py-6 text-center">
      <div className="relative mb-10 h-72 w-full max-w-md" aria-hidden="true">
        <BookCover title="Кобзар" author="Т. Шевченко" className="swap-a border-teal-900 bg-teal-700 text-white" />
        <BookCover title="Тіні забутих предків" author="М. Коцюбинський" className="swap-b border-amber-800 bg-amber-200 text-amber-950" />
      </div>

      <h1 className="rise font-serif text-4xl font-bold sm:text-5xl" style={{ animationDelay: '0.2s' }}>
        Прочитав — обміняй
      </h1>
      <p className="rise mt-4 max-w-md text-lg text-slate-600" style={{ animationDelay: '0.5s' }}>
        Додайте книги з власної полиці, знайдіть чужі та домовтеся про обмін напряму з власником.
      </p>
      <div className="rise mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: '0.8s' }}>
        <Link to="/register" className="btn px-6 py-3 text-base">Зареєструватися</Link>
        <Link to="/books" className="btn-ghost px-6 py-3 text-base">Переглянути каталог</Link>
      </div>
    </section>
  );
}
