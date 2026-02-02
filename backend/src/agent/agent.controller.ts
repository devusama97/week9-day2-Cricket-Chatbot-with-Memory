import { Controller, Post, Body, Res, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AgentService } from './agent.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation, Summary } from '../database/history.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
    constructor(
        private readonly agentService: AgentService,
        @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
        @InjectModel(Summary.name) private summaryModel: Model<Summary>,
    ) { }

    @Post('ask')
    async askQuestion(
        @Body('question') question: string,
        @Body('sessionId') sessionId: string,
        @Request() req: any,
        @Res() res: any
    ): Promise<void> {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        try {
            if (!question) {
                res.write(JSON.stringify({ error: 'Question is required' }) + '\n');
                return res.end();
            }

            const userId = req.user.userId;
            const stream = this.agentService.streamQuestion(question, userId, sessionId || `session-${Date.now()}`);
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

    @Get('sessions')
    async getSessions(@Request() req: any) {
        const userId = req.user.userId;
        // Return latest conversation for each sessionId to get a 'title' (the first question)
        const sessions = await this.conversationModel.aggregate([
            { $match: { userId } },
            { $sort: { createdAt: 1 } },
            {
                $group: {
                    _id: '$sessionId',
                    title: { $first: '$question' },
                    lastMessageAt: { $last: '$createdAt' }
                }
            },
            { $sort: { lastMessageAt: -1 } }
        ]);
        return sessions;
    }

    @Get('messages/:sessionId')
    async getMessages(@Param('sessionId') sessionId: string, @Request() req: any) {
        const userId = req.user.userId;
        return this.conversationModel.find({ sessionId, userId }).sort({ createdAt: 1 }).lean();
    }

    @Post('sessions/delete/:sessionId') // Using Post or Delete, standardizing on Delete would be better but keeping simple
    async deleteSession(@Param('sessionId') sessionId: string, @Request() req: any) {
        const userId = req.user.userId;
        return this.conversationModel.deleteMany({ sessionId, userId });
    }

    @Get('summary')
    async getSummary(@Request() req: any) {
        const userId = req.user.userId;
        return this.summaryModel.findOne({ userId }).lean();
    }
}
