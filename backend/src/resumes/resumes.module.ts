import { Module } from '@nestjs/common';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [ResumesController],
  providers: [ResumesService, JwtService]
})
export class ResumesModule { }
