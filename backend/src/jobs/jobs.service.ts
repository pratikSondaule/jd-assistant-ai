import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { jobRequirements, jobs, JobStatus } from 'src/db/schema';
import { CreateJobDto } from './dto/createJob.dto';
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { jobSystemPrompt } from './prompts/job.prompt';
import { jobJsonSchema } from './schema/job.schema';

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

        console.log("Embedding ", embeddings);

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

}
