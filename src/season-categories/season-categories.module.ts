import { Module } from '@nestjs/common';
import { SeasonCategoriesService } from './season-categories.service';
import { SeasonCategoriesController } from './season-categories.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SeasonCategoriesService],
  controllers: [SeasonCategoriesController]
})
export class SeasonCategoriesModule {}
