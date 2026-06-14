import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting, Breakfast, Lunch, User } from '../../entities';
import { MealsController } from './meals.controller';
import { MealsService } from './meals.service';

@Module({
  imports: [TypeOrmModule.forFeature([Breakfast, Lunch, User, AppSetting])],
  controllers: [MealsController],
  providers: [MealsService],
})
export class MealsModule {}
