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
        if (pos.includes('raid')) return 'text-orange-600 bg-orange-50';
        if (pos.includes('defend')) return 'text-blue-600 bg-blue-50';
        if (pos.includes('all')) return 'text-purple-600 bg-purple-50';
        return 'text-slate-600 bg-slate-50';
    };

    const PlayerRow = ({ player, teamColor }: { player: Player; teamColor: 'orange' | 'purple' }) => {
        const isExpanded = selectedPlayer === player.id;
        const stats = calculatePlayerStats(player.id);
        const colorClass = teamColor === 'orange' ? 'border-l-orange-500' : 'border-l-purple-600';
        const accentColor = teamColor === 'orange' ? 'text-orange-600' : 'text-purple-600';
        const bgAccent = teamColor === 'orange' ? 'bg-orange-500' : 'bg-purple-600';

        return (
            <div className="border-b border-slate-100 last:border-b-0">
                <button
                    onClick={() => setSelectedPlayer(isExpanded ? null : player.id)}
                    className={cn(
                        "w-full flex items-center gap-3 p-3 text-left transition-all hover:bg-slate-50",
                        `border-l-4 ${colorClass}`,
                        player.isOut && "opacity-50"
                    )}
                >
                    {/* Avatar */}
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2",
                        teamColor === 'orange' ? 'border-orange-200 bg-orange-50' : 'border-purple-200 bg-purple-50'
                    )}>
                        {player.photo_url ? (
                            <img src={player.photo_url} alt={player.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <User className={cn("w-5 h-5", accentColor)} />
                        )}
                    </div>

                    {/* Name & Position */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={cn("font-black text-sm uppercase tracking-tight truncate", player.isOut && "line-through text-slate-400")}>
                                {player.name}
                            </span>
                            {player.isCaptain && (
                                <span className={cn("w-5 h-5 rounded-full text-white text-[9px] font-black flex items-center justify-center", bgAccent)}>C</span>
                            )}
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", getPositionColor(player.position))}>
                            {player.position || 'Player'}
                        </span>
                    </div>

                    {/* Points */}
                    <div className="flex items-center gap-2">
                        <span className={cn("text-lg font-black", accentColor)}>{stats.totalPoints}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                </button>

                {/* Expanded Stats */}
                {isExpanded && (
                    <div className="bg-slate-50 p-4 space-y-4 border-t border-slate-100">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: 'Total Pts', value: stats.totalPoints },
                                { label: 'Touch Pts', value: stats.touchPoints },
                                { label: 'Bonus Pts', value: stats.bonusPoints },
                                { label: 'Tackle Pts', value: stats.tacklePoints }
                            ].map((stat, idx) => (
                                <div key={idx} className="text-center">
                                    <div className={cn("text-lg font-black", accentColor)}>{stat.value}</div>
                                    <div className="text-[8px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Raids Breakdown */}
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                <Zap className="w-3 h-3 text-orange-500" /> Total Raids <span className={accentColor}>{stats.totalRaids}</span>
                            </h5>
                            <div className="flex items-center justify-around">
                                {[
                                    { label: 'Successful', value: stats.successfulRaids, color: 'text-green-600 border-green-500' },
                                    { label: 'Unsuccessful', value: stats.unsuccessfulRaids, color: 'text-red-600 border-red-500' },
                                    { label: 'Empty', value: stats.emptyRaids, color: 'text-slate-400 border-slate-300' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-1">
                                        <div className={cn("w-10 h-10 rounded-full border-4 flex items-center justify-center font-black text-sm", item.color)}>
                                            {item.value}
                                        </div>
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 text-center">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tackles Breakdown */}
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                <Shield className="w-3 h-3 text-blue-500" /> Total Tackles <span className={accentColor}>{stats.totalTackles}</span>
                            </h5>
                            <div className="flex items-center justify-around">
                                {[
                                    { label: 'Successful', value: stats.successfulTackles, color: 'text-green-600 border-green-500' },
                                    { label: 'Unsuccessful', value: stats.unsuccessfulTackles, color: 'text-purple-600 border-purple-500' },
                                    { label: 'Super', value: stats.superTackles, color: 'text-orange-600 border-orange-500' }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-1">
                                        <div className={cn("w-10 h-10 rounded-full border-4 flex items-center justify-center font-black text-sm", item.color)}>
                                            {item.value}
                                        </div>
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 text-center">{item.label}</span>
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
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            {/* Team Headers */}
            <div className="grid grid-cols-2 border-b border-slate-100">
                <div className="flex items-center gap-3 p-4 bg-orange-50/50 border-r border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-white border border-orange-200 flex items-center justify-center overflow-hidden">
                        {teamA.logo_url ? (
                            <img src={teamA.logo_url} alt={teamA.name} className="w-8 h-8 object-cover rounded-full" />
                        ) : (
                            <Users className="w-5 h-5 text-orange-500" />
                        )}
                    </div>
                    <span className="text-xs font-black uppercase tracking-tight text-slate-700 truncate">{teamA.name}</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-purple-50/50 justify-end">
                    <span className="text-xs font-black uppercase tracking-tight text-slate-700 truncate">{teamB.name}</span>
                    <div className="w-10 h-10 rounded-full bg-white border border-purple-200 flex items-center justify-center overflow-hidden">
                        {teamB.logo_url ? (
                            <img src={teamB.logo_url} alt={teamB.name} className="w-8 h-8 object-cover rounded-full" />
                        ) : (
                            <Users className="w-5 h-5 text-purple-600" />
                        )}
                    </div>
                </div>
            </div>

            {!showSplitView ? (
                /* ALL PLAYERS VIEW (Before selection) */
                <div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-700">
                        <div className="flex-1 h-1 bg-slate-600 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">All Players</span>
                        <div className="flex-1 h-1 bg-slate-600 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2">
                        {/* Team A All Players */}
                        <div className="border-r border-slate-100">
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Player-name</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pts</span>
                            </div>
                            {playersA.map(player => (
                                <PlayerRow key={player.id} player={player} teamColor="orange" />
                            ))}
                            {playersA.length === 0 && (
                                <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No players found</div>
                            )}
                        </div>
                        {/* Team B All Players */}
                        <div>
                            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Player-name</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pts</span>
                            </div>
                            {playersB.map(player => (
                                <PlayerRow key={player.id} player={player} teamColor="purple" />
                            ))}
                            {playersB.length === 0 && (
                                <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No players found</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* STARTERS / SUBSTITUTES VIEW (After selection) */
                <>
                    {/* Starters Section */}
                    <div className="border-b border-slate-100">
                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500">
                            <div className="flex-1 h-1 bg-orange-400 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Starters</span>
                            <div className="flex-1 h-1 bg-orange-400 rounded-full" />
                        </div>
                        <div className="grid grid-cols-2">
                            {/* Team A Starters */}
                            <div className="border-r border-slate-100">
                                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Player-name</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pts</span>
                                </div>
                                {startersA.length > 0 ? startersA.map(player => (
                                    <PlayerRow key={player.id} player={player} teamColor="orange" />
                                )) : (
                                    <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select starters</div>
                                )}
                            </div>
                            {/* Team B Starters */}
                            <div>
                                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Player-name</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pts</span>
                                </div>
                                {startersB.length > 0 ? startersB.map(player => (
                                    <PlayerRow key={player.id} player={player} teamColor="purple" />
                                )) : (
                                    <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select starters</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Substitutes Section */}
                    <div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-purple-600">
                            <div className="flex-1 h-1 bg-purple-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Substitutes</span>
                            <div className="flex-1 h-1 bg-purple-500 rounded-full" />
                        </div>
                        <div className="grid grid-cols-2">
                            {/* Team A Substitutes */}
                            <div className="border-r border-slate-100">
                                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Player-name</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pts</span>
                                </div>
                                {substitutesA.length > 0 ? substitutesA.map(player => (
                                    <PlayerRow key={player.id} player={player} teamColor="orange" />
                                )) : (
                                    <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No substitutes</div>
                                )}
                            </div>
                            {/* Team B Substitutes */}
                            <div>
                                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Player-name</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pts</span>
                                </div>
                                {substitutesB.length > 0 ? substitutesB.map(player => (
                                    <PlayerRow key={player.id} player={player} teamColor="purple" />
                                )) : (
                                    <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No substitutes</div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
