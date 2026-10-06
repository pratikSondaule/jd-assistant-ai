import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateUserDto {

    @ApiProperty({ example: "demo" })
    @IsString()
    name: string;

    @ApiProperty({ example: "demo@mail.com" })
    @IsEmail()
    email: string;

    @ApiProperty({ example: "password" })
    @IsString()
    password: string;

}
