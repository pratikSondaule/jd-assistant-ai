import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { jobRequirements, jobs, JobStatus, UserRole } from 'src/db/schema';
import { CreateJobDto } from './dto/createJob.dto';
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { jobSystemPrompt } from './prompts/job.prompt';
import { jobJsonSchema } from './schema/job.schema';
import { and, count, desc, eq } from 'drizzle-orm';

@Injectable()
export class JobsService {
    private ai: ChatOllama;
    private embeddings: OllamaEmbeddings;

    constructor(
        @InjectDrizzle()
        private readonly db: NodePgDatabase
    ) {
        this.ai = new ChatOllama({
            model: "llama3.2:1b",
            baseUrl: "http://localhost:11434",
            temperature: 0.1,
        });

        this.embeddings = new OllamaEmbeddings({
            model: "nomic-embed-text",
            baseUrl: "http://localhost:11434",
        });
    }

    async createJob(request: any, data: CreateJobDto) {

        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        const extractedResponse = await this.extractJobRequirements(data.description)

        const reqs = [
            ...extractedResponse.requiredSkills.map((text) => ({ text, type: "required_skill" as const })),
            ...extractedResponse.niceToHaveSkills.map((text) => ({ text, type: "nice_to_have" as const })),
            ...extractedResponse.responsibilities.map((text) => ({ text, type: "responsibility" as const })),
        ];

        const embeddings = await this.embeddings.embedDocuments(reqs.map((r) => r.text));

        try {

            const transaction = await this.db.transaction(async (tx) => {
                const [job] = await tx.insert(jobs).values({
                    createdBy: userId,
                    title: data.title,
                    company: data.company,
                    description: data.description,
                    location: data.location,
                    experience: data.experience,
                    education: data.education,
                    salaryRange: data.salaryRange,
                    employmentType: data.employmentType,
                    status: JobStatus.PUBLISHED
                }).returning();

                await tx.insert(jobRequirements).values(
                    reqs.map((r, i) => ({
                        jobId: job.id,
                        text: r.text,
                        type: r.type,
                        position: i,
                        embedding: embeddings[i]
                    })),
                );

                return job
            });

            return {
                status: true,
                statusCode: HttpStatus.OK,
                data: transaction,
                message: "Job created successfully"
            }
        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while creating job", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }


    async extractJobRequirements(jobDescription: string) {

        try {

            const structuredOutput = this.ai.withStructuredOutput(jobJsonSchema)

            const response = await structuredOutput.invoke([
                {
                    role: 'system',
                    content: jobSystemPrompt,
                },
                {
                    role: 'user',
                    content: jobDescription
                }
            ])

            return response

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while extracting job requirements", HttpStatus.INTERNAL_SERVER_ERROR)
        }

    }


    async getAllJobs(
        request: any,
        page?: string,
        limit?: string
    ) {

        const userId = request?.user?.id;
        const userRole = request?.user?.role;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        const pageNumber = page ? Number(page) : 1
        const limitNumber = limit ? Number(limit) : 10

        try {

            const whereCondition = userRole === UserRole.COMPANY
                ? eq(jobs.createdBy, userId)
                : undefined;

            const [allJobs, [{ totalCount }]] = await Promise.all([
                this.db.select()
                    .from(jobs)
                    .where(whereCondition)
                    .orderBy(desc(jobs.createdAt))
                    .limit(limitNumber)
                    .offset((pageNumber - 1) * limitNumber),

                this.db.select({ totalCount: count() })
                    .from(jobs)
                    .where(whereCondition),
            ])

            const lastPage = Math.ceil(totalCount / limitNumber)

            return {
                status: true,
                statusCode: HttpStatus.OK,
                data: allJobs,
                currentPage: pageNumber,
                hasNextPage: pageNumber < lastPage,
                hasPreviousPage: pageNumber > 1,
                lastPage: lastPage,
                totalCount: totalCount,
                message: "Fetched all jobs successfully"
            }

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while fetching all jobs", HttpStatus.INTERNAL_SERVER_ERROR)
        }

    }


    async getJobById(request: any, jobId: string) {

        const userId = request?.user?.id;
        const userRole = request?.user?.role;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        try {

            const whereCondition = userRole === UserRole.COMPANY
                ? and(eq(jobs.id, jobId), eq(jobs.createdBy, userId))
                : eq(jobs.id, jobId);

            const [job] = await this.db.select()
                .from(jobs)
                .where(whereCondition)

            if (!job) {
                return {
                    status: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: "Job not found"
                }
            }

            return {
                status: true,
                statusCode: HttpStatus.OK,
                data: job,
                message: "Job fetched successfully"
            }

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while fetching job", HttpStatus.INTERNAL_SERVER_ERROR)
        }

    }

}
