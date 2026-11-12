import {
  Body, ConflictException, Controller, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser, JwtAuthGuard, publicUser } from './auth';
import { upload } from './books';
import { PrismaService } from './prisma.service';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
}

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async get(@CurrentUser() u: { id: number }) {
    const [user, booksCount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: u.id } }),
      this.prisma.book.count({ where: { ownerId: u.id } }),
    ]);
    return { ...publicUser(user!), booksCount };
  }

  @Patch()
  @UseInterceptors(upload)
  async update(
    @CurrentUser() u: { id: number },
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const email = dto.email?.toLowerCase();
    if (email) {
      const exists = await this.prisma.user.findUnique({ where: { email } });
      if (exists && exists.id !== u.id) throw new ConflictException('Цей email уже зайнятий');
    }
    const user = await this.prisma.user.update({
      where: { id: u.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(email && { email }),
        ...(file && { avatar: `/uploads/${file.filename}` }),
      },
    });
    return publicUser(user);
  }

  @Get('requests')
  requests(@CurrentUser() u: { id: number }) {
    return this.prisma.exchangeRequest.findMany({
      where: { receiverId: u.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { sender: { select: { id: true, name: true, email: true } } },
    });
  }

  @Post('requests/read')
  async markRead(@CurrentUser() u: { id: number }) {
    await this.prisma.exchangeRequest.updateMany({ where: { receiverId: u.id, read: false }, data: { read: true } });
    return { ok: true };
  }
}
