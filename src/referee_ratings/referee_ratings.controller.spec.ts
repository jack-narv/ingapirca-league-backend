import { Test, TestingModule } from '@nestjs/testing';
import { RefereeRatingsController } from './referee_ratings.controller';

describe('RefereeRatingsController', () => {
  let controller: RefereeRatingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefereeRatingsController],
    }).compile();

    controller = module.get<RefereeRatingsController>(RefereeRatingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
