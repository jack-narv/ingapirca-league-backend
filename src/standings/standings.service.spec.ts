import { Test, TestingModule } from '@nestjs/testing';
import { StandingsService } from './standings.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('StandingsService', () => {
  let service: StandingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StandingsService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<StandingsService>(StandingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
