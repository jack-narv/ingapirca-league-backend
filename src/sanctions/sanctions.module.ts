import { Module } from '@nestjs/common';
import { SanctionsService } from './sanctions.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SanctionsController } from './sanctions.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SanctionsController],
  providers: [SanctionsService],
  exports: [SanctionsService],
})
export class SanctionsModule {}
