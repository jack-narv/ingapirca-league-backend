import { Module } from '@nestjs/common';
import { RefereesService } from './referees.service';
import { RefereesController } from './referees.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RefereesService],
  controllers: [RefereesController]
})
export class RefereesModule {}
