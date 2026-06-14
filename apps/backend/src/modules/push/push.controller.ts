import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/auth-user';
import { PushSubscription } from '../../entities';
import { PushSubscribeDto, PushUnsubscribeDto } from './dto';

@Controller('push')
export class PushController {
  constructor(
    @InjectRepository(PushSubscription)
    private readonly subs: Repository<PushSubscription>,
  ) {}

  @Post('subscribe')
  @HttpCode(200)
  async subscribe(
    @CurrentUser() user: AuthUser,
    @Body() body: PushSubscribeDto,
  ): Promise<{ ok: boolean }> {
    await this.subs.upsert(
      { userId: user.id, endpoint: body.endpoint, keys: body.keys },
      { conflictPaths: ['endpoint'], skipUpdateIfNoValuesChanged: true },
    );
    return { ok: true };
  }

  @Delete('unsubscribe')
  @HttpCode(200)
  async unsubscribe(
    @CurrentUser() user: AuthUser,
    @Body() body: PushUnsubscribeDto,
  ): Promise<{ ok: boolean }> {
    await this.subs.delete({ userId: user.id, endpoint: body.endpoint });
    return { ok: true };
  }
}
