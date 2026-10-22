import { Body, Controller, Get, Param, Post, Query, Req, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/createMatch.dto';
import { RoleGuard } from 'src/guards/role.guard';
import { UserRole } from 'src/db/schema';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {

    constructor(
        private readonly matchesService: MatchesService
    ) { }

    @ApiOperation({ summary: "Match a candidate's resume with a job description" })
    @ApiBearerAuth()
    @SetMetadata("roles", [UserRole.CANDIDATE])
    @UseGuards(AuthGuard('jwt'), RoleGuard)
    @Post()
    async createMatch(
        @Req() request: Request,
        @Body() data: CreateMatchDto
    ) {
        return this.matchesService.createMatch(request, data);
    }

    @ApiOperation({ summary: "Get candidate matches history" })
    @ApiBearerAuth()
    @ApiQuery({
        name: "resumeId",
        required: false,
        description: "Filter matches by resume ID"
    })
    @ApiQuery({
        name: "jobId",
        required: false,
        description: "Filter matches by job ID"
    })
    @UseGuards(AuthGuard('jwt'))
    @Get()
    async getUserMatches(
        @Req() request: Request,
        @Query("resumeId") resumeId?: string,
        @Query("jobId") jobId?: string
    ) {
        return this.matchesService.getUserMatches(request, resumeId, jobId);
    }

    @ApiOperation({ summary: "Get match details by match ID" })
    @ApiParam({
        name: "matchId",
        required: true,
        description: "Match ID"
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get(":matchId")
    async getMatchById(
        @Req() request: Request,
        @Param("matchId") matchId: string
    ) {
        return this.matchesService.getMatchById(request, matchId);
    }
}
