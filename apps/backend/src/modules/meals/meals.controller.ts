import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BreakfastDto, LunchDto } from '@officeping/shared';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CreateBreakfastDto,
  CreateLunchDto,
  MealDateQueryDto,
  UpdateBreakfastStatusDto,
} from './dto';
import { MealsService } from './meals.service';

@Controller('meals')
export class MealsController {
  constructor(private readonly service: MealsService) {}

  @Post('breakfast')
  createBreakfast(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateBreakfastDto,
  ): Promise<BreakfastDto> {
    return this.service.createBreakfast(user, body);
  }

  @Get('breakfast')
  getBreakfast(
    @CurrentUser() user: AuthUser,
    @Query() query: MealDateQueryDto,
  ): Promise<BreakfastDto[]> {
    return this.service.getBreakfast(user, query);
  }

  @Patch('breakfast/:id')
  updateBreakfastStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateBreakfastStatusDto,
  ): Promise<BreakfastDto> {
    return this.service.updateBreakfastStatus(id, user, body);
  }

  @Post('lunch')
  upsertLunch(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateLunchDto,
  ): Promise<LunchDto> {
    return this.service.upsertLunch(user, body);
  }

  @Get('lunch')
  getLunch(
    @CurrentUser() user: AuthUser,
    @Query() query: MealDateQueryDto,
  ): Promise<LunchDto[]> {
    return this.service.getLunch(user, query);
  }
}
