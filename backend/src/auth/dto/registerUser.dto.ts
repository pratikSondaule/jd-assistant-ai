import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsString } from "class-validator";
import { UserRole } from "src/db/schema";

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

    @ApiProperty({ example: UserRole.CANDIDATE, enum: UserRole })
    @IsEnum(UserRole)
    role: UserRole;

}
