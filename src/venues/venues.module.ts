import { Module } from '@nestjs/common';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VenuesController],
  providers: [VenuesService],
})
export class VenuesModule {}
