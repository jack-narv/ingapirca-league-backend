import { BadRequestException } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchEventsService } from '../match-events/match-events.service';

describe('Knockout periods and events', () => {
    let match: any;
    let tx: any;
    let live: any;
    let matches: MatchesService;
    let events: MatchEventsService;
    const event = { match_id: 'm', team_id: 'home', player_id: 'p' };

    beforeEach(() => {
        match = { id: 'm', journal: 'SEMIFINAL', season_id: 's', status: 'PLAYING_SECOND_HALF', home_score: 1, away_score: 1, home_team_id: 'home', away_team_id: 'away', match_events: [] };
        tx = {
            matches: {
                findUnique: jest.fn(async () => match),
                findMany: jest.fn(async () => [match]),
                update: jest.fn(async ({ data }) => ({ ...match, ...data })),
            },
            match_lineup: { findFirst: jest.fn(async () => ({ id: 'lineup' })) },
            match_events: {
                create: jest.fn(async ({ data }) => ({ id: 'e', ...data })),
                findUnique: jest.fn(), delete: jest.fn(), findMany: jest.fn(),
            },
            player_statistics: { upsert: jest.fn(), updateMany: jest.fn() },
        };
        const prisma = { ...tx, $transaction: async (fn: any) => fn(tx) };
        live = { broadcastMatchPeriodStart: jest.fn(), broadcastMatchEvent: jest.fn(), broadcastScoreUpdate: jest.fn(), broadcastMatchFinish: jest.fn() };
        matches = new MatchesService(prisma as any, live);
        events = new MatchEventsService(prisma as any, live, { handleCardEvent: jest.fn() } as any);
    });

    it('supports extra time, penalties and finishing a knockout match', async () => {
        match = await matches.startFirstExtraHalf('m');
        expect(match.status).toBe('PLAYING_FIRST_EXTRA_HALF');
        match = await matches.endFirstExtraHalf('m');
        expect(match.status).toBe('EXTRA_HALF_TIME');
        match = await matches.startSecondExtraHalf('m');
        expect(match.status).toBe('PLAYING_SECOND_EXTRA_HALF');
        match = await matches.startPenalties('m');
        expect(match.status).toBe('PENALTIES');
        expect((await matches.finishMatch('m', 1, 1)).status).toBe('PLAYED');
        expect(live.broadcastMatchPeriodStart).toHaveBeenCalledTimes(4);
    });

    it.each(['JOURNAL 1', '1', null])('rejects extra time and penalties for league journal %s', async journal => {
        match.journal = journal;
        await expect(matches.startFirstExtraHalf('m')).rejects.toThrow(BadRequestException);
        await expect(matches.startPenalties('m')).rejects.toThrow(BadRequestException);
        expect(tx.matches.update).not.toHaveBeenCalled();
    });

    it('returns penalty totals for detail and list after finishing, excluding missed kicks', async () => {
        match.status = 'PLAYED';
        match.match_events = [
            { team_id: 'home', event_type: 'PENALTY_CONVERTED' },
            { team_id: 'home', event_type: 'PENALTY_MISSED' },
            { team_id: 'away', event_type: 'PENALTY_CONVERTED' },
            { team_id: 'away', event_type: 'PENALTY_CONVERTED' },
        ];
        const detail = await matches.findById('m');
        expect(detail).toMatchObject({ home_penalty_score: 1, away_penalty_score: 2 });
        expect(detail).not.toHaveProperty('match_events');
        expect(await matches.findBySeason('s')).toEqual([detail]);
    });

    it('does not show penalties for ordinary matches and starts shootout totals at zero', async () => {
        expect(await matches.findById('m')).toMatchObject({ home_penalty_score: null, away_penalty_score: null });
        match.status = 'PENALTIES';
        expect(await matches.findById('m')).toMatchObject({ home_penalty_score: 0, away_penalty_score: 0 });
    });

    it('rejects invalid transitions and non-tied starts', async () => {
        await expect(matches.startSecondExtraHalf('m')).rejects.toThrow(BadRequestException);
        match.home_score = 2;
        await expect(matches.startFirstExtraHalf('m')).rejects.toThrow(BadRequestException);
        await expect(matches.startPenalties('m')).rejects.toThrow(BadRequestException);
    });

    it.each([
        ['PLAYING_FIRST_HALF', '5 1t'], ['PLAYING_SECOND_HALF', '9 2t'],
        ['PLAYING_FIRST_EXTRA_HALF', '5 1te'], ['PLAYING_SECOND_EXTRA_HALF', '9 2te'],
    ])('requires the correct minute in %s and counts goals', async (status, minute) => {
        match.status = status;
        await expect(events.createEvent({ ...event, event_type: 'GOAL' })).rejects.toThrow(BadRequestException);
        await expect(events.createEvent({ ...event, event_type: 'GOAL', minute: '4 3t' })).rejects.toThrow(BadRequestException);
        await expect(events.createEvent({ ...event, event_type: 'GOAL', minute: minute.endsWith('1t') ? '2 2t' : '2 1t' })).rejects.toThrow(BadRequestException);
        const result = await events.createEvent({ ...event, event_type: 'GOAL', minute });
        expect(result.minute).toBe(minute);
        expect(tx.matches.update).toHaveBeenCalledWith({ where: { id: 'm' }, data: { home_score: 2, away_score: 1 } });
        expect(tx.player_statistics.upsert).toHaveBeenCalled();
    });

    it.each(['PENALTY_CONVERTED', 'PENALTY_MISSED'] as const)('stores %s without time or changes to goals', async event_type => {
        await expect(events.createEvent({ ...event, event_type })).rejects.toThrow(BadRequestException);
        match.status = 'PENALTIES';
        await expect(events.createEvent({ ...event, event_type, minute: '1 2te' })).rejects.toThrow(BadRequestException);
        const result = await events.createEvent({ ...event, event_type });
        expect(result.minute).toBeNull();
        expect(tx.matches.update).not.toHaveBeenCalled();
        expect(tx.player_statistics.upsert).not.toHaveBeenCalled();
        tx.match_events.findUnique.mockResolvedValue({ ...result, matches: match });
        await events.deleteEvent('e');
        expect(tx.match_events.delete).toHaveBeenCalled();
        expect(tx.player_statistics.updateMany).not.toHaveBeenCalled();
    });

    it('rejects ordinary events during penalties', async () => {
        match.status = 'PENALTIES';
        await expect(events.createEvent({ ...event, event_type: 'GOAL', minute: '5 2te' })).rejects.toThrow(BadRequestException);
    });

    it('sorts all four periods before shootout events', async () => {
        tx.match_events.findMany.mockResolvedValue([
            { minute: null }, { minute: '5 2te' }, { minute: '1 2t' }, { minute: '110 1t' }, { minute: '10 1te' },
        ]);
        expect((await events.getByMatch('m')).map(e => e.minute)).toEqual(['110 1t', '1 2t', '10 1te', '5 2te', null]);
    });
});
