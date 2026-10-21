import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PDFParse } from 'pdf-parse';
import { resumeSystemPrompt } from './prompt/resume.prompt';
import { resumeJsonSchema } from './schema/resume.schema';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { and, count, desc, eq } from 'drizzle-orm';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { EmbeddingStatus, resumeChunks, userResumes } from 'src/db/schema';

@Injectable()
export class ResumesService {
    private ai: ChatOllama;
    private embeddings: OllamaEmbeddings;
    private client: S3Client;

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

        this.client = new S3Client({
            region: "auto",
            endpoint: process.env.S3_ENPOINT,
            credentials: {
                accessKeyId: process.env.ACCESS_KEY_ID!,
                secretAccessKey: process.env.SECRET_ACCESS_KEY!,
            },
        })
    }

    async extractPdfText(file: Express.Multer.File) {
        const parser = new PDFParse({
            data: file.buffer
        });

        try {

            const result = await parser.getText()
            const text = result.text.trim();
            return text;

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while extracting resume", HttpStatus.INTERNAL_SERVER_ERROR)
        } finally {
            await parser.destroy();
        }
    }


    async uploadOnS3(file: Express.Multer.File) {

        const fileName = file?.originalname
        const fileExtenstion = fileName?.split(".").pop()?.toLowerCase();

        if (!fileExtenstion || !['pdf', 'doc', 'docx'].includes(fileExtenstion)) {
            throw new HttpException("Invalid file type. Only PDF, DOC and DOCX files are allowed.", HttpStatus.BAD_REQUEST);
        }

        const fileKey = `${process.env.RESUMES_FOLDER}/${Date.now()}.${fileExtenstion}`

        try {

            const command = new PutObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: fileKey,
                Body: file.buffer,
                ContentType: file.mimetype,
            });

            await this.client.send(command);

            return {
                fileName: file.originalname,
                fileKey: fileKey,
            };

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while uploading resume on s3", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }


    async uploadResume(
        request: any,
        file: Express.Multer.File
    ) {

        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        if (!file) {
            throw new HttpException("Please upload your resume", HttpStatus.BAD_REQUEST)
        }

        try {

            // Run PDF text extraction and S3 upload in parallel to reduce latency
            const [resumeText, s3Response] = await Promise.all([
                this.extractPdfText(file),
                this.uploadOnS3(file)
            ]);

            const extractedData: any = await this.extractResumeWithAi(resumeText);

            if (extractedData && extractedData.valid === false) {
                return {
                    status: false,
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: extractedData.message || "Invalid resume provided",
                };
            }

            const [resume] = await this.db.insert(userResumes).values({
                userId,
                fileName: s3Response?.fileName,
                fileKey: s3Response?.fileKey,
                resumeText,
                summary: extractedData?.summary,
                skills: extractedData?.skills,
                experience: extractedData?.experience,
                projects: extractedData?.projects,
                education: extractedData?.education,
                certificates: extractedData?.certificates,
                embeddingStatus: EmbeddingStatus.PENDING
            }).returning();

            // Run embedding asynchronously in background; does not block the response
            this.embedResume(resume).catch((err) => {
                console.error("Background embedResume error:", err);
            });

            return {
                status: true,
                statusCode: HttpStatus.CREATED,
                data: resume,
                message: "Resume uploaded successfully",
            }

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while uploading resume", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }


    async extractResumeWithAi(resumeText: string) {

        try {

            const structuredOutput = this.ai.withStructuredOutput(resumeJsonSchema)

            const response = await structuredOutput.invoke([
                {
                    role: 'system',
                    content: resumeSystemPrompt,
                },
                {
                    role: 'user',
                    content: resumeText
                }
            ])

            return response

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while extracting resume", HttpStatus.INTERNAL_SERVER_ERROR)
        }

    }


    buildResumeChunks(resume: any) {

        const chunks: {
            section: "experience" | "projects" | "skills" | "certificates";
            content: string;
        }[] = [];

        for (const e of resume.experience ?? []) {
            chunks.push({
                section: "experience",
                content: `${e.role} at ${e.company} (${e.duration}). ${e.responsibilities.join(" ")}`,
            });
        }

        for (const p of resume.projects ?? []) {
            chunks.push({
                section: "projects",
                content: `Project: ${p.name}. ${p.responsibilities.join(", ")} Tech: ${p.techStack.join(", ")}.`,
            });
        }

        if (resume.skills?.length) {
            chunks.push({ section: "skills", content: `Skills: ${resume.skills.join(", ")}` });
        }

        if (resume.certificates?.length) {
            chunks.push({
                section: "certificates",
                content: `Certifications: ${resume.certificates.join(", ")}`,
            });
        }

        return chunks;

    }


    async embedResume(resume: any) {
        try {
            const chunks = this.buildResumeChunks(resume);
            if (!chunks.length) throw new Error("No chunks produced");

            const vectors = await this.embeddings.embedDocuments(chunks.map((c) => c.content));
            if (vectors.length !== chunks.length) throw new Error("Embedding count mismatch");

            await this.db.transaction(async (tx) => {
                await tx.delete(resumeChunks).where(eq(resumeChunks.resumeId, resume.id));
                await tx.insert(resumeChunks).values(
                    chunks.map((c, i) => ({
                        resumeId: resume.id,
                        section: c.section,
                        content: c.content,
                        position: i,
                        embedding: vectors[i],
                    })),
                );
                await tx
                    .update(userResumes)
                    .set({ embeddingStatus: EmbeddingStatus.READY })
                    .where(eq(userResumes.id, resume.id));
            });

            return true;
        } catch (error) {
            console.error(error);
            await this.db
                .update(userResumes)
                .set({ embeddingStatus: EmbeddingStatus.FAILED })
                .where(eq(userResumes.id, resume.id));
            return false;
        }
    }


    async getUserResumes(
        request: any,
        page?: string,
        limit?: string
    ) {

        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        const pageNumber = page ? Number(page) : 1
        const limitNumber = limit ? Number(limit) : 10

        try {

            const [allUserResumes, [{ totalCount }]] = await Promise.all([
                this.db.select()
                    .from(userResumes)
                    .where(eq(userResumes.userId, userId))
                    .orderBy(desc(userResumes.createdAt))
                    .limit(limitNumber)
                    .offset((pageNumber - 1) * limitNumber),

                this.db.select({ totalCount: count() })
                    .from(userResumes)
                    .where(eq(userResumes.userId, userId))
            ])

            const lastPage = Math.ceil(totalCount / limitNumber);

            return {
                status: true,
                statusCode: HttpStatus.OK,
                data: allUserResumes,
                currentPage: pageNumber,
                hasNextPage: pageNumber < lastPage,
                hasPreviousPage: pageNumber > 1,
                lastPage: lastPage,
                totalCount: totalCount,
                message: "User resumes fetched successfully"
            }

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while fetching user resumes", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }


    async getResumeById(
        request: any,
        resumeId: string
    ) {
        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        if (!resumeId) {
            throw new HttpException("Resume id is required", HttpStatus.BAD_REQUEST)
        }

        try {
            const [resume] = await this.db.select()
                .from(userResumes)
                .where(
                    and(
                        eq(userResumes.id, resumeId),
                        eq(userResumes.userId, userId)
                    )
                );

            if (!resume) {
                return {
                    status: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: "User resume not found"
                }
            }

            return {
                status: true,
                statusCode: HttpStatus.OK,
                data: resume,
                message: "Resume fetched successfully"
            }

        } catch (error) {
            console.error(error);
            throw new HttpException("Something went wrong while fetching resume", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }


    async deleteResume(
        request: any,
        resumeId: string
    ) {

        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        if (!resumeId) {
            throw new HttpException("Resume id is required", HttpStatus.BAD_REQUEST)
        }

        try {
            const [resume] = await this.db.select()
                .from(userResumes)
                .where(
                    and(
                        eq(userResumes.id, resumeId),
                        eq(userResumes.userId, userId)
                    )
                );

            if (!resume) {
                return {
                    status: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: "User resume not found"
                }
            }

            const deleteResume = new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: `${resume.fileKey}`,
            });

            await this.client.send(deleteResume);

            await this.db.delete(resumeChunks)
                .where(eq(resumeChunks.resumeId, resumeId));

            await this.db.delete(userResumes)
                .where(eq(userResumes.id, resumeId));

            return {
                status: true,
                statusCode: HttpStatus.OK,
                message: "Resume deleted successfully"
            }

        } catch (error) {
            console.error(error);
            throw new HttpException("Something went wrong while deleting resume", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

}
