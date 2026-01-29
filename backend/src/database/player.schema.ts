import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ strict: false, collection: 'test' })
export class TestPlayer extends Document { }

@Schema({ strict: false, collection: 'odi' })
export class OdiPlayer extends Document { }

@Schema({ strict: false, collection: 't20' })
export class T20Player extends Document { }

export const TestPlayerSchema = SchemaFactory.createForClass(TestPlayer);
export const OdiPlayerSchema = SchemaFactory.createForClass(OdiPlayer);
export const T20PlayerSchema = SchemaFactory.createForClass(T20Player);
