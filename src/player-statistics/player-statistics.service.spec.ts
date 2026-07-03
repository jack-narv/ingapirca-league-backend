import { Test, TestingModule } from '@nestjs/testing';
import { PlayerStatisticsService } from './player-statistics.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('PlayerStatisticsService', () => {
  let service: PlayerStatisticsService;
  let prisma: {
    match_events: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      match_events: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerStatisticsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PlayerStatisticsService>(PlayerStatisticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('builds scorer summary from goal events grouped by category and team', async () => {
    prisma.match_events.findMany.mockResolvedValue([
      {
        player_id: 'player-1',
        team_id: 'team-1',
        matches: { category_id: 'cat-1' },
        teams: {
          id: 'team-1',
          name: 'Liverpool',
          category_id: 'cat-1',
          season_categories: { id: 'cat-1', name: 'Segunda' },
        },
        players_match_events_player_idToplayers: {
          first_name: 'Charlie',
          last_name: 'Cayo',
        },
      },
      {
        player_id: 'player-1',
        team_id: 'team-1',
        matches: { category_id: 'cat-1' },
        teams: {
          id: 'team-1',
          name: 'Liverpool',
          category_id: 'cat-1',
          season_categories: { id: 'cat-1', name: 'Segunda' },
        },
        players_match_events_player_idToplayers: {
          first_name: 'Charlie',
          last_name: 'Cayo',
        },
      },
      {
        player_id: 'player-2',
        team_id: 'team-2',
        matches: { category_id: 'cat-1' },
        teams: {
          id: 'team-2',
          name: 'Tiro Loco',
          category_id: 'cat-1',
          season_categories: { id: 'cat-1', name: 'Segunda' },
        },
        players_match_events_player_idToplayers: {
          first_name: 'Luis',
          last_name: 'Arboleda',
        },
      },
    ]);

    const result = await service.scorersSummary('season-1');

    expect(prisma.match_events.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          event_type: 'GOAL',
          matches: { season_id: 'season-1' },
        },
      }),
    );
    expect(result).toEqual([
      {
        category_id: 'cat-1',
        category_name: 'Segunda',
        teams: [
          {
            team_id: 'team-1',
            team_name: 'Liverpool',
            total_goals: 2,
            players: [
              {
                player_id: 'player-1',
                player_name: 'Charlie Cayo',
                team_id: 'team-1',
                team_name: 'Liverpool',
                goals: 2,
              },
            ],
          },
          {
            team_id: 'team-2',
            team_name: 'Tiro Loco',
            total_goals: 1,
            players: [
              {
                player_id: 'player-2',
                player_name: 'Luis Arboleda',
                team_id: 'team-2',
                team_name: 'Tiro Loco',
                goals: 1,
              },
            ],
          },
        ],
        top_players: [
          {
            player_id: 'player-1',
            player_name: 'Charlie Cayo',
            team_id: 'team-1',
            team_name: 'Liverpool',
            goals: 2,
          },
          {
            player_id: 'player-2',
            player_name: 'Luis Arboleda',
            team_id: 'team-2',
            team_name: 'Tiro Loco',
            goals: 1,
          },
        ],
      },
    ]);
  });
});
