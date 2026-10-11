import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

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
    @UseGuards(AuthGuard('jwt'))
    @Post("upload")
    @UseInterceptors(FileInterceptor("file"))
    async uploadResume(
        @Req() request: Request,
        @UploadedFile() file: Express.Multer.File
    ) {
        return this.resumesService.uploadResume(request, file);
    }
}
