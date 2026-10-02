import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class StartChatDto {
    @ApiProperty({
        example: "Hi there!",
        description: "Message from user"
    })
    @IsString()
    @IsNotEmpty()
    message: string;

}