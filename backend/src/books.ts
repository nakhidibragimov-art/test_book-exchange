import {
  BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Injectable,
  NotFoundException, Param, ParseIntPipe, Post, Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { diskStorage } from 'multer';
import { CurrentUser, JwtAuthGuard } from './auth';
import { MailService } from './mail.service';
import { PrismaService } from './prisma.service';

type AuthUser = { id: number; name: string; email: string; role: string };

export class CreateBookDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() author: string;
  @IsOptional() @IsString() photo?: string; 
}

// Дозволені типи; розширення береться з mimetype, а не з імені файлу від клієнта
const ALLOWED_IMAGES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const upload = FileInterceptor('file', {
  storage: diskStorage({
    destination: 'uploads',
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ALLOWED_IMAGES[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = Object.prototype.hasOwnProperty.call(ALLOWED_IMAGES, file.mimetype);
    cb(ok ? null : new BadRequestException('Дозволені лише зображення JPEG, PNG або WebP'), ok);
  },
});

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  private include = { owner: { select: { id: true, name: true } } };

  async list(q: { search?: string; page?: string; limit?: string; order?: string }) {
    const page = Math.max(1, parseInt(q.page || '1') || 1);
    const limit = Math.min(50, Math.max(1, parseInt(q.limit || '8') || 8));
    const search = q.search?.trim();
    const where = search
      ? { OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { author: { contains: search, mode: 'insensitive' as const } },
        ] }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.book.findMany({
        where, include: this.include,
        orderBy: [{ name: q.order === 'desc' ? 'desc' : 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.book.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async get(id: number) {
    const book = await this.prisma.book.findUnique({ where: { id }, include: this.include });
    if (!book) throw new NotFoundException('Книгу не знайдено');
    return book;
  }

  mine(userId: number) {
    return this.prisma.book.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'desc' } });
  }

  create(userId: number, dto: CreateBookDto, file?: Express.Multer.File) {
    const photo = file ? `/uploads/${file.filename}` : dto.photo || null;
    return this.prisma.book.create({ data: { name: dto.name, author: dto.author, photo, ownerId: userId } });
  }

  async remove(id: number, user: AuthUser) {
    const book = await this.get(id);
    if (book.ownerId !== user.id && user.role !== 'ADMIN')
      throw new ForbiddenException('Можна видаляти лише свої книги');
    await this.prisma.book.delete({ where: { id } });
    return { ok: true };
  }

  async requestExchange(id: number, sender: AuthUser) {
    const book = await this.prisma.book.findUnique({ where: { id }, include: { owner: true } });
    if (!book) throw new NotFoundException('Книгу не знайдено');
    if (book.ownerId === sender.id) throw new BadRequestException('Не можна запросити обмін на власну книгу');
    const mine = await this.mine(sender.id);
    if (!mine.length) throw new BadRequestException('Спершу додайте хоча б одну свою книгу для обміну');

    const list = mine.map((b, i) => `${i + 1}. «${b.name}» — ${b.author}`).join('\n');
    await this.mail.send(
      book.owner.email,
      `Запит на обмін книги «${book.name}»`,
      `Вітаємо, ${book.owner.name}!\n\n${sender.name} (${sender.email}) хоче обмінятися на вашу книгу «${book.name}».\n\nКниги, які він/вона пропонує:\n${list}\n\nВідповісти можна напряму на email відправника.`,
      sender.email,
    );
    await this.prisma.exchangeRequest.create({
      data: { bookId: book.id, bookName: book.name, senderId: sender.id, receiverId: book.ownerId },
    });
    return { ok: true };
  }
}

@Controller()
export class BooksController {
  constructor(private books: BooksService) {}

  @Get('books') list(@Query() q: any) { return this.books.list(q); }
  @Get('books/:id') get(@Param('id', ParseIntPipe) id: number) { return this.books.get(id); }

  @UseGuards(JwtAuthGuard) @Get('me/books')
  mine(@CurrentUser() u: AuthUser) { return this.books.mine(u.id); }

  @UseGuards(JwtAuthGuard) @Post('me/books') @UseInterceptors(upload)
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateBookDto, @UploadedFile() file?: Express.Multer.File) {
    return this.books.create(u.id, dto, file);
  }

  @UseGuards(JwtAuthGuard) @Delete('books/:id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) { return this.books.remove(id, u); }

  // кожен запит надсилає лист → 5 запитів за 10 хвилин
  @UseGuards(JwtAuthGuard, ThrottlerGuard) @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post('books/:id/exchange')
  exchange(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: AuthUser) {
    return this.books.requestExchange(id, u);
  }
}
