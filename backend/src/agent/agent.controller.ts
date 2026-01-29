import { Controller, Post, Body, Res } from '@nestjs/common';
import { AgentService } from './agent.service';
import * as express from 'express';

@Controller('ask')
export class AgentController {
    constructor(private readonly agentService: AgentService) { }

    @Post()
    async askQuestion(@Body('question') question: string, @Res() res: any): Promise<void> {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        try {
            if (!question) {
                res.write(JSON.stringify({ error: 'Question is required' }) + '\n');
                return res.end();
            }

            const stream = this.agentService.streamQuestion(question);
            for await (const chunk of stream) {
                res.write(JSON.stringify(chunk) + '\n');
                // Express usually flushes automatically for chunked encoding, 
                // but some environments might need a hint.
            }
            res.end();
        } catch (error: any) {
            console.error('Error in AgentController:', error);
            res.write(JSON.stringify({ error: error.message }) + '\n');
            res.end();
        }
    }
}
