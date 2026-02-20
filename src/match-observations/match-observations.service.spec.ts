import { Test, TestingModule } from '@nestjs/testing';
import { MatchObservationsService } from './match-observations.service';

describe('MatchObservationsService', () => {
  let service: MatchObservationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchObservationsService],
    }).compile();

    service = module.get<MatchObservationsService>(MatchObservationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
