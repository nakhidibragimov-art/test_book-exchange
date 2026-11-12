import {
  Body, ConflictException, Controller, Delete, Get, Injectable, NotFoundException,
  Param, ParseIntPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { JwtAuthGuard, Roles, RolesGuard } from './auth';
import { PrismaService } from './prisma.service';

export class CreateUserDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsIn(['USER', 'ADMIN']) role?: 'USER' | 'ADMIN';
}
export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsIn(['USER', 'ADMIN']) role?: 'USER' | 'ADMIN';
}

const select = { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { books: true } } };

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list() { return this.prisma.user.findMany({ select, orderBy: { id: 'asc' } }); }

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email уже зайнятий');
    return this.prisma.user.create({
      data: { name: dto.name, email, role: dto.role ?? 'USER', password: await bcrypt.hash(dto.password, 10) },
      select,
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    if (!(await this.prisma.user.findUnique({ where: { id } }))) throw new NotFoundException();
    const { password, email, ...rest } = dto;
    return this.prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(email && { email: email.toLowerCase() }),
        ...(password && { password: await bcrypt.hash(password, 10) }),
      },
      select,
    });
  }

  async remove(id: number) {
    if (!(await this.prisma.user.findUnique({ where: { id } }))) throw new NotFoundException();
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private users: UsersService) {}
  @Get() list() { return this.users.list(); }
  @Post() create(@Body() dto: CreateUserDto) { return this.users.create(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) { return this.users.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.users.remove(id); }
}
