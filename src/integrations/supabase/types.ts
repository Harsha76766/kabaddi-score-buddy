export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
<<<<<<< HEAD
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      match_events: {
        Row: {
          created_at: string
          defender_ids: string[] | null
          event_data: Json | null
          event_type: string
          id: string
          is_all_out: boolean | null
          is_do_or_die: boolean | null
          match_id: string
          points_awarded: number
          raid_time: number | null
          raider_id: string | null
          team_id: string | null
=======
    public: {
        Tables: {
            achievements: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    icon: string | null
                    xp_reward: number
                    rarity: string
                    category: 'raid' | 'defense' | 'match' | 'special' | 'seasonal'
                    type: 'auto' | 'manual'
                    threshold: number | null
                    is_seasonal: boolean
                    criteria: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    icon?: string | null
                    xp_reward?: number
                    rarity?: string
                    category?: string
                    type?: string
                    threshold?: number | null
                    is_seasonal?: boolean
                    criteria?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    icon?: string | null
                    xp_reward?: number
                    rarity?: string
                    category?: string
                    type?: string
                    threshold?: number | null
                    is_seasonal?: boolean
                    criteria?: Json | null
                    created_at?: string
                }
                Relationships: []
            }
            audit_logs: {
                Row: {
                    id: string
                    user_id: string | null
                    action: string
                    category: string | null
                    target_type: string | null
                    target_id: string | null
                    details: Json | null
                    ip_address: string | null
                    actor_id: string | null
                    actor_name: string | null
                    actor_role: string | null
                    status: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    action: string
                    category?: string | null
                    target_type?: string | null
                    target_id?: string | null
                    details?: Json | null
                    ip_address?: string | null
                    actor_id?: string | null
                    actor_name?: string | null
                    actor_role?: string | null
                    status?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    action?: string
                    category?: string | null
                    target_type?: string | null
                    target_id?: string | null
                    details?: Json | null
                    ip_address?: string | null
                    actor_id?: string | null
                    actor_name?: string | null
                    actor_role?: string | null
                    status?: string
                    created_at?: string
                }
                Relationships: []
            }
            banners: {
                Row: {
                    id: string
                    name: string
                    image_url: string | null
                    link_url: string | null
                    placement: string
                    is_active: boolean
                    start_date: string | null
                    end_date: string | null
                    impressions: number
                    clicks: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    image_url?: string | null
                    link_url?: string | null
                    placement?: string
                    is_active?: boolean
                    start_date?: string | null
                    end_date?: string | null
                    impressions?: number
                    clicks?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    image_url?: string | null
                    link_url?: string | null
                    placement?: string
                    is_active?: boolean
                    start_date?: string | null
                    end_date?: string | null
                    impressions?: number
                    clicks?: number
                    created_at?: string
                }
                Relationships: []
            }
            export_history: {
                Row: {
                    id: string
                    report_id: string | null
                    format: string
                    file_url: string | null
                    name: string
                    type: string
                    size: string | number
                    status: string
                    created_by: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    report_id?: string | null
                    format?: string
                    file_url?: string | null
                    name?: string
                    type?: string
                    size?: string | number
                    status?: string
                    created_by?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    report_id?: string | null
                    format?: string
                    file_url?: string | null
                    name?: string
                    type?: string
                    size?: string | number
                    status?: string
                    created_by?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "export_history_report_id_fkey"
                        columns: ["report_id"]
                        isOneToOne: false
                        referencedRelation: "scheduled_reports"
                        referencedColumns: ["id"]
                    }
                ]
            }
            frozen_players: {
                Row: {
                    id: string
                    player_id: string
                    reason: string | null
                    frozen_by: string | null
                    frozen_at: string
                    unfrozen_at: string | null
                }
                Insert: {
                    id?: string
                    player_id: string
                    reason?: string | null
                    frozen_by?: string | null
                    frozen_at?: string
                    unfrozen_at?: string | null
                }
                Update: {
                    id?: string
                    player_id?: string
                    reason?: string | null
                    frozen_by?: string | null
                    frozen_at?: string
                    unfrozen_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "frozen_players_player_id_fkey"
                        columns: ["player_id"]
                        isOneToOne: false
                        referencedRelation: "players"
                        referencedColumns: ["id"]
                    }
                ]
            }
            level_thresholds: {
                Row: {
                    id: string
                    level: number
                    min_xp: number
                    name: string | null
                    title: string | null
                    badge_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    level: number
                    min_xp: number
                    name?: string | null
                    title?: string | null
                    badge_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    level?: number
                    min_xp?: number
                    name?: string | null
                    title?: string | null
                    badge_url?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            match_events: {
                Row: {
                    id: string
                    match_id: string
                    player_id: string | null
                    event_type: string
                    points: number
                    team: string | null
                    timestamp: string | null
                    is_valid: boolean
                    invalidated_by: string | null
                    invalidated_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    match_id: string
                    player_id?: string | null
                    event_type: string
                    points?: number
                    team?: string | null
                    timestamp?: string | null
                    is_valid?: boolean
                    invalidated_by?: string | null
                    invalidated_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    match_id?: string
                    player_id?: string | null
                    event_type?: string
                    points?: number
                    team?: string | null
                    timestamp?: string | null
                    is_valid?: boolean
                    invalidated_by?: string | null
                    invalidated_at?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "match_events_match_id_fkey"
                        columns: ["match_id"]
                        isOneToOne: false
                        referencedRelation: "matches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "match_events_player_id_fkey"
                        columns: ["player_id"]
                        isOneToOne: false
                        referencedRelation: "players"
                        referencedColumns: ["id"]
                    }
                ]
            }
            match_comments: {
                Row: {
                    id: string
                    match_id: string
                    user_id: string
                    content: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    match_id: string
                    user_id: string
                    content: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    match_id?: string
                    user_id?: string
                    content?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "match_comments_match_id_fkey"
                        columns: ["match_id"]
                        isOneToOne: false
                        referencedRelation: "matches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "match_comments_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            matches: {
                Row: {
                    id: string
                    tournament_id: string | null
                    team_a_id: string | null
                    team_b_id: string | null
                    team_a_score: number
                    team_b_score: number
                    status: string
                    match_date: string | null
                    venue: string | null
                    match_name: string | null
                    match_number: string | null
                    round_name: string | null
                    round_number: number | null
                    group_name: string | null
                    next_match_id: string | null
                    is_team_a_winner_slot: boolean | null
                    playing_7_a: string[] | null
                    playing_7_b: string[] | null
                    current_half: number
                    raid_count: number
                    current_timer: number
                    out_player_ids: string[]
                    active_team: string
                    is_timer_running: boolean
                    toss_winner_id: string | null
                    toss_choice: string | null
                    viewer_count: number
                    created_by: string | null
                    created_at: string
                    updated_at: string
                    ended_at: string | null
                }
                Insert: {
                    id?: string
                    tournament_id?: string | null
                    team_a_id?: string | null
                    team_b_id?: string | null
                    team_a_score?: number
                    team_b_score?: number
                    status?: string
                    match_date?: string | null
                    venue?: string | null
                    match_name?: string | null
                    match_number?: string | null
                    round_name?: string | null
                    round_number?: number | null
                    group_name?: string | null
                    next_match_id?: string | null
                    is_team_a_winner_slot?: boolean | null
                    playing_7_a?: string[] | null
                    playing_7_b?: string[] | null
                    current_half?: number
                    raid_count?: number
                    current_timer?: number
                    out_player_ids?: string[]
                    active_team?: string
                    is_timer_running?: boolean
                    toss_winner_id?: string | null
                    toss_choice?: string | null
                    viewer_count?: number
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                    ended_at?: string | null
                }
                Update: {
                    id?: string
                    tournament_id?: string | null
                    team_a_id?: string | null
                    team_b_id?: string | null
                    team_a_score?: number
                    team_b_score?: number
                    status?: string
                    match_date?: string | null
                    venue?: string | null
                    match_name?: string | null
                    match_number?: string | null
                    round_name?: string | null
                    round_number?: number | null
                    group_name?: string | null
                    next_match_id?: string | null
                    is_team_a_winner_slot?: boolean | null
                    playing_7_a?: string[] | null
                    playing_7_b?: string[] | null
                    current_half?: number
                    raid_count?: number
                    current_timer?: number
                    out_player_ids?: string[]
                    active_team?: string
                    is_timer_running?: boolean
                    toss_winner_id?: string | null
                    toss_choice?: string | null
                    viewer_count?: number
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                    ended_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "matches_team_a_id_fkey"
                        columns: ["team_a_id"]
                        isOneToOne: false
                        referencedRelation: "teams"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "matches_team_b_id_fkey"
                        columns: ["team_b_id"]
                        isOneToOne: false
                        referencedRelation: "teams"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "matches_tournament_id_fkey"
                        columns: ["tournament_id"]
                        isOneToOne: false
                        referencedRelation: "tournaments"
                        referencedColumns: ["id"]
                    }
                ]
            }
            match_reactions: {
                Row: {
                    id: string
                    match_id: string
                    user_id: string
                    type: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    match_id: string
                    user_id: string
                    type?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    match_id?: string
                    user_id?: string
                    type?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "match_reactions_match_id_fkey"
                        columns: ["match_id"]
                        isOneToOne: false
                        referencedRelation: "matches"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "match_reactions_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            notification_templates: {
                Row: {
                    id: string
                    name: string
                    subject: string | null
                    body: string
                    type: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    subject?: string | null
                    body: string
                    type?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    subject?: string | null
                    body?: string
                    type?: string
                    created_at?: string
                }
                Relationships: []
            }
            notifications: {
                Row: {
                    id: string
                    title: string
                    message: string
                    body: string
                    type: string
                    target_audience: string
                    audience: string
                    scheduled_at: string | null
                    scheduled_for: string | null
                    sent_at: string | null
                    sent_count: number
                    status: string
                    created_by: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    message: string
                    body?: string
                    type?: string
                    target_audience?: string
                    audience?: string
                    scheduled_at?: string | null
                    scheduled_for?: string | null
                    sent_at?: string | null
                    sent_count?: number
                    status?: string
                    created_by?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    message?: string
                    body?: string
                    type?: string
                    target_audience?: string
                    audience?: string
                    scheduled_at?: string | null
                    scheduled_for?: string | null
                    sent_at?: string | null
                    sent_count?: number
                    status?: string
                    created_by?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            players: {
                Row: {
                    id: string
                    name: string
                    team_id: string | null
                    jersey_number: number | null
                    position: string | null
                    height: number | null
                    weight: number | null
                    age: number | null
                    matches_played: number
                    total_raid_points: number
                    total_tackle_points: number
                    total_bonus_points: number
                    raid_points: number
                    tackle_points: number
                    total_xp: number
                    current_level: number
                    is_captain: boolean
                    profile_image: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    team_id?: string | null
                    jersey_number?: number | null
                    position?: string | null
                    height?: number | null
                    weight?: number | null
                    age?: number | null
                    matches_played?: number
                    total_raid_points?: number
                    total_tackle_points?: number
                    total_bonus_points?: number
                    raid_points?: number
                    tackle_points?: number
                    total_xp?: number
                    current_level?: number
                    is_captain?: boolean
                    profile_image?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    team_id?: string | null
                    jersey_number?: number | null
                    position?: string | null
                    height?: number | null
                    weight?: number | null
                    age?: number | null
                    matches_played?: number
                    total_raid_points?: number
                    total_tackle_points?: number
                    total_bonus_points?: number
                    raid_points?: number
                    tackle_points?: number
                    total_xp?: number
                    current_level?: number
                    is_captain?: boolean
                    profile_image?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "players_team_id_fkey"
                        columns: ["team_id"]
                        isOneToOne: false
                        referencedRelation: "teams"
                        referencedColumns: ["id"]
                    }
                ]
            }
            player_match_stats: {
                Row: {
                    id: string
                    player_id: string
                    match_id: string
                    raid_points: number
                    tackle_points: number
                    bonus_points: number
                    touch_points: number
                    raids_attempted: number
                    successful_raids: number
                    super_raids: number
                    successful_tackles: number
                    super_tackles: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    player_id: string
                    match_id: string
                    raid_points?: number
                    tackle_points?: number
                    bonus_points?: number
                    touch_points?: number
                    raids_attempted?: number
                    successful_raids?: number
                    super_raids?: number
                    successful_tackles?: number
                    super_tackles?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    player_id?: string
                    match_id?: string
                    raid_points?: number
                    tackle_points?: number
                    bonus_points?: number
                    touch_points?: number
                    raids_attempted?: number
                    successful_raids?: number
                    super_raids?: number
                    successful_tackles?: number
                    super_tackles?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "player_match_stats_player_id_fkey"
                        columns: ["player_id"]
                        isOneToOne: false
                        referencedRelation: "players"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "player_match_stats_match_id_fkey"
                        columns: ["match_id"]
                        isOneToOne: false
                        referencedRelation: "matches"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                Row: {
                    id: string
                    username: string | null
                    name: string | null
                    email: string | null
                    phone: string | null
                    avatar_url: string | null
                    role: string
                    bio: string | null
                    location: string | null
                    website: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    username?: string | null
                    name?: string | null
                    email?: string | null
                    phone?: string | null
                    avatar_url?: string | null
                    role?: string
                    bio?: string | null
                    location?: string | null
                    website?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    username?: string | null
                    name?: string | null
                    email?: string | null
                    phone?: string | null
                    avatar_url?: string | null
                    role?: string
                    bio?: string | null
                    location?: string | null
                    website?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            roles: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    permissions: Json
                    is_system: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    permissions?: Json
                    is_system?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    permissions?: Json
                    is_system?: boolean
                    created_at?: string
                }
                Relationships: []
            }
            scheduled_reports: {
                Row: {
                    id: string
                    name: string
                    type: string
                    frequency: string
                    next_run: string | null
                    last_run: string | null
                    is_active: boolean
                    recipients: string[] | null
                    email: string | null
                    created_by: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    type: string
                    frequency?: string
                    next_run?: string | null
                    last_run?: string | null
                    is_active?: boolean
                    recipients?: string[] | null
                    email?: string | null
                    created_by?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    type?: string
                    frequency?: string
                    next_run?: string | null
                    last_run?: string | null
                    is_active?: boolean
                    recipients?: string[] | null
                    email?: string | null
                    created_by?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            sponsors: {
                Row: {
                    id: string
                    tournament_id: string | null
                    name: string
                    logo_url: string | null
                    type: string
                    is_active: boolean
                    start_date: string | null
                    end_date: string | null
                    impressions: number
                    clicks: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    tournament_id?: string | null
                    name: string
                    logo_url?: string | null
                    type?: string
                    is_active?: boolean
                    start_date?: string | null
                    end_date?: string | null
                    impressions?: number
                    clicks?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    tournament_id?: string | null
                    name?: string
                    logo_url?: string | null
                    type?: string
                    is_active?: boolean
                    start_date?: string | null
                    end_date?: string | null
                    impressions?: number
                    clicks?: number
                    created_at?: string
                }
                Relationships: []
            }
            support_tickets: {
                Row: {
                    id: string
                    ticket_number: string
                    user_id: string | null
                    subject: string
                    description: string | null
                    category: string | null
                    priority: string
                    status: string
                    assigned_to: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    ticket_number?: string
                    user_id?: string | null
                    subject: string
                    description?: string | null
                    category?: string | null
                    priority?: string
                    status?: string
                    assigned_to?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    ticket_number?: string
                    user_id?: string | null
                    subject?: string
                    description?: string | null
                    category?: string | null
                    priority?: string
                    status?: string
                    assigned_to?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "support_tickets_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            team_join_requests: {
                Row: {
                    id: string
                    team_id: string
                    tournament_id: string
                    invite_code: string
                    created_by: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    tournament_id: string
                    invite_code: string
                    created_by: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    tournament_id?: string
                    invite_code?: string
                    created_by?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "team_join_requests_team_id_fkey"
                        columns: ["team_id"]
                        isOneToOne: false
                        referencedRelation: "teams"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "team_join_requests_tournament_id_fkey"
                        columns: ["tournament_id"]
                        isOneToOne: false
                        referencedRelation: "tournaments"
                        referencedColumns: ["id"]
                    }
                ]
            }
            teams: {
                Row: {
                    id: string
                    name: string
                    captain_name: string | null
                    logo_url: string | null
                    wins: number
                    losses: number
                    draws: number
                    is_verified: boolean
                    city: string | null
                    created_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    captain_name?: string | null
                    logo_url?: string | null
                    wins?: number
                    losses?: number
                    draws?: number
                    is_verified?: boolean
                    city?: string | null
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    captain_name?: string | null
                    logo_url?: string | null
                    wins?: number
                    losses?: number
                    draws?: number
                    is_verified?: boolean
                    city?: string | null
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            ticket_messages: {
                Row: {
                    id: string
                    ticket_id: string
                    sender_id: string | null
                    content: string
                    sender_type: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    ticket_id: string
                    sender_id?: string | null
                    content: string
                    sender_type?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    ticket_id?: string
                    sender_id?: string | null
                    content?: string
                    sender_type?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "ticket_messages_ticket_id_fkey"
                        columns: ["ticket_id"]
                        isOneToOne: false
                        referencedRelation: "support_tickets"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "ticket_messages_sender_id_fkey"
                        columns: ["sender_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            tournament_teams: {
                Row: {
                    id: string
                    tournament_id: string
                    team_id: string
                    group_name: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    tournament_id: string
                    team_id: string
                    group_name?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    tournament_id?: string
                    team_id?: string
                    group_name?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "tournament_teams_team_id_fkey"
                        columns: ["team_id"]
                        isOneToOne: false
                        referencedRelation: "teams"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "tournament_teams_tournament_id_fkey"
                        columns: ["tournament_id"]
                        isOneToOne: false
                        referencedRelation: "tournaments"
                        referencedColumns: ["id"]
                    }
                ]
            }
            tournaments: {
                Row: {
                    id: string
                    name: string
                    city: string | null
                    ground: string | null
                    start_date: string | null
                    end_date: string | null
                    category: string | null
                    tournament_type: string | null
                    status: string
                    logo_url: string | null
                    cover_url: string | null
                    organizer_id: string | null
                    organizer_name: string | null
                    organizer_phone: string | null
                    settings: Json | null
                    match_format: Json | null
                    rules_json: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    city?: string | null
                    ground?: string | null
                    start_date?: string | null
                    end_date?: string | null
                    category?: string | null
                    tournament_type?: string | null
                    status?: string
                    logo_url?: string | null
                    cover_url?: string | null
                    organizer_id?: string | null
                    organizer_name?: string | null
                    organizer_phone?: string | null
                    settings?: Json | null
                    match_format?: Json | null
                    rules_json?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    city?: string | null
                    ground?: string | null
                    start_date?: string | null
                    end_date?: string | null
                    category?: string | null
                    tournament_type?: string | null
                    status?: string
                    logo_url?: string | null
                    cover_url?: string | null
                    organizer_id?: string | null
                    organizer_name?: string | null
                    organizer_phone?: string | null
                    settings?: Json | null
                    match_format?: Json | null
                    rules_json?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            user_achievements: {
                Row: {
                    id: string
                    user_id: string
                    achievement_id: string
                    earned_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    achievement_id: string
                    earned_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    achievement_id?: string
                    earned_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "user_achievements_achievement_id_fkey"
                        columns: ["achievement_id"]
                        isOneToOne: false
                        referencedRelation: "achievements"
                        referencedColumns: ["id"]
                    }
                ]
            }
            user_roles: {
                Row: {
                    id: string
                    user_id: string
                    role_id: string
                    assigned_by: string | null
                    assigned_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    role_id: string
                    assigned_by?: string | null
                    assigned_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    role_id?: string
                    assigned_by?: string | null
                    assigned_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "user_roles_role_id_fkey"
                        columns: ["role_id"]
                        isOneToOne: false
                        referencedRelation: "roles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            xp_config: {
                Row: {
                    id: string
                    action_type: string
                    xp_value: number
                    description: string | null
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    action_type: string
                    xp_value?: number
                    description?: string | null
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    action_type?: string
                    xp_value?: number
                    description?: string | null
                    is_active?: boolean
                    created_at?: string
                }
                Relationships: []
            }
            xp_multipliers: {
                Row: {
                    id: string
                    name: string
                    category: string
                    multiplier: number
                    start_date: string | null
                    end_date: string | null
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    category?: string
                    multiplier?: number
                    start_date?: string | null
                    end_date?: string | null
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    category?: string
                    multiplier?: number
                    start_date?: string | null
                    end_date?: string | null
                    is_active?: boolean
                    created_at?: string
                }
                Relationships: []
            }
>>>>>>> 3871690 (feat: enhance live scoring, leaderboard, and profiles; add notification and search components)
        }
        Insert: {
          created_at?: string
          defender_ids?: string[] | null
          event_data?: Json | null
          event_type: string
          id?: string
          is_all_out?: boolean | null
          is_do_or_die?: boolean | null
          match_id: string
          points_awarded?: number
          raid_time?: number | null
          raider_id?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string
          defender_ids?: string[] | null
          event_data?: Json | null
          event_type?: string
          id?: string
          is_all_out?: boolean | null
          is_do_or_die?: boolean | null
          match_id?: string
          points_awarded?: number
          raid_time?: number | null
          raider_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_raider_id_fkey"
            columns: ["raider_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          created_by: string | null
          ended_at: string | null
          id: string
          match_date: string | null
          match_name: string
          match_number: number | null
          match_time: string | null
          match_type: string | null
          referee_id: string | null
          scorer_id: string | null
          status: string | null
          team_a_id: string | null
          team_a_score: number | null
          team_b_id: string | null
          team_b_score: number | null
          tournament_id: string | null
          venue: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          match_date?: string | null
          match_name: string
          match_number?: number | null
          match_time?: string | null
          match_type?: string | null
          referee_id?: string | null
          scorer_id?: string | null
          status?: string | null
          team_a_id?: string | null
          team_a_score?: number | null
          team_b_id?: string | null
          team_b_score?: number | null
          tournament_id?: string | null
          venue?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          ended_at?: string | null
          id?: string
          match_date?: string | null
          match_name?: string
          match_number?: number | null
          match_time?: string | null
          match_type?: string | null
          referee_id?: string | null
          scorer_id?: string | null
          status?: string | null
          team_a_id?: string | null
          team_a_score?: number | null
          team_b_id?: string | null
          team_b_score?: number | null
          tournament_id?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      player_match_stats: {
        Row: {
          bonus_points: number | null
          created_at: string | null
          id: string
          match_id: string | null
          player_id: string | null
          raid_points: number | null
          tackle_points: number | null
        }
        Insert: {
          bonus_points?: number | null
          created_at?: string | null
          id?: string
          match_id?: string | null
          player_id?: string | null
          raid_points?: number | null
          tackle_points?: number | null
        }
        Update: {
          bonus_points?: number | null
          created_at?: string | null
          id?: string
          match_id?: string | null
          player_id?: string | null
          raid_points?: number | null
          tackle_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          id: string
          jersey_number: number | null
          matches_played: number | null
          name: string
          phone: string | null
          team_id: string | null
          total_bonus_points: number | null
          total_raid_points: number | null
          total_tackle_points: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          jersey_number?: number | null
          matches_played?: number | null
          name: string
          phone?: string | null
          team_id?: string | null
          total_bonus_points?: number | null
          total_raid_points?: number | null
          total_tackle_points?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          jersey_number?: number | null
          matches_played?: number | null
          name?: string
          phone?: string | null
          team_id?: string | null
          total_bonus_points?: number | null
          total_raid_points?: number | null
          total_tackle_points?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
          team_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name: string
          phone?: string | null
          role?: string | null
          team_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          team_name?: string | null
        }
        Relationships: []
      }
      team_join_requests: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          invite_code: string
          team_id: string
          tournament_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          invite_code: string
          team_id: string
          tournament_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          team_id?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_join_requests_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_name: string
          captain_phone: string | null
          created_at: string | null
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          captain_name: string
          captain_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          captain_name?: string
          captain_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          created_at: string | null
          id: string
          losses: number | null
          points: number | null
          team_id: string
          tournament_id: string
          wins: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          losses?: number | null
          points?: number | null
          team_id: string
          tournament_id: string
          wins?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          losses?: number | null
          points?: number | null
          team_id?: string
          tournament_id?: string
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          category: string
          city: string
          cover_url: string | null
          created_at: string | null
          end_date: string
          ground: string
          id: string
          logo_url: string | null
          match_format: Json | null
          name: string
          organizer_email: string | null
          organizer_id: string
          organizer_name: string
          organizer_phone: string
          rules_json: Json | null
          start_date: string
          status: string | null
          tournament_type: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          city: string
          cover_url?: string | null
          created_at?: string | null
          end_date: string
          ground: string
          id?: string
          logo_url?: string | null
          match_format?: Json | null
          name: string
          organizer_email?: string | null
          organizer_id: string
          organizer_name: string
          organizer_phone: string
          rules_json?: Json | null
          start_date: string
          status?: string | null
          tournament_type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          city?: string
          cover_url?: string | null
          created_at?: string | null
          end_date?: string
          ground?: string
          id?: string
          logo_url?: string | null
          match_format?: Json | null
          name?: string
          organizer_email?: string | null
          organizer_id?: string
          organizer_name?: string
          organizer_phone?: string
          rules_json?: Json | null
          start_date?: string
          status?: string | null
          tournament_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_match_event: {
        Args: {
          p_defender_ids: string[]
          p_event_data?: Json
          p_event_type: string
          p_is_all_out: boolean
          p_is_do_or_die: boolean
          p_match_id: string
          p_points_awarded: number
          p_raid_time: number
          p_raider_id: string
          p_team_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
