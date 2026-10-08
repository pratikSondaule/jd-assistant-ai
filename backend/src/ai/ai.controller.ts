import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { StartChatDto } from './dto/startChat.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags("AI Assistant")
@Controller('ai')
export class AiController {

    constructor(
        private readonly aiService: AiService
    ) { }

    @ApiOperation({
        summary: "Send message to AI Assistant",
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard("jwt"))
    @Post("chat")
    sendMessage(
        @Req() request: Request,
        @Body() data: StartChatDto
    ) {
        return this.aiService.sendMessage(request, data);
    }


    @ApiOperation({
        summary: "Get job description analysis by ID"
    })
    @ApiQuery({
        name: 'id',
        type: String
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard("jwt"))
    @Get("analysis/:id")
    getJdAnalysisById(
        @Req() request: Request,
        @Query("id") id: string
    ) {
        return this.aiService.getJdAnalysisById(request, id)
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
    @ApiBearerAuth()
    @UseGuards(AuthGuard("jwt"))
    @Get("analysis")
    getAllJdAnalysis(
        @Req() request: Request,
        @Query("page") page?: string,
        @Query("limit") limit?: string
    ) {
        return this.aiService.getAllJdAnalysis(request, page, limit)
    }
}
