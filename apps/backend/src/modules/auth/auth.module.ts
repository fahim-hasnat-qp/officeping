import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compliment, Request, User } from '../../entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Request, Compliment])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
