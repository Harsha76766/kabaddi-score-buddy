import { useState } from "react";
import { cn } from "@/lib/utils";
import { Users, ChevronDown, ChevronUp, User, Shield, Zap, Target, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Player {
    id: string;
    name: string;
    jersey_number?: number;
    position?: string;
    photo_url?: string;
    isOut?: boolean;
    isCaptain?: boolean;
    isStarter?: boolean;
    stats?: {
        totalPoints: number;
        touchPoints: number;
        bonusPoints: number;
        tacklePoints: number;
        totalRaids: number;
        successfulRaids: number;
        unsuccessfulRaids: number;
        emptyRaids: number;
        totalTackles: number;
        successfulTackles: number;
        unsuccessfulTackles: number;
        superTackles: number;
    };
}

interface TeamLineupsProps {
    teamA: { id: string; name: string; logo_url?: string };
    teamB: { id: string; name: string; logo_url?: string };
    playersA: Player[];
    playersB: Player[];
    events?: any[];
    startersSelectedA?: boolean; // Whether 7 starters have been selected for team A
    startersSelectedB?: boolean; // Whether 7 starters have been selected for team B
    selectedStarterIdsA?: string[]; // IDs of selected starters for team A
    selectedStarterIdsB?: string[]; // IDs of selected starters for team B
}

export const TeamLineups = ({
    teamA,
    teamB,
    playersA,
    playersB,
    events = [],
    startersSelectedA = false,
    startersSelectedB = false,
    selectedStarterIdsA = [],
    selectedStarterIdsB = []
}: TeamLineupsProps) => {
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

    // Calculate player stats from events
    const calculatePlayerStats = (playerId: string) => {
        const playerEvents = events.filter(e => e.player_id === playerId);
        const raids = playerEvents.filter(e => e.event_type === 'raid');
        const tackles = playerEvents.filter(e => e.event_type === 'tackle');

        const successfulRaids = raids.filter(e => e.points_awarded > 0 || (e.event_data?.bonusPoints > 0)).length;
        const emptyRaids = raids.filter(e => e.points_awarded === 0 && !e.event_data?.bonusPoints && !e.event_data?.isOut).length;
        const unsuccessfulRaids = raids.length - successfulRaids - emptyRaids;

        const successfulTackles = tackles.filter(e => e.points_awarded > 0).length;
        const superTackles = tackles.filter(e => e.points_awarded >= 2).length;

        const touchPoints = raids.reduce((sum, e) => sum + (e.event_data?.touchPoints || 0), 0);
        const bonusPoints = raids.reduce((sum, e) => sum + (e.event_data?.bonusPoints || 0), 0);
        const tacklePoints = tackles.reduce((sum, e) => sum + (e.points_awarded || 0), 0);

        return {
            totalPoints: touchPoints + bonusPoints + tacklePoints,
            touchPoints,
            bonusPoints,
            tacklePoints,
            totalRaids: raids.length,
            successfulRaids,
            unsuccessfulRaids,
            emptyRaids,
            totalTackles: tackles.length,
            successfulTackles,
            unsuccessfulTackles: tackles.length - successfulTackles,
            superTackles
        };
    };

    const getPositionColor = (position?: string) => {
        const pos = position?.toLowerCase() || '';
        if (pos.includes('raid')) return 'text-orange-500 bg-orange-500/10';
        if (pos.includes('defend')) return 'text-blue-500 bg-blue-500/10';
        if (pos.includes('all')) return 'text-purple-500 bg-purple-500/10';
        return 'text-neutral-500 bg-white/5';
    };

    const PlayerRow = ({ player, teamColor }: { player: Player; teamColor: 'orange' | 'blue' }) => {
        const isExpanded = selectedPlayer === player.id;
        const stats = calculatePlayerStats(player.id);
        const colorClass = teamColor === 'orange' ? 'border-l-orange-500' : 'border-l-blue-500';
        const accentColor = teamColor === 'orange' ? 'text-orange-500' : 'text-blue-500';
        const bgAccent = teamColor === 'orange' ? 'bg-orange-500' : 'bg-blue-500';

        return (
            <div className="border-b border-white/5 last:border-b-0">
                <button
                    onClick={() => setSelectedPlayer(isExpanded ? null : player.id)}
                    className={cn(
                        "w-full flex items-center gap-3 p-3 text-left transition-all hover:bg-white/5",
                        `border-l-2 ${colorClass}`,
                        player.isOut && "opacity-40"
                    )}
                >
                    {/* Avatar */}
                    <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/10 shadow-inner",
                        teamColor === 'orange' ? 'bg-orange-500/10' : 'bg-blue-500/10'
                    )}>
                        {player.photo_url ? (
                            <img src={player.photo_url} alt={player.name} className="w-full h-full rounded-xl object-cover" />
                        ) : (
                            <User className={cn("w-4 h-4", accentColor)} />
                        )}
                    </div>

                    {/* Name & Position */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={cn("font-black text-[12px] uppercase tracking-tight truncate text-white", player.isOut && "line-through text-neutral-600")}>
                                {player.name}
                            </span>
                            {player.isCaptain && (
                                <span className={cn("w-4 h-4 rounded-md text-white text-[8px] font-black flex items-center justify-center", bgAccent)}>C</span>
                            )}
                        </div>
                        <span className={cn("text-[8px] font-black uppercase tracking-[.15em] px-1.5 py-0.5 rounded", getPositionColor(player.position))}>
                            {player.position || 'Player'}
                        </span>
                    </div>

                    {/* Points */}
                    <div className="flex items-center gap-3">
                        <span className={cn("text-lg font-black", accentColor)}>{stats.totalPoints}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-600" /> : <ChevronDown className="w-4 h-4 text-neutral-600" />}
                    </div>
                </button>

                {/* Expanded Stats */}
                {isExpanded && (
                    <div className="bg-black/40 p-5 space-y-5 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'TOTAL', value: stats.totalPoints },
                                { label: 'TOUCH', value: stats.touchPoints },
                                { label: 'BONUS', value: stats.bonusPoints },
                                { label: 'TACKLE', value: stats.tacklePoints }
                            ].map((stat, idx) => (
                                <div key={idx} className="text-center group">
                                    <div className={cn("text-xl font-black transition-transform group-hover:scale-110", accentColor)}>{stat.value}</div>
                                    <div className="text-[7px] font-black uppercase tracking-[.2em] text-neutral-600">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Raids Breakdown */}
                        <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                            <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4 flex items-center gap-2">
                                <Zap className="w-3 h-3 text-orange-500" /> RAIDS • <span className={accentColor}>{stats.totalRaids}</span>
                            </h5>
                            <div className="flex items-center justify-around">
                                {[
                                    { label: 'Success', value: stats.successfulRaids, color: 'text-green-500 border-green-500/20 bg-green-500/5' },
                                    { label: 'Out', value: stats.unsuccessfulRaids, color: 'text-red-500 border-red-500/20 bg-red-500/5' },
                                    { label: 'Empty', value: stats.emptyRaids, color: 'text-neutral-500 border-neutral-500/20 bg-neutral-500/5' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-2">
                                        <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center font-black text-xs shadow-lg", item.color)}>
                                            {item.value}
                                        </div>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tackles Breakdown */}
                        <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                            <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4 flex items-center gap-2">
                                <Shield className="w-3 h-3 text-blue-500" /> TACKLES • <span className={accentColor}>{stats.totalTackles}</span>
                            </h5>
                            <div className="flex items-center justify-around">
                                {[
                                    { label: 'Success', value: stats.successfulTackles, color: 'text-green-500 border-green-500/20 bg-green-500/5' },
                                    { label: 'Unsuccessful', value: stats.unsuccessfulTackles, color: 'text-blue-400 border-blue-400/20 bg-blue-400/5' },
                                    { label: 'Super', value: stats.superTackles, color: 'text-orange-500 border-orange-500/20 bg-orange-500/5' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-2">
                                        <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center font-black text-xs shadow-lg", item.color)}>
                                            {item.value}
                                        </div>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Determine starters and substitutes based on selection
    const startersA = startersSelectedA && selectedStarterIdsA.length > 0
        ? playersA.filter(p => selectedStarterIdsA.includes(p.id))
        : [];
    const substitutesA = startersSelectedA && selectedStarterIdsA.length > 0
        ? playersA.filter(p => !selectedStarterIdsA.includes(p.id))
        : [];
    const startersB = startersSelectedB && selectedStarterIdsB.length > 0
        ? playersB.filter(p => selectedStarterIdsB.includes(p.id))
        : [];
    const substitutesB = startersSelectedB && selectedStarterIdsB.length > 0
        ? playersB.filter(p => !selectedStarterIdsB.includes(p.id))
        : [];

    // Check if both teams have starters selected
    const showSplitView = startersSelectedA || startersSelectedB;

    return (
        <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Team Headers */}
            <div className="grid grid-cols-2 border-b border-white/10">
                <div className="flex items-center gap-3 p-4 bg-orange-500/5 border-r border-white/10">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-orange-500/20 flex items-center justify-center overflow-hidden">
                        {teamA.logo_url ? (
                            <img src={teamA.logo_url} alt={teamA.name} className="w-8 h-8 object-cover rounded-xl" />
                        ) : (
                            <Users className="w-5 h-5 text-orange-500" />
                        )}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight text-white truncate">{teamA.name}</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-500/5 justify-end">
                    <span className="text-[10px] font-black uppercase tracking-tight text-white truncate text-right">{teamB.name}</span>
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-blue-500/20 flex items-center justify-center overflow-hidden">
                        {teamB.logo_url ? (
                            <img src={teamB.logo_url} alt={teamB.name} className="w-8 h-8 object-cover rounded-xl" />
                        ) : (
                            <Users className="w-5 h-5 text-blue-500" />
                        )}
                    </div>
                </div>
            </div>

            {!showSplitView ? (
                /* ALL PLAYERS VIEW (Before selection) */
                <div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/5">
                        <div className="flex-1 h-[1px] bg-white/10" />
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-neutral-500">All Registered Players</span>
                        <div className="flex-1 h-[1px] bg-white/10" />
                    </div>
                    <div className="grid grid-cols-2">
                        {/* Team A All Players */}
                        <div className="border-r border-white/10">
                            <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
                                <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Player</span>
                                <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Pts</span>
                            </div>
                            {playersA.map(player => (
                                <PlayerRow key={player.id} player={player} teamColor="orange" />
                            ))}
                            {playersA.length === 0 && (
                                <div className="p-8 text-center text-[8px] font-bold text-neutral-600 uppercase tracking-widest">No players</div>
                            )}
                        </div>
                        {/* Team B All Players */}
                        <div>
                            <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
                                <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Player</span>
                                <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Pts</span>
                            </div>
                            {playersB.map(player => (
                                <PlayerRow key={player.id} player={player} teamColor="blue" />
                            ))}
                            {playersB.length === 0 && (
                                <div className="p-8 text-center text-[8px] font-bold text-neutral-600 uppercase tracking-widest">No players</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* STARTERS / SUBSTITUTES VIEW (After selection) */
                <>
                    {/* Starters Section */}
                    <div className="border-b border-white/10">
                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 border-b border-orange-500/10">
                            <div className="flex-1 h-[1px] bg-orange-500/20" />
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-orange-400">Starting 7</span>
                            <div className="flex-1 h-[1px] bg-orange-500/20" />
                        </div>
                        <div className="grid grid-cols-2">
                            {/* Team A Starters */}
                            <div className="border-r border-white/10">
                                <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Player</span>
                                    <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Pts</span>
                                </div>
                                {startersA.length > 0 ? startersA.map(player => (
                                    <PlayerRow key={player.id} player={player} teamColor="orange" />
                                )) : (
                                    <div className="p-4 text-center text-[8px] font-bold text-neutral-600 uppercase tracking-widest italic">Not finalized</div>
                                )}
                            </div>
                            {/* Team B Starters */}
                            <div>
                                <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Player</span>
                                    <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Pts</span>
                                </div>
                                {startersB.length > 0 ? startersB.map(player => (
                                    <PlayerRow key={player.id} player={player} teamColor="blue" />
                                )) : (
                                    <div className="p-4 text-center text-[8px] font-bold text-neutral-600 uppercase tracking-widest italic">Not finalized</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Substitutes Section */}
                    <div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border-b border-blue-500/10">
                            <div className="flex-1 h-[1px] bg-blue-500/20" />
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-400">Substitutes</span>
                            <div className="flex-1 h-[1px] bg-blue-500/20" />
                        </div>
                        <div className="grid grid-cols-2">
                            {/* Team A Substitutes */}
                            <div className="border-r border-white/10">
                                <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Player</span>
                                    <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Pts</span>
                                </div>
                                {substitutesA.length > 0 ? substitutesA.map(player => (
                                    <PlayerRow key={player.id} player={player} teamColor="orange" />
                                )) : (
                                    <div className="p-4 text-center text-[8px] font-bold text-neutral-600 uppercase tracking-widest italic">None</div>
                                )}
                            </div>
                            {/* Team B Substitutes */}
                            <div>
                                <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Player</span>
                                    <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600">Pts</span>
                                </div>
                                {substitutesB.length > 0 ? substitutesB.map(player => (
                                    <PlayerRow key={player.id} player={player} teamColor="blue" />
                                )) : (
                                    <div className="p-4 text-center text-[8px] font-bold text-neutral-600 uppercase tracking-widest italic">None</div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
