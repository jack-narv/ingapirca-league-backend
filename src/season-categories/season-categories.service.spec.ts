import { Test, TestingModule } from '@nestjs/testing';
import { SeasonCategoriesService } from './season-categories.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('SeasonCategoriesService', () => {
  let service: SeasonCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeasonCategoriesService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SeasonCategoriesService>(SeasonCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
