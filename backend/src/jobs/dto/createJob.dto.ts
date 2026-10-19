import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateJobDto {

    @ApiProperty({ example: "Node.js Developer" })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: "Google" })
    @IsString()
    @IsNotEmpty()
    company: string;

    @ApiProperty({ example: "This is a job description" })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ example: "San Francisco, CA" })
    @IsString()
    @IsOptional()
    location: string;

    @ApiProperty({ example: "2-3 years" })
    @IsString()
    @IsOptional()
    experience: string;

    @ApiProperty({ example: "Bachelor's Degree" })
    @IsString()
    @IsOptional()
    education: string;

    @ApiProperty({ example: "10-12 LPA" })
    @IsOptional()
    salaryRange: string;

    @ApiProperty({ example: "Full-time" })
    @IsString()
    @IsOptional()
    employmentType: string;
}