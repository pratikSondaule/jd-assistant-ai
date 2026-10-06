import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class StartChatDto {
    @ApiProperty({
        example: "Hi there!",
        description: "Paste your job description"
    })
    @IsString()
    @IsNotEmpty()
    message: string;

}