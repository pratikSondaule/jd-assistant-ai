import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
}
