import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting, Category, Compliment, Request, User } from '../../entities';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Request, Compliment, Category, AppSetting])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
