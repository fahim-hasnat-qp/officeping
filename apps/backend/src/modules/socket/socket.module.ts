import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Request } from '../../entities';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Request])],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
