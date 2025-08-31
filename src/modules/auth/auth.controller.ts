import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Param,
  Delete,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import {
  SignInDto,
  SignUpDto,
  TokenResponseDto,
  PasswordResetRequestDto,
  PasswordResetDto,
  ChangePasswordDto,
  EmailVerificationDto,
  MfaSetupResponseDto,
  MfaEnableDto,
  MfaDisableDto,
  SessionInfoDto,
  AuditLogDto,
  SuccessResponseDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RateLimit } from './decorators/rate-limit.decorator';
import { SkipCsrf } from './decorators/skip-csrf.decorator';
import { SecurityHeadersInterceptor } from './interceptors/security-headers.interceptor';
import { AUTH_CONSTANTS } from './constants/auth.constants';
import { SessionService } from './services/session.service';
import { AuditLogService } from './services/audit-log.service';
import type { User } from '@prisma/client';

@ApiTags('auth')
@Controller('auth')
@UseInterceptors(SecurityHeadersInterceptor)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly auditLogs: AuditLogService,
  ) {}

  @Public()
  @SkipCsrf()
  @Post('signup')
  @RateLimit({ points: 5, duration: 3600 }) // 5 requests per hour
  @ApiOperation({ summary: 'Yeni kullanıcı hesabı oluştur' })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({ status: 201, description: 'Kullanıcı oluşturuldu', type: TokenResponseDto })
  @ApiResponse({ status: 409, description: 'Email zaten kullanımda' })
  @ApiBadRequestResponse({ description: 'Geçersiz giriş verileri' })
  async signUp(
    @Body() body: SignUpDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<TokenResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await this.auth.signUp(body, ipAddress, userAgent);

    // Set cookies
    this.setAuthCookies(reply, result.tokens.refreshToken, result.tokens.csrfToken);

    return {
      user: result.user as any, // Cast to any to bypass strict type check for response
      tokens: result.tokens,
    };
  }

  @Public()
  @SkipCsrf()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ points: 10, duration: 900 }) // 10 attempts per 15 minutes
  @ApiOperation({ summary: 'Email ve şifre ile giriş yap' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({ status: 200, description: 'Başarılı giriş', type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Geçersiz kimlik bilgileri' })
  @ApiForbiddenResponse({ description: 'Hesap kilitli veya IP engellenmiş' })
  async signIn(
    @Body() body: SignInDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<TokenResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await this.auth.signIn(
      body.email,
      body.password,
      body.mfaCode,
      ipAddress,
      userAgent
    );

    // Check if MFA is required
    if ((result.user as any).mfaRequired) {
      return {
        user: { mfaRequired: true } as any,
        tokens: { accessToken: '', refreshToken: '', csrfToken: '' },
      };
    }

    // Set cookies
    this.setAuthCookies(reply, result.tokens.refreshToken, result.tokens.csrfToken);

    return {
      user: result.user as any, // Cast to any to bypass strict type check for response
      tokens: result.tokens,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Çıkış yap ve oturumu sonlandır' })
  @ApiResponse({ status: 200, description: 'Başarılı çıkış' })
  async logout(
    @CurrentUser() user: User & { sessionId: string },
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<SuccessResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    await this.auth.logout(user.sessionId, user.id, ipAddress, userAgent);

    // Clear cookies
    this.clearAuthCookies(reply);

    return { success: true, message: 'Başarıyla çıkış yapıldı' };
  }

  @Public()
  @SkipCsrf()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access token\'ı yenile' })
  @ApiResponse({ status: 200, description: 'Token yenilendi', type: TokenResponseDto })
  @ApiUnauthorizedResponse({ description: 'Geçersiz refresh token' })
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<TokenResponseDto> {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token bulunamadı');
    }

    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await this.auth.refreshTokens(refreshToken, ipAddress, userAgent);

    // Update cookies
    this.setAuthCookies(reply, result.tokens.refreshToken, result.tokens.csrfToken);

    return {
      user: result.user as any, // Cast to any to bypass strict type check for response
      tokens: result.tokens,
    };
  }

  @Public()
  @SkipCsrf()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email adresini doğrula' })
  @ApiBody({ type: EmailVerificationDto })
  @ApiResponse({ status: 200, description: 'Email doğrulandı' })
  @ApiBadRequestResponse({ description: 'Geçersiz veya süresi dolmuş token' })
  async verifyEmail(@Body() body: EmailVerificationDto): Promise<SuccessResponseDto> {
    await this.auth.verifyEmail(body.token);
    return { success: true, message: 'Email adresiniz başarıyla doğrulandı' };
  }

  @Public()
  @SkipCsrf()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ points: 3, duration: 3600 }) // 3 requests per hour
  @ApiOperation({ summary: 'Şifre sıfırlama talebi gönder' })
  @ApiBody({ type: PasswordResetRequestDto })
  @ApiResponse({ status: 200, description: 'Şifre sıfırlama emaili gönderildi' })
  async forgotPassword(
    @Body() body: PasswordResetRequestDto,
    @Req() req: FastifyRequest
  ): Promise<SuccessResponseDto> {
    const ipAddress = req.ip;
    await this.auth.requestPasswordReset(body.email, ipAddress);
    
    // Always return success to prevent email enumeration
    return { 
      success: true, 
      message: 'Eğer email sistemde kayıtlıysa, şifre sıfırlama linki gönderildi' 
    };
  }

  @Public()
  @SkipCsrf()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Şifreyi sıfırla' })
  @ApiBody({ type: PasswordResetDto })
  @ApiResponse({ status: 200, description: 'Şifre başarıyla sıfırlandı' })
  @ApiBadRequestResponse({ description: 'Geçersiz token veya zayıf şifre' })
  async resetPassword(
    @Body() body: PasswordResetDto,
    @Req() req: FastifyRequest
  ): Promise<SuccessResponseDto> {
    const ipAddress = req.ip;
    await this.auth.resetPassword(body.token, body.newPassword, ipAddress);
    return { success: true, message: 'Şifreniz başarıyla sıfırlandı' };
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Şifre değiştir' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Şifre değiştirildi' })
  @ApiUnauthorizedResponse({ description: 'Mevcut şifre yanlış' })
  @ApiBadRequestResponse({ description: 'Geçersiz yeni şifre' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() body: ChangePasswordDto,
    @Req() req: FastifyRequest
  ): Promise<SuccessResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    await this.auth.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
      ipAddress,
      userAgent
    );

    return { success: true, message: 'Şifreniz başarıyla değiştirildi' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mevcut kullanıcı bilgilerini getir' })
  @ApiResponse({ status: 200, description: 'Kullanıcı bilgileri' })
  @ApiUnauthorizedResponse({ description: 'Token geçersiz veya eksik' })
  me(@CurrentUser() user: User) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // ===== MFA ENDPOINTS =====
  @Get('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'İki faktörlü doğrulama kurulumu başlat' })
  @ApiResponse({ status: 200, description: 'MFA kurulum bilgileri', type: MfaSetupResponseDto })
  async setupMfa(@CurrentUser() user: User): Promise<MfaSetupResponseDto> {
    return this.auth.setupMfa(user.id);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'İki faktörlü doğrulamayı etkinleştir' })
  @ApiBody({ type: MfaEnableDto })
  @ApiResponse({ status: 200, description: 'MFA etkinleştirildi' })
  @ApiBadRequestResponse({ description: 'Geçersiz doğrulama kodu' })
  async enableMfa(
    @CurrentUser() user: User,
    @Body() body: MfaEnableDto,
    @Req() req: FastifyRequest
  ): Promise<SuccessResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    await this.auth.enableMfa(
      user.id,
      body.secret,
      body.verificationCode,
      body.backupCodes,
      ipAddress,
      userAgent
    );

    return { success: true, message: 'İki faktörlü doğrulama etkinleştirildi' };
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'İki faktörlü doğrulamayı devre dışı bırak' })
  @ApiBody({ type: MfaDisableDto })
  @ApiResponse({ status: 200, description: 'MFA devre dışı bırakıldı' })
  @ApiUnauthorizedResponse({ description: 'Geçersiz şifre' })
  async disableMfa(
    @CurrentUser() user: User,
    @Body() body: MfaDisableDto,
    @Req() req: FastifyRequest
  ): Promise<SuccessResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    await this.auth.disableMfa(user.id, body.password, ipAddress, userAgent);

    return { success: true, message: 'İki faktörlü doğrulama devre dışı bırakıldı' };
  }

  // ===== SESSION MANAGEMENT =====
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Aktif oturumları listele' })
  @ApiResponse({ status: 200, description: 'Oturum listesi', type: [SessionInfoDto] })
  async getSessions(
    @CurrentUser() user: User & { sessionId: string }
  ): Promise<SessionInfoDto[]> {
    const sessions = await this.sessions.getUserSessions(user.id);
    return sessions.map(session => ({
      ...session,
      isCurrent: session.id === user.sessionId,
    })) as any;
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Belirli bir oturumu sonlandır' })
  @ApiResponse({ status: 200, description: 'Oturum sonlandırıldı' })
  async revokeSession(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string
  ): Promise<SuccessResponseDto> {
    await this.sessions.revokeSession(sessionId);
    return { success: true, message: 'Oturum sonlandırıldı' };
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tüm diğer oturumları sonlandır' })
  @ApiResponse({ status: 200, description: 'Diğer oturumlar sonlandırıldı' })
  async revokeAllSessions(
    @CurrentUser() user: User & { sessionId: string }
  ): Promise<SuccessResponseDto> {
    await this.sessions.revokeAllUserSessions(user.id, user.sessionId);
    return { success: true, message: 'Diğer tüm oturumlar sonlandırıldı' };
  }

  // ===== AUDIT LOGS =====
  @Get('audit-logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Kullanıcının denetim günlüklerini getir' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Denetim günlükleri', type: [AuditLogDto] })
  async getAuditLogs(
    @CurrentUser() user: User,
    @Query('limit') limit?: string
  ): Promise<AuditLogDto[]> {
    const maxLimit = limit ? parseInt(limit, 10) : 50;
    const logs = await this.auditLogs.getUserAuditLogs(user.id, maxLimit);
    return logs as any;
  }

  // ===== HELPER METHODS =====
  private setAuthCookies(reply: FastifyReply, refreshToken: string, csrfToken: string) {
    reply.setCookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth',
    });

    reply.setCookie(AUTH_CONSTANTS.CSRF_TOKEN_COOKIE, csrfToken, {
      httpOnly: false, // Client needs to read this
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  private clearAuthCookies(reply: FastifyReply) {
    reply.clearCookie(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE, { path: '/api/auth' });
    reply.clearCookie(AUTH_CONSTANTS.CSRF_TOKEN_COOKIE, { path: '/' });
  }
}