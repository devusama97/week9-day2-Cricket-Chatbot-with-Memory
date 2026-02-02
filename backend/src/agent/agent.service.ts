import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TestPlayer, OdiPlayer, T20Player } from '../database/player.schema';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, START, END } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

// Define the state schema
const AgentState = Annotation.Root({
    question: Annotation<string>(),
    userId: Annotation<string>(),
    sessionId: Annotation<string>(), // Added for threading
    isCricketRelated: Annotation<boolean>(),
    isGreeting: Annotation<boolean>(),
    format: Annotation<string>(), // 'test', 'odi', 't20'
    memorySummary: Annotation<string>(), // Perpetual summary
    recentHistory: Annotation<string[]>(), // Last few messages
    query: Annotation<any>(),
    queryResults: Annotation<any[]>(),
    answer: Annotation<string>(),
    executionSteps: Annotation<string[]>(), // To track current node for UI
});

import { Conversation, Summary } from '../database/history.schema';

@Injectable()
export class AgentService {
    private readonly logger = new Logger(AgentService.name);
    private model: ChatOpenAI;

    constructor(
        private configService: ConfigService,
        @InjectModel(TestPlayer.name) private testModel: Model<TestPlayer>,
        @InjectModel(OdiPlayer.name) private odiModel: Model<OdiPlayer>,
        @InjectModel(T20Player.name) private t20Model: Model<T20Player>,
        @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
        @InjectModel(Summary.name) private summaryModel: Model<Summary>,
    ) {
        const apiKey = this.configService.get('OPENROUTER_API_KEY') || this.configService.get('OPENAI_API_KEY');
        const modelName = this.configService.get('OPENROUTER_MODEL');

        if (!apiKey) {
            this.logger.error('OPENROUTER_API_KEY/OPENAI_API_KEY is not defined in .env');
        }

        this.model = new ChatOpenAI({
            apiKey: apiKey,
            modelName: modelName,
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
            },
            temperature: 0,
            maxRetries: 5,
            maxTokens: 1000,
        });
    }

    // Helper to clean LLM response and parse JSON
    private parseJSON(text: string) {
        try {
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            this.logger.error(`Failed to parse JSON: ${text}`);
            throw e;
        }
    }

    // Node 1: Relevancy Checker
    async relevancyChecker(state: typeof AgentState.State) {
        try {
            this.logger.log('Node: Relevancy Checker');
            const response = await this.model.invoke([
                new SystemMessage(`You are a cricket expert AI. Check if the user's question is:
          1. A greeting (Hi, Hello, etc.)
          2. About cricket stats, players, or matches.
          
          Respond with ONLY a JSON object: {"isCricketRelated": true/false, "isGreeting": true/false, "reason": "short explanation"}`),
                new HumanMessage(state.question),
            ]);

            const result = this.parseJSON(response.content as string);
            return {
                isCricketRelated: result.isCricketRelated,
                isGreeting: result.isGreeting,
                executionSteps: [...(state.executionSteps || []), 'Relevancy Checker']
            };
        } catch (error: any) {
            this.logger.error(`Error in relevancyChecker: ${error.message}`);
            throw error;
        }
    }

    // Node: Memory Retriever
    async memoryRetriever(state: typeof AgentState.State) {
        try {
            this.logger.log(`Node: Memory Retriever (Session: ${state.sessionId})`);
            const [summary, history] = await Promise.all([
                this.summaryModel.findOne({ userId: state.userId }), // Global user context
                this.conversationModel.find({ sessionId: state.sessionId }).sort({ createdAt: -1 }).limit(10).lean()
            ]);

            const historyText = history.reverse().map(c => `User: ${c.question}\nAI: ${c.answer}`).join('\n\n');

            return {
                memorySummary: summary?.content || '',
                recentHistory: historyText ? [historyText] : [],
                executionSteps: [...(state.executionSteps || []), 'Memory Retriever']
            };
        } catch (error: any) {
            this.logger.error(`Error in memoryRetriever: ${error.message}`);
            return { executionSteps: [...(state.executionSteps || []), 'Memory Retriever (Failed)'] };
        }
    }

    // Node 2: Query Generator
    async queryGenerator(state: typeof AgentState.State) {
        try {
            if (state.isGreeting || !state.isCricketRelated) return { executionSteps: [...(state.executionSteps || []), 'Query Generator (Skipped)'] };

            this.logger.log('Node: Query Generator');

            const testDoc = await this.testModel.findOne().lean();
            const odiDoc = await this.odiModel.findOne().lean();
            const t20Doc = await this.t20Model.findOne().lean();

            const filterKeys = (doc: any) => doc ? Object.keys(doc).filter(k => !['_id', '__v', ''].includes(k)) : ['Player', 'Runs', 'HS', 'Avg', 'SR'];

            const testKeys = filterKeys(testDoc);
            const odiKeys = filterKeys(odiDoc);
            const t20Keys = filterKeys(t20Doc);

            const systemPrompt = `You are a MongoDB query generator for cricket stats.
        We have 3 collections: 'test', 'odi', 't20'.
        
        Available fields in 'test': ${testKeys.join(', ')}
        Available fields in 'odi': ${odiKeys.join(', ')}
        Available fields in 't20': ${t20Keys.join(', ')}
        
        PERPETUAL SUMMARY: ${state.memorySummary || 'No past summary available.'}
        RECENT CHAT HISTORY: ${state.recentHistory || 'No recent history.'}
        
        IMPORTANT:
        1. Use $regex with case-insensitive flag ('i') for player names because the database might have names in ALL CAPS or with country suffixes (e.g. 'V Kohli (INDIA)' or 'ROHIT SHARMA').
        2. Example filter for Virat Kohli: {"Player": {"$regex": "Kohli", "$options": "i"}}
        3. Determine which collection to use based on the user's mention of format.
        
        Convert the user question into a MongoDB find query.
        Respond with ONLY a JSON object: 
        {
          "format": "test" | "odi" | "t20",
          "query": { "filter": {}, "sort": {}, "limit": 10 }
        }`;

            const response = await this.model.invoke([
                new SystemMessage(systemPrompt),
                new HumanMessage(state.question),
            ]);

            const result = this.parseJSON(response.content as string);
            return {
                format: result.format,
                query: result.query,
                executionSteps: [...(state.executionSteps || []), 'Query Generator']
            };
        } catch (error: any) {
            this.logger.error(`Error in queryGenerator: ${error.message}`);
            throw error;
        }
    }

    // Node 3: Query Executor
    async queryExecutor(state: typeof AgentState.State) {
        try {
            if (state.isGreeting || !state.isCricketRelated || !state.query) return state;

            this.logger.log(`Node: Query Executor (Format: ${state.format})`);

            let model;
            if (state.format === 'test') model = this.testModel;
            else if (state.format === 'odi') model = this.odiModel;
            else model = this.t20Model;

            const { filter, sort, limit } = state.query;
            const results = await model.find(filter).sort(sort).limit(limit || 10).lean();

            return {
                queryResults: results,
                executionSteps: [...(state.executionSteps || []), 'Query Executor']
            };
        } catch (error: any) {
            this.logger.error(`Error in queryExecutor: ${error.message}`);
            throw error;
        }
    }

    // Node 4: Answer Formatter
    async answerFormatter(state: typeof AgentState.State) {
        try {
            if (state.isGreeting) {
                const response = await this.model.invoke([
                    new SystemMessage(`You are a friendly cricket stats assistant. The user just greeted you. Greet them back politely and ask how you can help with cricket stats. Keep it short.`),
                    new HumanMessage(state.question),
                ]);
                return {
                    answer: response.content as string,
                    executionSteps: [...(state.executionSteps || []), 'Answer Formatter']
                };
            }

            if (!state.isCricketRelated) {
                return {
                    answer: "Sorry, I can only answer cricket-related questions.",
                    executionSteps: [...(state.executionSteps || []), 'Final Response']
                };
            }

            if (!state.queryResults || state.queryResults.length === 0) {
                return {
                    answer: "I couldn't find any data for that specific request in my database.",
                    executionSteps: [...(state.executionSteps || []), 'Final Response']
                };
            }

            this.logger.log(`Node: Answer Formatter (Results: ${state.queryResults.length})`);

            const isSingle = state.queryResults.length === 1;
            const prompt = isSingle
                ? `You are a cricket stats presenter. The search returned only ONE player. 
                   Provide a natural, friendly plain text response including all their key stats (Runs, Avg, SR, etc.). 
                   Do NOT mention any lists or tables. Just a smooth descriptive paragraph.
                   Note: Player names in the data might have country suffixes like '(INDIA)' or '(PAK)'. Feel free to clean these for the final response.
                   Data: ${JSON.stringify(state.queryResults[0])}`
                : `You are a cricket stats presenter. The search returned MULTIPLE players. 
                   Provide a VERY BRIEF summary of who was found (e.g. "I found 5 players with over 5000 runs"). 
                   Say that "the detailed list is provided in the table below".
                   CRITICAL: Do NOT list the players or their stats in your text response, because the frontend table will show all of them. ONLY provide the summary text.
                   Data: ${JSON.stringify(state.queryResults)}`;

            const response = await this.model.invoke([
                new SystemMessage(prompt),
                new HumanMessage(state.question),
            ]);

            return {
                answer: response.content as string,
                executionSteps: [...(state.executionSteps || []), 'Answer Formatter']
            };
        } catch (error: any) {
            this.logger.error(`Error in answerFormatter: ${error.message}`);
            throw error;
        }
    }

    // Node: Memory Saver
    async memorySaver(state: typeof AgentState.State) {
        try {
            if (!state.userId || !state.answer) return state;

            this.logger.log(`Node: Memory Saver (Session: ${state.sessionId})`);

            // Save new conversation entry
            await this.conversationModel.create({
                userId: state.userId,
                sessionId: state.sessionId,
                question: state.question,
                answer: state.answer,
                results: state.queryResults
            });

            // Check if we need to summarize (e.g., if history count > 10)
            const historyCount = await this.conversationModel.countDocuments({ userId: state.userId });
            if (historyCount >= 10) {
                this.logger.log('Triggering Summarization...');

                // Fetch everything to summarize
                const history = await this.conversationModel.find({ userId: state.userId }).sort({ createdAt: 1 }).lean();
                const historyStr = history.map(h => `User: ${h.question}\nAI: ${h.answer}`).join('\n\n');

                const summaryResponse = await this.model.invoke([
                    new SystemMessage(`You are a memory manager. Summarize the following cricket conversation into a very concise paragraph. 
                    Include player names and key stats mentioned so far.
                    Existing Summary: ${state.memorySummary || 'None'}`),
                    new HumanMessage(`New Conversation to summarize:\n${historyStr}`),
                ]);

                const newSummaryContent = summaryResponse.content as string;

                await this.summaryModel.findOneAndUpdate(
                    { userId: state.userId },
                    { content: newSummaryContent },
                    { upsert: true }
                );

                // Keep the last 3 most recent messages, delete others
                const recentMessages = await this.conversationModel.find({ userId: state.userId })
                    .sort({ createdAt: -1 })
                    .limit(3)
                    .select('_id')
                    .lean();

                const recentIds = recentMessages.map(m => m._id);

                await this.conversationModel.deleteMany({
                    userId: state.userId,
                    _id: { $nin: recentIds }
                });

                this.logger.log('Summarization complete. Kept 3 recent messages.');
            }

            return { executionSteps: [...(state.executionSteps || []), 'Memory Saved'] };
        } catch (error: any) {
            this.logger.error(`Error in memorySaver: ${error.message}`);
            return state;
        }
    }

    async *streamQuestion(question: string, userId: string = 'default-user', sessionId: string = 'default-session') {
        try {
            const workflow = new StateGraph(AgentState)
                .addNode('check_relevancy', (s) => this.relevancyChecker(s))
                .addNode('memory_retriever', (s) => this.memoryRetriever(s))
                .addNode('generate_query', (s) => this.queryGenerator(s))
                .addNode('execute_query', (s) => this.queryExecutor(s))
                .addNode('format_answer', (s) => this.answerFormatter(s))
                .addNode('memory_saver', (s) => this.memorySaver(s))
                .addEdge(START, 'check_relevancy')
                .addEdge('check_relevancy', 'memory_retriever')
                .addEdge('memory_retriever', 'generate_query')
                .addEdge('generate_query', 'execute_query')
                .addEdge('execute_query', 'format_answer')
                .addEdge('format_answer', 'memory_saver')
                .addEdge('memory_saver', END);

            const app = workflow.compile();
            const stream = await app.stream({ question, userId, sessionId });

            for await (const chunk of stream) {
                const nodeName = Object.keys(chunk)[0];
                const nodeData = (chunk as any)[nodeName];
                yield nodeData;

                // Add a small artificial delay so the UI can visually show the step change
                // Otherwise it's too fast for the user to see!
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        } catch (error: any) {
            this.logger.error(`Error in streamQuestion: ${error.message}`);
            throw error;
        }
    }
}
