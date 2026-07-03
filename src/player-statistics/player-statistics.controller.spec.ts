import { Test, TestingModule } from '@nestjs/testing';
import { PlayerStatisticsController } from './player-statistics.controller';
import { PlayerStatisticsService } from './player-statistics.service';

describe('PlayerStatisticsController', () => {
  let controller: PlayerStatisticsController;
  let service: {
    scorersSummary: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      scorersSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerStatisticsController],
      providers: [
        {
          provide: PlayerStatisticsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<PlayerStatisticsController>(PlayerStatisticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates scorer summary requests to the service', async () => {
    service.scorersSummary.mockResolvedValue([]);

    await controller.getScorersSummary('season-1', 'cat-1');

    expect(service.scorersSummary).toHaveBeenCalledWith('season-1', 'cat-1');
  });
});
