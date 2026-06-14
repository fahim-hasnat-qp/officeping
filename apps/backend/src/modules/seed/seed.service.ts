import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DEMO_USERS, UserRole } from '@officeping/shared';
import { Repository } from 'typeorm';
import { User } from '../../entities';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const adminEmails = (this.config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    for (const email of adminEmails) {
      const existing = await this.users.findOneBy({ email });
      if (!existing) {
        await this.users.save(
          this.users.create({ email, name: email.split('@')[0], role: UserRole.ADMIN }),
        );
        this.logger.log(`Provisioned admin ${email}`);
      } else if (existing.role !== UserRole.ADMIN) {
        existing.role = UserRole.ADMIN;
        await this.users.save(existing);
        this.logger.log(`Promoted ${email} to admin`);
      }
    }

    if (this.config.get('DEMO_MODE') === 'true') {
      for (const demo of DEMO_USERS) {
        const existing = await this.users.findOneBy({ email: demo.email });
        if (!existing) {
          await this.users.save(
            this.users.create({ email: demo.email, name: demo.name, role: demo.role as UserRole }),
          );
          this.logger.log(`Seeded demo user ${demo.email}`);
        }
      }
    }
  }
}
