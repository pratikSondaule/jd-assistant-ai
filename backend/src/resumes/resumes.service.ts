import { GoogleGenAI } from '@google/genai';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PDFParse } from 'pdf-parse';
import { resumeSystemPrompt } from './prompt/resume.prompt';
import { resumeJsonSchema } from './schema/resume.schema';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { jobAnalysis, userResumes } from 'src/db/schema';
import { and, count, desc, eq } from 'drizzle-orm';
import { resumeMatchPrompt } from './prompt/resumeMatching.prompt';

@Injectable()
export class ResumesService {
    private ai: GoogleGenAI;
    private client: S3Client

    constructor(
        @InjectDrizzle()
        private readonly db: NodePgDatabase
    ) {
        this.ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        })

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

        const result = await parser.getText()
        const text = result.text.trim();

        if (!text) {
            throw new HttpException('Could not extract text from this PDF. It may be scanned or image-based.', HttpStatus.BAD_REQUEST);
        }

        return text;
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

            const resumeText = await this.extractPdfText(file);

            const s3Response = await this.uploadOnS3(file);

            await this.db.insert(userResumes).values({
                userId,
                fileName: s3Response?.fileName,
                fileKey: s3Response?.fileKey,
                resumeText
            }).returning()

            return {
                status: true,
                statusCode: HttpStatus.CREATED,
                message: "Resume uploaded successfully",
            }

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while uploading resume", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }


    async analyseResumeWithAi(
        request: any,
        resumeId: string
    ) {

        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        const userResume = await this.db.select({
            id: userResumes.id,
            resumeText: userResumes.resumeText
        })
            .from(userResumes)
            .where(eq(userResumes.id, resumeId));

        if (!userResume[0]) {
            throw new HttpException("User resume not found", HttpStatus.NOT_FOUND);
        }

        try {

            const interaction = await this.ai.interactions.create({
                model: process.env.GEMINI_AI_MODEL!,
                input: userResume[0].resumeText,
                system_instruction: resumeSystemPrompt,
                response_format: {
                    type: 'text',
                    mime_type: 'application/json',
                    schema: resumeJsonSchema
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
                    message: response?.message
                };
            }

            await this.db.update(userResumes).set({
                aiSummary: response.aiSummary,
                skills: response.skills,
                experience: response.experience,
                education: response.education,
                certificates: response.certificates,
            }).where(eq(userResumes.id, resumeId)).returning()

            return {
                status: true,
                statusCode: HttpStatus.OK,
                message: "Resume analysis completed successfully",
                response
            }

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while analysing resume", HttpStatus.INTERNAL_SERVER_ERROR)
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


    async getResumeMatchWithJob(
        request: any,
        resumeId: string,
        jobAnalysisId: string
    ) {
        const userId = request?.user?.id;

        if (!userId) {
            throw new HttpException("User not found", HttpStatus.UNAUTHORIZED)
        }

        if (!resumeId) {
            throw new HttpException("Resume id is required", HttpStatus.BAD_REQUEST)
        }

        if (!jobAnalysisId) {
            throw new HttpException("Job analysis id is required", HttpStatus.BAD_REQUEST)
        }

        try {

            const [userResume] = await this.db.select()
                .from(userResumes)
                .where(
                    and(
                        eq(userResumes.id, resumeId),
                        eq(userResumes.userId, userId)
                    )
                );

            const [jobAnalysisData] = await this.db.select()
                .from(jobAnalysis)
                .where(
                    and(
                        eq(jobAnalysis.id, jobAnalysisId),
                        eq(jobAnalysis.userId, userId)
                    )
                );

            if (!userResume) {
                return {
                    status: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: "User resume not found"
                }
            }

            if (!jobAnalysisData) {
                return {
                    status: false,
                    statusCode: HttpStatus.NOT_FOUND,
                    message: "Job analysis not found"
                }
            }

            const resumeData = {
                summary: userResume.aiSummary,
                skills: userResume.skills,
                experience: userResume.experience,
                education: userResume.education,
                certificates: userResume.certificates,
            };

            const jobData = {
                jobTitle: jobAnalysisData.jobTitle,
                requiredSkills: jobAnalysisData.requiredSkills,
                niceToHaveSkills: jobAnalysisData.niceToHaveSkills,
                responsibilities: jobAnalysisData.responsibilities,
                experience: jobAnalysisData.experience,
                education: jobAnalysisData.education,
            };

            const interaction = await this.ai.interactions.create({
                model: process.env.GEMINI_AI_MODEL!,
                input: resumeMatchPrompt(resumeData, jobData),
                response_format: {
                    type: 'text',
                    mime_type: 'application/json',
                    schema: resumeJsonSchema,
                },
            });

            if (!interaction.output_text) {
                throw new Error("Gemini did not return any output");
            }

            const response = JSON.parse(interaction.output_text);

            return response

        } catch (error) {
            console.error(error);
            throw new HttpException("Something went wrong while fetching resume matches", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }

}
