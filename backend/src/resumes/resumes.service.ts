import { GoogleGenAI } from '@google/genai';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PDFParse } from 'pdf-parse';
import { resumeSystemPrompt } from './prompt/resume.prompt';
import { resumeJsonSchema } from './schema/resume.schema';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { userResumes } from 'src/db/schema';

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

        console.log("PDF Result Text => ", text)

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

            const interaction = await this.ai.interactions.create({
                model: process.env.GEMINI_AI_MODEL!,
                input: resumeText,
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

            const s3Response = await this.uploadOnS3(file);

            await this.db.insert(userResumes).values({
                userId,
                fileName: s3Response?.fileName,
                fileKey: s3Response?.fileKey,
                resumeText,
                aiSummary: response?.aiSummary,
                skills: response?.skills,
                experience: response?.experience,
                education: response?.education,
                certificates: response?.certificates
            }).returning()

            return {
                status: true,
                statusCode: HttpStatus.CREATED,
                message: "Resume uploaded successfully"
            }

        } catch (error) {
            console.error(error)
            throw new HttpException("Something went wrong while uploading resume", HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }


}
