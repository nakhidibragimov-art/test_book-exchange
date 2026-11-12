import 'dotenv/config';
import 'reflect-metadata';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './prisma-exception.filter';

async function bootstrap() {
  mkdirSync('uploads', { recursive: true });
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: process.env.CLIENT_URL || true });
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
    // браузер не має «вгадувати» тип файлу і виконувати його як HTML/скрипт
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
