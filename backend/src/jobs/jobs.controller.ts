import { Body, Controller, Delete, Get, Param, Post, Req, SetMetadata, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateJobDto } from './dto/createJob.dto';
import { AuthGuard } from '@nestjs/passport';
import { RoleGuard } from 'src/guards/role.guard';
import { UserRole } from 'src/db/schema';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {

    constructor(
        private readonly jobsService: JobsService
    ) { }

    @ApiOperation({ summary: "Create a new job" })
    @ApiBearerAuth()
    @SetMetadata("roles", [UserRole.COMPANY])
    @UseGuards(AuthGuard("jwt"), RoleGuard)
    @Post()
    createJob(
        @Req() request: Request,
        @Body() data: CreateJobDto
    ) {
        return this.jobsService.createJob(request, data);
    }


    @ApiOperation({ summary: "Get all jobs" })
    @ApiBearerAuth()
    @UseGuards(AuthGuard("jwt"))
    @Get("")
    getAllJobs(
        @Req() request: Request,
    ) {
        return this.jobsService.getAllJobs(request);
    }


    @ApiOperation({ summary: "Get job by id" })
    @ApiBearerAuth()
    @ApiParam({
        name: "jobId",
        description: "Job id"
    })
    @UseGuards(AuthGuard("jwt"))
    @Get(":jobId")
    getJobById(
        @Req() request: Request,
        @Param("jobId") jobId: string
    ) {
        return this.jobsService.getJobById(request, jobId);
    }


    @ApiOperation({ summary: "Delete job" })
    @ApiBearerAuth()
    @ApiParam({
        name: "jobId",
        description: "Job id"
    })
    @SetMetadata("roles", [UserRole.COMPANY])
    @UseGuards(AuthGuard("jwt"), RoleGuard)
    @Delete(":jobId")
    deleteJob(
        @Req() request: Request,
        @Param("jobId") jobId: string
    ) {
        return this.jobsService.deleteJob(request, jobId);
    }

}
