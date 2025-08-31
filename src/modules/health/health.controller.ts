import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../auth/decorators/skip-csrf.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @SkipCsrf()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      cors: {
        allowedOrigins: process.env.CORS_ORIGIN || 'http://localhost:8080',
      }
    };
  }

  @Public()
  @SkipCsrf()
  @Get('cors-test')
  @ApiOperation({ summary: 'CORS test endpoint' })
  @ApiResponse({ status: 200, description: 'CORS test response' })
  corsTest() {
    return {
      message: 'CORS is working!',
      timestamp: new Date().toISOString(),
      headers: {
        'Access-Control-Allow-Origin': 'Should be set by CORS middleware',
        'Access-Control-Allow-Credentials': 'true'
      }
    };
  }
}