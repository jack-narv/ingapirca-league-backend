export class RateRefereeDto{
    match_id: string;
    referee_id: string;
    team_id: string;
    rating: number; // 1 - 10
    comment?: string;
}