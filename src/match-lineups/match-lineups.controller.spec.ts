import { Test, TestingModule } from '@nestjs/testing';
import { MatchLineupsController } from './match-lineups.controller';

describe('MatchLineupsController', () => {
  let controller: MatchLineupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchLineupsController],
    }).compile();

    controller = module.get<MatchLineupsController>(MatchLineupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
