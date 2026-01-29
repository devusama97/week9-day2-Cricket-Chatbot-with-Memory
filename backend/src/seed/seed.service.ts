import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TestPlayer, OdiPlayer, T20Player } from '../database/player.schema';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

@Injectable()
export class SeedService {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectModel(TestPlayer.name) private testModel: Model<TestPlayer>,
        @InjectModel(OdiPlayer.name) private odiModel: Model<OdiPlayer>,
        @InjectModel(T20Player.name) private t20Model: Model<T20Player>,
    ) { }

    async seedData() {
        const dataPath = path.join(__dirname, '..', '..', '..', 'data');

        const formats = [
            { file: 'test_players.csv', model: this.testModel, name: 'Test' },
            { file: 'odi_players.csv', model: this.odiModel, name: 'ODI' },
            { file: 't20_players.csv', model: this.t20Model, name: 'T20' },
        ];

        const results: any[] = [];

        for (const format of formats) {
            const filePath = path.join(dataPath, format.file);
            if (fs.existsSync(filePath)) {
                this.logger.log(`Seeding ${format.name} data from ${filePath}...`);
                await format.model.deleteMany({});

                const dataRows: any[] = [];
                await new Promise((resolve, reject) => {
                    fs.createReadStream(filePath)
                        .pipe(csv())
                        .on('data', (data) => {
                            const cleanedData: any = {};
                            for (const key in data) {
                                if (key === '') continue; // Skip CSV index columns with empty header
                                const value = data[key];
                                if (!isNaN(value as any) && (value as string).trim() !== '') {
                                    cleanedData[key] = Number(value);
                                } else {
                                    cleanedData[key] = value;
                                }
                            }
                            dataRows.push(cleanedData);
                        })
                        .on('end', async () => {
                            try {
                                if (dataRows.length > 0) {
                                    await format.model.insertMany(dataRows);
                                    this.logger.log(`Successfully seeded ${dataRows.length} rows for ${format.name}`);
                                    results.push({ format: format.name, count: dataRows.length, status: 'Success' });
                                } else {
                                    this.logger.warn(`No data found in ${format.file}`);
                                    results.push({ format: format.name, count: 0, status: 'No Data' });
                                }
                                resolve(true);
                            } catch (err) {
                                reject(err);
                            }
                        })
                        .on('error', (err) => reject(err));
                });
            } else {
                this.logger.warn(`File not found: ${filePath}`);
                results.push({ format: format.name, status: 'File Not Found' });
            }
        }

        return results;
    }
}
