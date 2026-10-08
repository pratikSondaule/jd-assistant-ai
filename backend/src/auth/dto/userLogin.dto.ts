import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class UserLoginDto {

    @ApiProperty({ example: "demo@mail.com" })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: "password" })
    @IsString()
    @IsNotEmpty()
    password: string;

}