import { GoogleGenAI } from '@google/genai';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { StartChatDto } from './dto/startChat.dto';
import { jdJsonSchema } from './jdSchema';
import { jdSystemPrompt } from './prompt';

@Injectable()
export class AiService {
    private ai: GoogleGenAI;

    constructor() {
        this.ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        })
    }

    async sendMessage(data: StartChatDto) {

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

            return {
                status: true,
                statusCode: HttpStatus.OK,
                response
            };

        } catch (error) {
            console.error(error)
            throw new HttpException("Failed to generate response", HttpStatus.INTERNAL_SERVER_ERROR)
        }

    }
}
