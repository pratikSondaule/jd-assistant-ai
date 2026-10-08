import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class RegisterUserDto {

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
