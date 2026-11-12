import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { MailService } from './mail.service';
import { AuthController, AuthService, JwtStrategy } from './auth';
import { BooksController, BooksService } from './books';
import { UsersController, UsersService } from './users';
import { ProfileController } from './profile';

@Module({
  imports: [
    PassportModule,
    // Глобально ліміт не вмикається: ThrottlerGuard підключено лише на чутливих ендпоїнтах.
    // Це лише значення за замовчуванням, у кожному місці воно перевизначається через @Throttle.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
      errorMessage: 'Забагато запитів. Спробуйте трохи пізніше.',
    }),
    JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '7d' } }),
  ],
  controllers: [AuthController, BooksController, UsersController, ProfileController],
  providers: [PrismaService, MailService, AuthService, JwtStrategy, BooksService, UsersService],
})
export class AppModule {}
