import { Body, Controller, Post, Req, SetMetadata, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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


}
