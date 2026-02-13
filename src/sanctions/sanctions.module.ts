import { Module } from '@nestjs/common';
import { SanctionsService } from './sanctions.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SanctionsService],
  exports: [SanctionsService],
})
export class SanctionsModule {}
