import { Test, TestingModule } from '@nestjs/testing';
import { MatchEventsController } from './match-events.controller';

describe('MatchEventsController', () => {
  let controller: MatchEventsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchEventsController],
    }).compile();

    controller = module.get<MatchEventsController>(MatchEventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
