import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GenerateAccessTokenDto {

    @ApiProperty({ example: "Your refresh token" })
    @IsNotEmpty()
    @IsString()
    refresh_token: string

}