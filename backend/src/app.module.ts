import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { SeedModule } from './seed/seed.module';
import { AgentModule } from './agent/agent.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        SeedModule,
        AgentModule,
        AuthModule,
        UsersModule,
    ],
})
export class AppModule { }
