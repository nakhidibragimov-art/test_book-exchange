import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from './prisma.service';
import { MailService } from './mail.service';
import { AuthController, AuthService, JwtStrategy } from './auth';
import { BooksController, BooksService } from './books';
import { UsersController, UsersService } from './users';
import { ProfileController } from './profile';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: process.env.JWT_SECRET, signOptions: { expiresIn: '7d' } }),
  ],
  controllers: [AuthController, BooksController, UsersController, ProfileController],
  providers: [PrismaService, MailService, AuthService, JwtStrategy, BooksService, UsersService],
})
export class AppModule {}
