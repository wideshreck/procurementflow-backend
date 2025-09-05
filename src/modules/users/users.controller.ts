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
  Req,
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
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { UpdateUserCustomRoleDto } from './dto/role.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Permissions('users:list')
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
          customRole: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
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
  @Permissions('users:read')
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

  @Patch(':id/custom-role')
  @Permissions('users:update-role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a user custom role' })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID/CUID)',
    example: 'ckv8r9b0c0000s9a1xyz12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated user (without sensitive fields)',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User or CustomRole not found' })
  async updateCustomRole(@Param('id') id: string, @Body() dto: UpdateUserCustomRoleDto) {
    return this.users.updateUserCustomRole(id, dto.customRoleId);
  }

  @Get('company')
  @ApiOperation({ summary: 'List all users in the current user company' })
  @ApiResponse({
    status: 200,
    description: 'A list of users in the company (without sensitive fields)',
  })
  async listCompanyUsers(@Req() req) {
    const companyId = req.user.companyId;
    return this.users.listCompanyUsers(companyId);
  }
}
