import { Controller, Post, Body, Res, Get, Param } from '@nestjs/common';
import { AgentService } from './agent.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation, Summary } from '../database/history.schema';

@Controller('agent')
export class AgentController {
    constructor(
        private readonly agentService: AgentService,
        @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
        @InjectModel(Summary.name) private summaryModel: Model<Summary>,
    ) { }

    @Post('ask')
    async askQuestion(
        @Body('question') question: string,
        @Body('userId') userId: string,
        @Res() res: any
    ): Promise<void> {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        try {
            if (!question) {
                res.write(JSON.stringify({ error: 'Question is required' }) + '\n');
                return res.end();
            }

            const stream = this.agentService.streamQuestion(question, userId || 'default-user');
            for await (const chunk of stream) {
                res.write(JSON.stringify(chunk) + '\n');
            }
            res.end();
        } catch (error: any) {
            console.error('Error in AgentController:', error);
            res.write(JSON.stringify({ error: error.message }) + '\n');
            res.end();
        }
    }

    @Get('history/:userId')
    async getHistory(@Param('userId') userId: string) {
        return this.conversationModel.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
    }

    @Get('summary/:userId')
    async getSummary(@Param('userId') userId: string) {
        return this.summaryModel.findOne({ userId }).lean();
    }
}
