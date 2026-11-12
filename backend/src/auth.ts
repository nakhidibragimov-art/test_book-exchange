import {
  BadRequestException, Body, CanActivate, ConflictException, Controller, ExecutionContext, Get, Injectable,
  Post, SetMetadata, UnauthorizedException, UseGuards, createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { createHash, randomBytes } from 'crypto';
import { MailService } from './mail.service';
import { PrismaService } from './prisma.service';

export class RegisterDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
}
export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

export class ForgotDto {
  @IsEmail() email: string;
}
export class ResetDto {
  @IsString() token: string;
  @IsString() @MinLength(6) password: string;
}

export const publicUser = (u: { id: number; name: string; email: string; role: string; avatar?: string | null }) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar ?? null,
});

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }
  async validate(payload: { sub: number }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    return publicUser(user);
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.get<string[]>('roles', ctx.getHandler()) ??
      this.reflector.get<string[]>('roles', ctx.getClass());
    if (!roles) return true;
    return roles.includes(ctx.switchToHttp().getRequest().user?.role);
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private mail: MailService) {}

  private token(user: { id: number; name: string; email: string; role: string; avatar?: string | null }) {
    return { token: this.jwt.sign({ sub: user.id }), user: publicUser(user) };
  }

  async forgot(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash: createHash('sha256').update(token).digest('hex'),
          resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000), 
        },
      });
      const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
      try {
        await this.mail.send(
          user.email,
          'Відновлення пароля',
          `Вітаємо, ${user.name}!\n\nЩоб задати новий пароль, перейдіть за посиланням (діє 1 годину):\n${link}\n\nЯкщо ви не просили відновлення, просто проігноруйте цей лист.`,
        );
      } catch {}
    }
    return { ok: true };
  }

  async reset(token: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetTokenHash: createHash('sha256').update(token).digest('hex'),
        resetTokenExpires: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Посилання недійсне або застаріле');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(password, 10), resetTokenHash: null, resetTokenExpires: null },
    });
    return { ok: true };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException('Користувач з таким email уже існує');
    const user = await this.prisma.user.create({
      data: { name: dto.name, email, password: await bcrypt.hash(dto.password, 10) },
    });
    return this.token(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Невірний email або пароль');
    return this.token(user);
  }
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  // 10 спроб входу на хвилину з однієї IP
  @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  // лист відправляється на email → 3 запити за 10 хвилин
  @UseGuards(ThrottlerGuard) @Throttle({ default: { limit: 3, ttl: 600_000 } })
  @Post('forgot-password') forgot(@Body() dto: ForgotDto) { return this.auth.forgot(dto.email); }
  @Post('reset-password') reset(@Body() dto: ResetDto) { return this.auth.reset(dto.token, dto.password); }
  @UseGuards(JwtAuthGuard) @Get('me') me(@CurrentUser() user: unknown) { return user; }
}
