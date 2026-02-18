import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VenuesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.venues.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const venue = await this.prisma.venues.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException('Escenario no encontrado');
    }

    return venue;
  }

  async create(data: { name: string; address?: string }) {
    const exists = await this.prisma.venues.findFirst({
      where: { name: data.name },
    });

    if (exists) {
      throw new BadRequestException('Un escenario con el mismo nombre ya existe');
    }

    return this.prisma.venues.create({
      data,
    });
  }

  async update(id: string, data: { name?: string; address?: string }) {
    const venue = await this.prisma.venues.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundException('Escenario no encontrado');
    }

    if (data.name && data.name !== venue.name) {
      const exists = await this.prisma.venues.findFirst({
        where: { name: data.name },
      });

      if (exists) {
        throw new BadRequestException('Un escenario con el mismo nombre ya existe');
      }
    }

    return this.prisma.venues.update({
      where: { id },
      data,
    });
  }
}
