import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheService } from './common/cache.service';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { dataSourceOptions } from './data-source';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { ComplimentsModule } from './modules/compliments/compliments.module';
import { MealsModule } from './modules/meals/meals.module';
import { PushModule } from './modules/push/push.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RequestsModule } from './modules/requests/requests.module';
import { SeedModule } from './modules/seed/seed.module';
import { SocketModule } from './modules/socket/socket.module';
import { StaffModule } from './modules/staff/staff.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot(dataSourceOptions),

    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const expiry = config.get<string>('JWT_EXPIRY') ?? '7d';
        return {
          secret: config.get<string>('JWT_SECRET') ?? 'changeme',
          signOptions: { expiresIn: expiry as unknown as number },
        };
      },
    }),

    // Feature modules
    AuthModule,
    SeedModule,
    SocketModule,
    RealtimeModule,
    PushModule,
    RequestsModule,
    MealsModule,
    ComplimentsModule,
    AdminModule,
    StaffModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    CacheService,
  ],
  exports: [CacheService],
})
export class AppModule {}
