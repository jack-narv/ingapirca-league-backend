export class AssignRefereeDto{
    match_id: string;
    referee_id: string;
    role: 'MAIN' | 'ASSISTANT_1' | 'ASSISTANT_2' | 'FOURTH';
}