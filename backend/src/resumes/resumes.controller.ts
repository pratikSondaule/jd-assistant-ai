import { Body, Controller, Delete, Get, Param, Post, Query, Req, SetMetadata, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from 'src/db/schema';
import { RoleGuard } from 'src/guards/role.guard';

@ApiTags("Resumes")
@Controller('resumes')
export class ResumesController {

    constructor(
        private readonly resumesService: ResumesService
    ) { }

    @ApiOperation({ summary: "Upload user resume" })
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                }
            },
            required: ['file']
        }
    })
    @SetMetadata("roles", [UserRole.CANDIDATE])
    @UseGuards(AuthGuard('jwt'), RoleGuard)
    @Post("upload")
    @UseInterceptors(FileInterceptor("file"))
    async uploadResume(
        @Req() request: Request,
        @UploadedFile() file: Express.Multer.File
    ) {
        return this.resumesService.uploadResume(request, file);
    }


    // @ApiOperation({ summary: "Analyse user resume with AI" })
    // @ApiParam({
    //     name: "resumeId",
    //     required: true,
    //     description: "User resume id"
    // })
    // @ApiBearerAuth()
    // @UseGuards(AuthGuard('jwt'))
    // @Post(":resumeId/analyse")
    // async analyseResumeWithAi(
    //     @Req() request: Request,
    //     @Param("resumeId") resumeId: string
    // ) {
    //     return this.resumesService.analyseResumeWithAi(request, resumeId);
    // }


    @ApiOperation({ summary: "Get user resumes with pagination" })
    @ApiQuery({
        name: "page",
        required: false,
        description: "Page number",
    })
    @ApiQuery({
        name: "limit",
        required: false,
        description: "Limit per page",
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get()
    async getUserResumes(
        @Req() request: Request,
        @Query("page") page?: string,
        @Query("limit") limit?: string
    ) {
        return this.resumesService.getUserResumes(request, page, limit);
    }


    @ApiOperation({ summary: "Get user resume by id" })
    @ApiParam({
        name: "resumeId",
        required: true,
        description: "User resume id"
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get(":resumeId")
    async getResumeById(
        @Req() request: Request,
        @Param("resumeId") resumeId: string
    ) {
        return this.resumesService.getResumeById(request, resumeId);
    }


    @ApiOperation({ summary: "Delete user resume" })
    @ApiParam({
        name: "resumeId",
        required: true,
        description: "User resume id"
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Delete(":resumeId")
    async deleteResume(
        @Req() request: Request,
        @Param("resumeId") resumeId: string
    ) {
        return this.resumesService.deleteResume(request, resumeId);
    }


    @ApiOperation({ summary: "Match resume with job description" })
    @ApiParam({
        name: "resumeId",
        required: true,
        description: "User resume id"
    })
    @ApiParam({
        name: "jobAnalysisId",
        required: true,
        description: "Job id"
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Post(":resumeId/match/:jobAnalysisId")
    async getResumeMatchWithJob(
        @Req() request: Request,
        @Param("resumeId") resumeId: string,
        @Param("jobAnalysisId") jobAnalysisId: string
    ) {
        return this.resumesService.getResumeMatchWithJob(request, resumeId, jobAnalysisId);
    }
}
