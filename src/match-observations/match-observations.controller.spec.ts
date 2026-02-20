import { Test, TestingModule } from '@nestjs/testing';
import { MatchObservationsController } from './match-observations.controller';

describe('MatchObservationsController', () => {
  let controller: MatchObservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchObservationsController],
    }).compile();

    controller = module.get<MatchObservationsController>(MatchObservationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
