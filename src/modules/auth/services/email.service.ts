import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'localhost'),
      port: this.config.get('SMTP_PORT', 587),
      secure: this.config.get('SMTP_SECURE', false),
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get('SMTP_FROM', 'noreply@procurementflow.com'),
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });
    } catch (error) {
      console.error('Email gönderimi başarısız:', error);
      // Don't throw - email failures shouldn't break the flow
    }
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${this.config.get('APP_URL')}/auth/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Email Doğrulama</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ProcurementFlow</h1>
          </div>
          <div class="content">
            <h2>Merhaba ${name},</h2>
            <p>ProcurementFlow'a hoş geldiniz! Hesabınızı aktifleştirmek için lütfen aşağıdaki butona tıklayın:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Email Adresimi Doğrula</a>
            </p>
            <p>Veya bu linki tarayıcınıza kopyalayın:</p>
            <p style="word-break: break-all; background-color: #eee; padding: 10px; font-size: 12px;">
              ${verificationUrl}
            </p>
            <p>Bu link 24 saat içinde geçerliliğini yitirecektir.</p>
            <p>Eğer bu hesabı siz oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
            <p>Saygılarımızla,<br>ProcurementFlow Ekibi</p>
          </div>
          <div class="footer">
            <p>Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
            <p>&copy; 2024 ProcurementFlow. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'ProcurementFlow - Email Doğrulama',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${this.config.get('APP_URL')}/auth/reset-password?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Şifre Sıfırlama</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .warning { background-color: #fff3cd; border: 1px solid #ffebc1; color: #856404; padding: 10px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Şifre Sıfırlama</h1>
          </div>
          <div class="content">
            <h2>Merhaba ${name},</h2>
            <p>Şifrenizi sıfırlamak için bir talepte bulundunuz. Aşağıdaki butona tıklayarak yeni şifrenizi oluşturabilirsiniz:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
            </p>
            <p>Veya bu linki tarayıcınıza kopyalayın:</p>
            <p style="word-break: break-all; background-color: #eee; padding: 10px; font-size: 12px;">
              ${resetUrl}
            </p>
            <div class="warning">
              <strong>Uyarı:</strong> Bu link güvenlik nedeniyle 1 saat içinde geçerliliğini yitirecektir.
            </div>
            <p>Eğer şifre sıfırlama talebinde bulunmadıysanız, hesabınıza yetkisiz erişim olabilir. Lütfen hemen şifrenizi değiştirin ve destek ekibimizle iletişime geçin.</p>
            <p>Saygılarımızla,<br>ProcurementFlow Güvenlik Ekibi</p>
          </div>
          <div class="footer">
            <p>Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
            <p>&copy; 2024 ProcurementFlow. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'ProcurementFlow - Şifre Sıfırlama',
      html,
    });
  }

  async sendLoginAlertEmail(email: string, name: string, ipAddress: string, userAgent?: string, location?: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Yeni Giriş Bildirimi</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ffc107; color: #333; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info-box { background-color: white; border: 1px solid #ddd; padding: 15px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yeni Giriş Tespit Edildi</h1>
          </div>
          <div class="content">
            <h2>Merhaba ${name},</h2>
            <p>Hesabınıza yeni bir giriş yapıldı. Detaylar:</p>
            <div class="info-box">
              <p><strong>Tarih/Saat:</strong> ${new Date().toLocaleString('tr-TR')}</p>
              <p><strong>IP Adresi:</strong> ${ipAddress}</p>
              ${userAgent ? `<p><strong>Cihaz/Tarayıcı:</strong> ${userAgent}</p>` : ''}
              ${location ? `<p><strong>Konum:</strong> ${location}</p>` : ''}
            </div>
            <p>Bu girişi siz yapmadıysanız:</p>
            <ol>
              <li>Hemen şifrenizi değiştirin</li>
              <li>İki faktörlü doğrulamayı aktifleştirin</li>
              <li>Destek ekibimizle iletişime geçin</li>
            </ol>
            <p>Güvenliğiniz bizim için önemli!</p>
            <p>Saygılarımızla,<br>ProcurementFlow Güvenlik Ekibi</p>
          </div>
          <div class="footer">
            <p>Bu otomatik bir güvenlik bildirimidir.</p>
            <p>&copy; 2024 ProcurementFlow. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'ProcurementFlow - Güvenlik Bildirimi: Yeni Giriş',
      html,
    });
  }

  async sendMfaEnabledEmail(email: string, name: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>İki Faktörlü Doğrulama Aktif</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .success-box { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>İki Faktörlü Doğrulama Aktif</h1>
          </div>
          <div class="content">
            <h2>Merhaba ${name},</h2>
            <div class="success-box">
              <strong>Tebrikler!</strong> Hesabınızda iki faktörlü doğrulama başarıyla aktifleştirildi.
            </div>
            <p>Bundan sonra hesabınıza giriş yaparken:</p>
            <ol>
              <li>Email ve şifrenizi girin</li>
              <li>Authenticator uygulamanızdaki 6 haneli kodu girin</li>
            </ol>
            <p><strong>Önemli:</strong> Yedek kodlarınızı güvenli bir yerde saklayın. Telefonunuzu kaybederseniz bu kodlarla giriş yapabilirsiniz.</p>
            <p>Saygılarımızla,<br>ProcurementFlow Güvenlik Ekibi</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 ProcurementFlow. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'ProcurementFlow - İki Faktörlü Doğrulama Aktifleştirildi',
      html,
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '').trim();
  }
}
