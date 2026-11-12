import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Перетворює відомі помилки Prisma на коректні HTTP-відповіді:
 *  P2002 (порушення унікальності) -> 409, P2025 (запис не знайдено) -> 404.
 * Решта помилок Prisma -> 500 без витоку деталей.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(e: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Внутрішня помилка сервера';

    if (e.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      const target = e.meta?.target;
      const fields = Array.isArray(target) ? target.join(',') : String(target ?? '');
      message = fields.includes('email')
        ? 'Користувач з таким email уже існує'
        : 'Запис з такими даними вже існує';
    } else if (e.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      message = 'Запис не знайдено';
    }

    res.status(status).json({ statusCode: status, message });
  }
}
