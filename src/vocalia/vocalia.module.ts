import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VocaliaController } from './vocalia.controller';
import { VocaliaService } from './vocalia.service';

@Module({
    imports: [PrismaModule],
    controllers: [VocaliaController],
    providers: [VocaliaService],
})
export class VocaliaModule {}
