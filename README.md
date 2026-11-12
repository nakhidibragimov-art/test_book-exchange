# Сервіс обміну книгами

**Стек:** React + TypeScript + Tailwind (Vite, Zustand, react-hook-form) · NestJS + TypeScript + Prisma + PostgreSQL · JWT · Nodemailer.

## Запуск

```bash
docker compose up -d                  # Postgres на :5432

cd backend
cp .env.example .env                  # за потреби змініть JWT_SECRET / SMTP
npm install
npx prisma migrate dev --name init    # створює таблиці
npm run seed                          # адмін: admin@example.com / admin123
npm run start:dev                     # API на http://localhost:3000

cd ../frontend
cp .env.example .env
npm install
npm run dev                           # http://localhost:5173
```

Пошта реальна: у `backend/.env` обов'язково заповніть `SMTP_*` (Gmail: пароль застосунку на myaccount.google.com/apppasswords). Без SMTP API повертає 503 на запит обміну. При старті бекенд перевіряє підключення до SMTP.

## API

| Метод | Шлях | Доступ |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | усі |
| GET | `/auth/me` | авторизований |
| GET | `/books?search=&order=asc\|desc&page=&limit=` | усі (пагінація на бекенді) |
| GET | `/books/:id` | усі |
| GET / POST | `/me/books` (POST: multipart `name`, `author`, `file` або `photo`-URL) | User |
| DELETE | `/books/:id` | власник або Admin |
| POST | `/books/:id/exchange` | User (не на свою книгу) |
| GET / POST / PATCH / DELETE | `/users` | лише Admin |
| GET / PATCH | `/profile` (PATCH: multipart `name`, `email`, `file`) | User |
| GET / POST | `/profile/requests`, `/profile/requests/read` | User |
| POST | `/auth/forgot-password`, `/auth/reset-password` | усі |

## Рішення та припущення
- Нова реєстрація завжди має роль `USER`; адмін створюється seed-скриптом або іншим адміном.
- Запит на обмін вимагає, щоб у відправника була хоча б одна книга (у листі йде їхній список). `Reply-To` листа — email відправника.
- Файли обкладинок зберігаються локально в `backend/uploads` (≤ 5 МБ, лише JPEG/PNG/WebP; розширення визначається за mimetype).
- Rate limit (`@nestjs/throttler`, за IP): `/auth/login` — 10/хв, `/auth/forgot-password` — 3/10 хв, `/books/:id/exchange` — 5/10 хв; перевищення → 429.
- Глобальний фільтр помилок Prisma: P2002 → 409, P2025 → 404.
- Бекенд-модулі спрощено до плоскої структури (`auth.ts`, `books.ts`, `users.ts`) для компактності.
- `/profile`: ім'я, email, аватар, кількість книг, вхідні запити на обмін (нові виділені). Запит записується в БД лише після успішної відправки листа.
- `/forgot-password` → лист із посиланням `/reset-password?token=…` (діє 1 год, у БД лише SHA-256 хеш токена).
