import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Conversation extends Document {
    @Prop({ required: true, index: true })
    userId: string;

    @Prop({ required: true, index: true })
    sessionId: string;

    @Prop({ required: true })
    question: string;

    @Prop({ required: true })
    answer: string;

    @Prop({ type: [Object], required: false })
    results: any[];
}

@Schema({ timestamps: true })
export class Summary extends Document {
    @Prop({ required: true, index: true, unique: true })
    userId: string;

    @Prop({ required: true })
    content: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
export const SummarySchema = SchemaFactory.createForClass(Summary);
