import { Test, TestingModule } from '@nestjs/testing';
import { SeasonCategoriesController } from './season-categories.controller';
import { SeasonCategoriesService } from './season-categories.service';

describe('SeasonCategoriesController', () => {
  let controller: SeasonCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeasonCategoriesController],
      providers: [
        {
          provide: SeasonCategoriesService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<SeasonCategoriesController>(SeasonCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
