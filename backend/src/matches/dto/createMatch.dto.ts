import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class CreateMatchDto {
    @ApiProperty({
        description: "Job ID to match against",
        example: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    })
    @IsNotEmpty()
    @IsUUID()
    jobId: string;

    @ApiProperty({
        description: "Resume ID of the candidate",
        example: "a8e91629-373e-4601-9a7f-d125dbb2c9ad",
    })
    @IsNotEmpty()
    @IsUUID()
    resumeId: string;
}
