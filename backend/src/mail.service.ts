import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private log = new Logger('Mail');
  private configured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  private port = Number(process.env.SMTP_PORT) || 587;
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: this.port,
    secure: this.port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: process.env.SMTP_ALLOW_SELF_SIGNED !== 'true' },
  });

  async onModuleInit() {
    if (!this.configured) {
      this.log.error('SMTP не налаштовано (SMTP_HOST, SMTP_USER, SMTP_PASS у .env) — листи не відправлятимуться');
      return;
    }
    try {
      await this.transporter.verify();
      this.log.log('SMTP підключено, пошта готова до відправки');
    } catch (e: any) {
      this.log.error(`Помилка підключення до SMTP: ${e.message}`);
    }
  }

  async send(to: string, subject: string, text: string, replyTo?: string) {
    if (!this.configured) throw new ServiceUnavailableException('Пошту не налаштовано на сервері');
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to, subject, text, replyTo,
      });
    } catch (e: any) {
      this.log.error(`Не вдалося надіслати лист для ${to}: ${e.message}`);
      throw new ServiceUnavailableException('Не вдалося надіслати лист. Спробуйте пізніше.');
    }
  }
}
