import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JwtService]
})
export class JobsModule { }
