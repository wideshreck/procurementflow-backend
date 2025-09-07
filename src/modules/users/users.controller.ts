import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Delete,
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
import { AuthService } from '../auth/auth.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserCustomRoleDto } from './dto/role.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @Permissions('users:create')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() createUserDto: CreateUserDto) {
    const passwordHash = await this.authService.hashPassword(createUserDto.password);
    return this.users.createUser({ ...createUserDto, passwordHash });
  }

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
    @Query('searchTerm') searchTerm?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
  ) {
    // normalize: negatif/çok büyük değerleri sınırlayalım
    const _skip = Math.max(0, skip);
    const _take = Math.min(Math.max(1, take), 100);
    return this.users.list({
      skip: _skip,
      take: _take,
      searchTerm,
      role,
      status,
      department,
    });
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

  @Patch(':id')
  @Permissions('users:update')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.users.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @Permissions('users:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string) {
    return this.users.deleteUser(id);
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
