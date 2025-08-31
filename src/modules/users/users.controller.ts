import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateUserRoleDto } from './dto/role.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all users (ADMIN only)' })
  @ApiQuery({
    name: 'skip',
    required: false,
    schema: { type: 'integer', minimum: 0, default: 0 },
    description: 'Number of records to skip (pagination offset)',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
    description: 'Number of records to take (pagination limit, max 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'A paginated list of users (without sensitive fields)',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          fullName: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          company: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN role)' })
  async list(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
  ) {
    // normalize: negatif/çok büyük değerleri sınırlayalım
    const _skip = Math.max(0, skip);
    const _take = Math.min(Math.max(1, take), 100);
    return this.users.list({ skip: _skip, take: _take });
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get a user by ID (ADMIN only)' })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID/CUID)',
    example: 'ckv8r9b0c0000s9a1xyz12345',
  })
  @ApiResponse({
    status: 200,
    description: 'User found (without sensitive fields)',
  })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN role)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getOne(@Param('id') id: string) {
    return this.users.getPublicUserById(id);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a user role (ADMIN only)' })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID/CUID)',
    example: 'ckv8r9b0c0000s9a1xyz12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated user (without sensitive fields)',
  })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN role)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.users.updateUserRole(id, dto.role);
  }
}
