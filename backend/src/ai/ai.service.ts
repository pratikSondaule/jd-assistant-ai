import { GoogleGenAI } from '@google/genai';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { StartChatDto } from './dto/startChat.dto';
import { jdJsonSchema } from './jdSchema';
import { jdSystemPrompt } from './prompt';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { jobAnalysis } from '../db/schema/index';
import { and, count, desc, eq } from 'drizzle-orm';

@Injectable()
export class AiService {
    private ai: GoogleGenAI;

    constructor(
        @InjectDrizzle()
        private readonly db: NodePgDatabase
    ) {
        this.ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        })
    }

    async sendMessage(request: any, data: StartChatDto) {

        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        try {

            const interaction = await this.ai.interactions.create({
                model: process.env.GEMINI_AI_MODEL!,
                input: data.message,
                system_instruction: jdSystemPrompt,
                response_format: {
                    type: 'text',
                    mime_type: 'application/json',
                    schema: jdJsonSchema
                }
            });

            if (!interaction.output_text) {
                throw new Error("Gemini did not return any output");
            }

            const response = JSON.parse(interaction.output_text)

            if (!response.valid) {
                return {
                    status: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: response.message
                };
            }

            await this.db.insert(jobAnalysis).values({
                userId,
                jobDescription: data.message,
                jobTitle: response.jobTitle,
                company: response.company,
                location: response.location,
                experience: response.experience,
                salaryRange: response.salaryRange,
                employmentType: response.employmentType,
                responsibilities: response.responsibilities,
                requiredSkills: response.requiredSkills,
                niceToHaveSkills: response.niceToHaveSkills,
                education: response.education,
            }).returning();

            return {
                status: true,
                statusCode: HttpStatus.OK,
                response,
            };

        } catch (error) {
            console.error(error)
            throw new HttpException("Failed to generate response", HttpStatus.INTERNAL_SERVER_ERROR)
        }

    }


    async getJdAnalysisById(request: any, id: string) {

        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        try {
            const [jdAnalysis] = await this.db.select()
                .from(jobAnalysis)
                .where(
                    and(
                        eq(jobAnalysis.id, id),
                        eq(jobAnalysis.userId, userId)
                    )
                )

            if (!jdAnalysis) {
                return {
                    status: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: "Job description analysis not found"
                }
            }

            return {
                status: true,
                statusCode: HttpStatus.OK,
                data: jdAnalysis,
                message: "Fetched job analysis successfully"
            }
        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while fetching job analysis", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }


    async getAllJdAnalysis(
        request: any,
        page?: string,
        limit?: string
    ) {

        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        const pageNumber = page ? Math.max(1, Number(page)) : 1
        const limitNumber = limit ? Math.max(1, Number(limit)) : 10

        try {

            const [allJdAnalysis, [{ totalCount }]] = await Promise.all([
                this.db.select()
                    .from(jobAnalysis)
                    .where(eq(jobAnalysis.userId, userId))
                    .orderBy(desc(jobAnalysis.createdAt))
                    .limit(limitNumber)
                    .offset((pageNumber - 1) * limitNumber),

                this.db.select({ totalCount: count() })
                    .from(jobAnalysis)
                    .where(eq(jobAnalysis.userId, userId)),
            ])

            const lastPage = Math.ceil(totalCount / limitNumber)

            return {
                status: true,
                statusCode: HttpStatus.OK,
                data: allJdAnalysis,
                currentPage: pageNumber,
                hasNextPage: pageNumber < lastPage,
                hasPreviousPage: pageNumber > 1,
                lastPage: lastPage,
                totalCount: totalCount,
                message: "Fetched all job analysis successfully"
            }

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while fetching all job analysis", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

}
