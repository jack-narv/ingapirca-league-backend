import { Test, TestingModule } from '@nestjs/testing';
import { RefereeRatingsService } from './referee_ratings.service';

describe('RefereeRatingsService', () => {
  let service: RefereeRatingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefereeRatingsService],
    }).compile();

    service = module.get<RefereeRatingsService>(RefereeRatingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
