import { Test, TestingModule } from '@nestjs/testing';
import { MatchLineupsService } from './match-lineups.service';

describe('MatchLineupsService', () => {
  let service: MatchLineupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchLineupsService],
    }).compile();

    service = module.get<MatchLineupsService>(MatchLineupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
