import { Module } from '@nestjs/common';
import { RefereeRatingsService } from './referee_ratings.service';
import { RefereeRatingsController } from './referee_ratings.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RefereeRatingsService],
  controllers: [RefereeRatingsController]
})
export class RefereeRatingsModule {}
