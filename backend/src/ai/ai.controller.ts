import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { StartChatDto } from './dto/startChat.dto';

@ApiTags("AI Assistant")
@Controller('ai')
export class AiController {

    constructor(
        private readonly aiService: AiService
    ) { }

    @ApiOperation({
        summary: "Send message to AI Assistant",
    })
    @Post("chat")
    sendMessage(
        @Body() data: StartChatDto
    ) {
        return this.aiService.sendMessage(data);
    }


    @ApiOperation({
        summary: "Get job description analysis by ID"
    })
    @ApiQuery({
        name: 'id',
        type: String
    })
    @Get("analysis/:id")
    getJdAnalysisById(
        @Query("id") id: string
    ) {
        return this.aiService.getJdAnalysisById(id)
    }


    @ApiOperation({
        summary: "Get all job description analysis"
    })
    @ApiQuery({
        name: 'page',
        type: String,
        required: false
    })
    @ApiQuery({
        name: 'limit',
        type: String,
        required: false
    })
    @Get("analysis")
    getAllJdAnalysis(
        @Query("page") page?: string,
        @Query("limit") limit?: string
    ) {
        return this.aiService.getAllJdAnalysis(page, limit)
    }
}
