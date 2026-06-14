import { Body, Controller, Get, Post } from '@nestjs/common';
import { ComplimentDto, UserRole } from '@officeping/shared';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ComplimentsService } from './compliments.service';
import { CreateComplimentDto } from './dto';

@Controller('compliments')
export class ComplimentsController {
  constructor(private readonly service: ComplimentsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateComplimentDto,
  ): Promise<ComplimentDto> {
    return this.service.create(user, body);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<ComplimentDto[]> {
    return this.service.findAll(user);
  }

  @Get('feed')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  getFeed(): Promise<ComplimentDto[]> {
    return this.service.getFeed();
  }
}
