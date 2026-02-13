import { Test, TestingModule } from '@nestjs/testing';
import { MatchEventsService } from './match-events.service';

describe('MatchEventsService', () => {
  let service: MatchEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchEventsService],
    }).compile();

    service = module.get<MatchEventsService>(MatchEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
