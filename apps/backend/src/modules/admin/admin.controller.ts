import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsString } from 'class-validator';

class UpdateSettingDto {
  @IsString() value!: string;
}
import {
  AdminStats,
  CategoryDto,
  CategoryStat,
  StaffPerformance,
  UserDto,
  UserRole,
} from '@officeping/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import {
  AddPersonDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  UpdateUserRoleDto,
} from './dto';

@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('stats')
  getStats(): Promise<AdminStats> {
    return this.service.getStats();
  }

  @Get('stats/by-category')
  getStatsByCategory(): Promise<CategoryStat[]> {
    return this.service.getStatsByCategory();
  }

  @Get('staff-performance')
  getStaffPerformance(): Promise<StaffPerformance[]> {
    return this.service.getStaffPerformance();
  }

  @Get('users')
  getUsers(): Promise<UserDto[]> {
    return this.service.getUsers();
  }

  @Post('users')
  addPerson(@Body() body: AddPersonDto): Promise<UserDto> {
    return this.service.addPerson(body);
  }

  @Patch('users/:id')
  updateUserRole(
    @Param('id') id: string,
    @Body() body: UpdateUserRoleDto,
  ): Promise<UserDto> {
    return this.service.updateUserRole(id, body);
  }

  // Categories — GET is PUBLIC so the New Request screen can load categories without admin role
  @Public()
  @Get('categories')
  getCategories(): Promise<CategoryDto[]> {
    return this.service.getCategories();
  }

  @Post('categories')
  createCategory(@Body() body: CreateCategoryDto): Promise<CategoryDto> {
    return this.service.createCategory(body);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.service.updateCategory(id, body);
  }

  @Get('settings')
  getSettings(): Promise<Record<string, string>> {
    return this.service.getSettings();
  }

  @Patch('settings/:key')
  async updateSetting(
    @Param('key') key: string,
    @Body() body: UpdateSettingDto,
  ): Promise<void> {
    await this.service.updateSetting(key, body.value);
  }
}
