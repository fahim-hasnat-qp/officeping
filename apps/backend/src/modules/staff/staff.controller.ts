import { Body, Controller, Get, NotFoundException, Patch } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestStatus, UserDto, UserRole } from '@officeping/shared';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { toUserDto } from '../../common/mappers';
import { Compliment, Request, User } from '../../entities';
import { RealtimeService } from '../realtime/realtime.service';
import { StaffStatusDto } from './dto';

@Controller('staff')
export class StaffController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Request) private readonly requests: Repository<Request>,
    @InjectRepository(Compliment) private readonly compliments: Repository<Compliment>,
    private readonly realtime: RealtimeService,
  ) {}

  @Get('me/stats')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  async getMyStats(@CurrentUser() authUser: AuthUser): Promise<{ doneToday: number; doneThisMonth: number; compliments: number }> {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [doneToday, doneThisMonth, compliments] = await Promise.all([
      this.requests.count({ where: { staffId: authUser.id, status: RequestStatus.DONE, completedAt: MoreThanOrEqual(todayStart) } }),
      this.requests.count({ where: { staffId: authUser.id, status: RequestStatus.DONE, completedAt: MoreThanOrEqual(monthStart) } }),
      this.compliments.count({ where: { toStaffId: authUser.id } }),
    ]);

    return { doneToday, doneThisMonth, compliments };
  }

  @Patch('me/status')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  async updateStatus(
    @CurrentUser() authUser: AuthUser,
    @Body() body: StaffStatusDto,
  ): Promise<UserDto> {
    const user = await this.users.findOneBy({ id: authUser.id });
    if (!user) throw new NotFoundException('User not found');
    user.isOnline = body.isOnline;
    await this.users.save(user);
    this.realtime.emitStaffStatus(user.id, body.isOnline);
    return toUserDto(user);
  }
}
