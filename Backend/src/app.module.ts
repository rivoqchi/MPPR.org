import { Module } from '@nestjs/common';

import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { LoggerModule } from 'nestjs-pino';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

import { ErrorLogsService } from './modules/error-logs/error-logs.service';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { envValidationSchema } from './config/env.validation';

import { ApplicationsModule } from './modules/applications/applications.module';

import { DashboardModule } from './modules/dashboard/dashboard.module';

import { ErrorLogsModule } from './modules/error-logs/error-logs.module';

import { AppRolesModule } from './modules/app-roles/app-roles.module';

import { AuthModule } from './modules/auth/auth.module';

import { ChatModule } from './modules/chat/chat.module';

import { GuideVideosModule } from './modules/guide-videos/guide-videos.module';

import { FilesModule } from './modules/files/files.module';

import { DocumentsModule } from './modules/documents/documents.module';

import { HealthModule } from './modules/health/health.module';

import { NotificationsModule } from './modules/notifications/notifications.module';

import { PprCalendarModule } from './modules/ppr-calendar/ppr-calendar.module';

import { PprTypesModule } from './modules/ppr-types/ppr-types.module';

import { RegisteredObjectsModule } from './modules/registered-objects/registered-objects.module';

import { StructuralUnitsModule } from './modules/structural-units/structural-units.module';

import { UsersModule } from './modules/users/users.module';

import { WebsocketModule } from './modules/websocket/websocket.module';

import { PrismaModule } from './shared/prisma/prisma.module';

import { QueueModule } from './shared/queue/queue.module';

import { RedisModule } from './shared/redis/redis.module';



@Module({

  imports: [

    ConfigModule.forRoot({

      isGlobal: true,

      validationSchema: envValidationSchema,

    }),

    LoggerModule.forRootAsync({

      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({

        pinoHttp: {

          level: configService.get('NODE_ENV') === 'production' ? 'info' : 'debug',

          transport:

            configService.get('NODE_ENV') !== 'production'

              ? { target: 'pino-pretty', options: { singleLine: true } }

              : undefined,

        },

      }),

    }),

    ThrottlerModule.forRootAsync({

      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => [

        {

          ttl: configService.get<number>('THROTTLE_TTL', 60000),

          limit: configService.get<number>(
            'THROTTLE_LIMIT',
            configService.get('NODE_ENV') === 'production' ? 100 : 500,
          ),

        },

      ],

    }),

    PrismaModule,

    RedisModule,

    QueueModule,

    AuthModule,

    UsersModule,

    AppRolesModule,

    StructuralUnitsModule,

    RegisteredObjectsModule,

    PprTypesModule,

    PprCalendarModule,

    ApplicationsModule,

    DashboardModule,

    NotificationsModule,

    ChatModule,

    ErrorLogsModule,

    GuideVideosModule,

    FilesModule,

    DocumentsModule,

    WebsocketModule,

    HealthModule,

  ],

  providers: [

    {

      provide: APP_FILTER,

      useFactory: (errorLogsService: ErrorLogsService) =>
        new GlobalExceptionFilter(errorLogsService),

      inject: [ErrorLogsService],

    },

    {

      provide: APP_INTERCEPTOR,

      useClass: TransformInterceptor,

    },

    {

      provide: APP_GUARD,

      useClass: ThrottlerGuard,

    },

    {

      provide: APP_GUARD,

      useClass: JwtAuthGuard,

    },

  ],

})

export class AppModule {}

