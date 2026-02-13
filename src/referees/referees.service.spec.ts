import { Test, TestingModule } from '@nestjs/testing';
import { RefereesService } from './referees.service';

describe('RefereesService', () => {
  let service: RefereesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefereesService],
    }).compile();

    service = module.get<RefereesService>(RefereesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
