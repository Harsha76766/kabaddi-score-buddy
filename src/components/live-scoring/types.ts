export interface Player {
    id: string;
    name: string;
    jersey_number: number | null;
    team_id: string;
}

export interface Team {
    id: string;
    name: string;
    logo_url: string | null;
}

export interface Match {
    id: string;
    team_a_id: string;
    team_b_id: string;
    team_a_score: number;
    team_b_score: number;
    match_name: string;
    status: string; // 'upcoming' | 'live' | 'completed'
    venue: string;
    match_date: string;
    current_timer?: number;
    current_half?: number;
    out_player_ids?: string[];
    active_team?: string;
    is_timer_running?: boolean;
    next_match_id?: string | null;
    is_team_a_winner_slot?: boolean | null;
}

export type RaidState = 'IDLE' | 'RAIDING' | 'OUTCOME' | 'CONFIRM';

export interface RaidAction {
    raiderId: string;
    outcome: 'success' | 'fail' | 'empty';
    touchPoints: number;
    bonusPoint: boolean;
    defendersOut: string[]; // IDs of defenders out
    raiderOut: boolean; // True if raider was caught
    tacklerId?: string; // ID of defender who tackled (if raiderOut)
}
