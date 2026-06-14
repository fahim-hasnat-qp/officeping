import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compliment, Request, User } from '../../entities';
import { RealtimeModule } from '../realtime/realtime.module';
import { StaffController } from './staff.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Request, Compliment]), RealtimeModule],
  controllers: [StaffController],
})
export class StaffModule {}
