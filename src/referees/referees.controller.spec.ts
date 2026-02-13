import { Test, TestingModule } from '@nestjs/testing';
import { RefereesController } from './referees.controller';

describe('RefereesController', () => {
  let controller: RefereesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefereesController],
    }).compile();

    controller = module.get<RefereesController>(RefereesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
