import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TestPlayerSchema, OdiPlayerSchema, T20PlayerSchema } from './player.schema';
import { ConversationSchema, SummarySchema } from './history.schema';

@Module({
    imports: [
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('MONGODB_URI'),
            }),
            inject: [ConfigService],
        }),
        MongooseModule.forFeature([
            { name: 'TestPlayer', schema: TestPlayerSchema },
            { name: 'OdiPlayer', schema: OdiPlayerSchema },
            { name: 'T20Player', schema: T20PlayerSchema },
            { name: 'Conversation', schema: ConversationSchema },
            { name: 'Summary', schema: SummarySchema },
        ]),
    ],
    exports: [MongooseModule],
})
export class DatabaseModule { }
