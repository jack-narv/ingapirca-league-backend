export class CreateRefereeRatingDto {
    match_id: string;
    referee_id: string;
    team_id: string;
    rating: number;
    comment?: string;
}
