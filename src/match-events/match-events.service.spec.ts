import { Test, TestingModule } from '@nestjs/testing';
import { MatchEventsService } from './match-events.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LiveGateway } from 'src/live/live.gateway';
import { SanctionsService } from 'src/sanctions/sanctions.service';

describe('MatchEventsService', () => {
  let service: MatchEventsService;
  let prisma: {
    $transaction: jest.Mock;
  };
  let sanctions: {
    handleCardEvent: jest.Mock;
  };
  let live: {
    broadcastMatchEvent: jest.Mock;
    broadcastScoreUpdate: jest.Mock;
  };

  beforeEach(async () => {
    const tx = {
      matches: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'match-1',
          season_id: 'season-1',
          status: 'PLAYING_FIRST_HALF',
        }),
      },
      match_lineup: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'lineup-1',
        }),
      },
      match_events: {
        create: jest.fn().mockResolvedValue({
          id: 'event-1',
          match_id: 'match-1',
        }),
      },
      player_statistics: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(tx)),
    };

    sanctions = {
      handleCardEvent: jest.fn().mockResolvedValue(undefined),
    };

    live = {
      broadcastMatchEvent: jest.fn(),
      broadcastScoreUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: LiveGateway, useValue: live },
        { provide: SanctionsService, useValue: sanctions },
      ],
    }).compile();

    service = module.get<MatchEventsService>(MatchEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates red-card sanctions inside the match transaction', async () => {
    await service.createEvent({
      match_id: 'match-1',
      team_id: 'team-1',
      player_id: 'player-1',
      minute: '35 1t',
      event_type: 'RED_DIRECT',
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(sanctions.handleCardEvent).toHaveBeenCalledWith(
      {
        match_id: 'match-1',
        player_id: 'player-1',
        team_id: 'team-1',
        season_id: 'season-1',
        event_type: 'RED_DIRECT',
      },
      expect.objectContaining({
        matches: expect.any(Object),
        match_lineup: expect.any(Object),
        match_events: expect.any(Object),
        player_statistics: expect.any(Object),
      }),
    );
  });
});
