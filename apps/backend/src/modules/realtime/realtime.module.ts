import { Module } from '@nestjs/common';
import { SocketModule } from '../socket/socket.module';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [SocketModule],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
