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

  findBySeason(seasonId: string) {
    return this.prisma.venues.findMany({
      where: {
        season_venues: {
          some: {
            season_id: seasonId,
          },
        },
      },
      include: {
        season_venues: {
          select: {
            season_id: true,
          },
        },
      },
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

  async create(data: { season_id: string; name: string; address?: string }) {
    const season = await this.prisma.seasons.findUnique({
      where: { id: data.season_id },
      select: { id: true },
    });

    if (!season) {
      throw new BadRequestException('La temporada no existe');
    }

    return this.prisma.$transaction(async (tx) => {
      const existingVenue = await tx.venues.findFirst({
        where: { name: data.name },
      });

      if (existingVenue) {
        await tx.season_venues.upsert({
          where: {
            season_id_venue_id: {
              season_id: data.season_id,
              venue_id: existingVenue.id,
            },
          },
          update: {},
          create: {
            season_id: data.season_id,
            venue_id: existingVenue.id,
          },
        });

        return existingVenue;
      }

      return tx.venues.create({
        data: {
          name: data.name,
          address: data.address,
          season_venues: {
            create: {
              season_id: data.season_id,
            },
          },
        },
      });
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
