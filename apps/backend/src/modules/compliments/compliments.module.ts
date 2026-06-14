import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compliment, Request } from '../../entities';
import { PushModule } from '../push/push.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ComplimentsController } from './compliments.controller';
import { ComplimentsService } from './compliments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compliment, Request]),
    RealtimeModule,
    PushModule,
  ],
  controllers: [ComplimentsController],
  providers: [ComplimentsService],
})
export class ComplimentsModule {}
