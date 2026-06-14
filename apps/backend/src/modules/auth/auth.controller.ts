import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthResponse, UserDto } from '@officeping/shared';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Compliment, Request } from '../../entities';
import { AuthService } from './auth.service';
import { DemoLoginDto, GoogleLoginDto, UpdateProfileDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @InjectRepository(Request) private readonly requests: Repository<Request>,
    @InjectRepository(Compliment) private readonly compliments: Repository<Compliment>,
  ) {}

  @Get('me/stats')
  async getMemberStats(@CurrentUser() user: AuthUser) {
    const now = new Date();
    const todayStart  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart   = new Date(todayStart); weekStart.setUTCDate(todayStart.getUTCDate() - 6);
    const monthStart  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Fetch only this month's requests for category breakdown + day-of-week chart
    const monthRequests = await this.requests
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.category', 'category')
      .where('r.requesterId = :uid', { uid: user.id })
      .andWhere('r.createdAt >= :monthStart', { monthStart })
      .orderBy('r.createdAt', 'ASC')
      .getMany();

    // Period counts from monthly slice
    const requestsThisMonth = monthRequests.length;
    const requestsThisWeek  = monthRequests.filter((r) => r.createdAt >= weekStart).length;
    const requestsToday     = monthRequests.filter((r) => r.createdAt >= todayStart).length;

    // Category breakdown — this month, top 5
    const catMap = new Map<string, { name: string; icon: string; count: number }>();
    for (const r of monthRequests) {
      const existing = catMap.get(r.category.id);
      if (existing) existing.count++;
      else catMap.set(r.category.id, { name: r.category.name, icon: r.category.icon, count: 1 });
    }
    const topCategories = [...catMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const [requestsSent, complimentsGiven] = await Promise.all([
      this.requests.count({ where: { requesterId: user.id } }),
      this.compliments.count({ where: { fromUserId: user.id } }),
    ]);

    return {
      requestsSent,
      requestsToday,
      requestsThisWeek,
      requestsThisMonth,
      complimentsGiven,
      topCategories,
    };
  }

  @Public()
  @Post('google')
  @HttpCode(200)
  google(@Body() body: GoogleLoginDto): Promise<AuthResponse> {
    return this.auth.googleLogin(body.idToken);
  }

  @Public()
  @Post('demo-login')
  @HttpCode(200)
  demoLogin(@Body() body: DemoLoginDto): Promise<AuthResponse> {
    return this.auth.demoLogin(body.email);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.auth.updateProfile(user.id, body);
  }
}
