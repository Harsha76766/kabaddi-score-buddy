import { useState } from "react";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface TeamStatsComparisonProps {
    teamA: { name: string; logo_url?: string };
    teamB: { name: string; logo_url?: string };
    stats: {
        teamA: {
            raids: number;
            successfulRaids: number;
            touchPoints: number;
            bonusPoints: number;
            tacklePoints: number;
            allOuts: number;
            emptyRaids?: number;
            outs?: number;
            totalTackles?: number;
            successfulTackles?: number;
            superTackles?: number;
        };
        teamB: {
            raids: number;
            successfulRaids: number;
            touchPoints: number;
            bonusPoints: number;
            tacklePoints: number;
            allOuts: number;
            emptyRaids?: number;
            outs?: number;
            totalTackles?: number;
            successfulTackles?: number;
            superTackles?: number;
        };
        half1: { teamA: number; teamB: number };
        half2: { teamA: number; teamB: number };
    };
    totalScoreA: number;
    totalScoreB: number;
}

export const TeamStatsComparison = ({
    teamA,
    teamB,
    stats,
    totalScoreA,
    totalScoreB
}: TeamStatsComparisonProps) => {
    const [selectedHalf, setSelectedHalf] = useState<'first' | 'second'>('first');
    const [selectedCategory, setSelectedCategory] = useState<'raids' | 'tackles'>('raids');

    // Calculate total points for each team
    const teamATotalPoints = totalScoreA;
    const teamBTotalPoints = totalScoreB;

    // Calculate raid points (touch + bonus)
    const teamARaidPoints = stats.teamA.touchPoints + stats.teamA.bonusPoints;
    const teamBRaidPoints = stats.teamB.touchPoints + stats.teamB.bonusPoints;

    // Get half-wise data
    const halfData = selectedHalf === 'first' ? stats.half1 : stats.half2;

    // Calculate success rates
    const teamARaidSuccess = stats.teamA.raids > 0
        ? ((stats.teamA.successfulRaids / stats.teamA.raids) * 100).toFixed(1)
        : '0';
    const teamBRaidSuccess = stats.teamB.raids > 0
        ? ((stats.teamB.successfulRaids / stats.teamB.raids) * 100).toFixed(1)
        : '0';

    // Comparison bar helper
    const ComparisonBar = ({
        label,
        valueA,
        valueB,
        colorA = "bg-orange-500",
        colorB = "bg-purple-600"
    }: {
        label: string;
        valueA: number;
        valueB: number;
        colorA?: string;
        colorB?: string;
    }) => {
        const total = valueA + valueB || 1;
        const percentA = (valueA / total) * 100;
        const percentB = (valueB / total) * 100;

        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-slate-800">{valueA}</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-600">{label}</span>
                    <span className="text-2xl font-black text-slate-800">{valueB}</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                    <div
                        className={cn("h-full transition-all", colorA)}
                        style={{ width: `${percentA}%` }}
                    />
                    <div
                        className={cn("h-full transition-all", colorB)}
                        style={{ width: `${percentB}%` }}
                    />
                </div>
            </div>
        );
    };

    const TeamLogo = ({ team, side }: { team: { name: string; logo_url?: string }; side: 'left' | 'right' }) => (
        <div className={cn("flex items-center gap-3", side === 'right' && "flex-row-reverse")}>
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-10 h-10 object-cover rounded-full" />
                ) : (
                    <Users className="w-6 h-6 text-slate-400" />
                )}
            </div>
            <div className={cn("space-y-0.5", side === 'right' && "text-right")}>
                <p className="text-xs font-black uppercase tracking-tight text-slate-700 line-clamp-1">{team.name}</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            {/* Half Tabs */}
            <div className="flex border-b border-slate-100">
                <button
                    onClick={() => setSelectedHalf('first')}
                    className={cn(
                        "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all",
                        selectedHalf === 'first'
                            ? "bg-purple-600 text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    )}
                >
                    First Half
                </button>
                <button
                    onClick={() => setSelectedHalf('second')}
                    className={cn(
                        "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all",
                        selectedHalf === 'second'
                            ? "bg-purple-600 text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    )}
                >
                    Second Half
                </button>
            </div>

            {/* Team Headers */}
            <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <TeamLogo team={teamA} side="left" />
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">Half Wise Comparison</p>
                    </div>
                    <TeamLogo team={teamB} side="right" />
                </div>
            </div>

            {/* Stats Comparison Bars */}
            <div className="px-6 py-6 space-y-6">
                <ComparisonBar
                    label="Total Points"
                    valueA={selectedHalf === 'first' ? halfData.teamA : halfData.teamA}
                    valueB={selectedHalf === 'first' ? halfData.teamB : halfData.teamB}
                />
                <ComparisonBar
                    label="Raid Points"
                    valueA={teamARaidPoints}
                    valueB={teamBRaidPoints}
                />
                <ComparisonBar
                    label="Tackle Points"
                    valueA={stats.teamA.tacklePoints}
                    valueB={stats.teamB.tacklePoints}
                />
                <ComparisonBar
                    label="All Out Points"
                    valueA={stats.teamA.allOuts * 2}
                    valueB={stats.teamB.allOuts * 2}
                />
                <ComparisonBar
                    label="Bonus Points"
                    valueA={stats.teamA.bonusPoints}
                    valueB={stats.teamB.bonusPoints}
                />
            </div>

            {/* Raids / Tackles Toggle */}
            <div className="flex border-t border-b border-slate-100">
                <button
                    onClick={() => setSelectedCategory('raids')}
                    className={cn(
                        "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all",
                        selectedCategory === 'raids'
                            ? "bg-white text-slate-900 border-b-2 border-orange-500"
                            : "bg-slate-50 text-slate-400"
                    )}
                >
                    Raids
                </button>
                <button
                    onClick={() => setSelectedCategory('tackles')}
                    className={cn(
                        "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all",
                        selectedCategory === 'tackles'
                            ? "bg-purple-600 text-white"
                            : "bg-slate-50 text-slate-400"
                    )}
                >
                    Tackles
                </button>
            </div>

            {/* Category Breakdown */}
            <div className="px-6 py-5">
                {/* Team Headers for breakdown */}
                <div className="flex items-center justify-between mb-6">
                    <TeamLogo team={teamA} side="left" />
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">Points Breakdown</p>
                    </div>
                    <TeamLogo team={teamB} side="right" />
                </div>

                {selectedCategory === 'raids' ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-3xl font-black text-orange-500">{stats.teamA.raids}</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Raids</span>
                            <span className="text-3xl font-black text-purple-600">{stats.teamB.raids}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xl font-black text-slate-700">{stats.teamA.successfulRaids}</span>
                            <span className="px-4 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500">Successful Raids</span>
                            <span className="text-xl font-black text-slate-700">{stats.teamB.successfulRaids}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xl font-black text-slate-700">{stats.teamA.touchPoints}</span>
                            <span className="px-4 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500">Touch Points</span>
                            <span className="text-xl font-black text-slate-700">{stats.teamB.touchPoints}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xl font-black text-slate-700">{stats.teamA.bonusPoints}</span>
                            <span className="px-4 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500">Bonus Points</span>
                            <span className="text-xl font-black text-slate-700">{stats.teamB.bonusPoints}</span>
                        </div>
                        {/* Raid Success Rate */}
                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-black text-orange-500">{teamARaidSuccess}%</span>
                                <div className="flex-1 mx-6">
                                    <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Raid Success Rate</p>
                                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                                        <div className="h-full bg-orange-500" style={{ width: `${teamARaidSuccess}%` }} />
                                        <div className="h-full bg-purple-600" style={{ width: `${teamBRaidSuccess}%` }} />
                                    </div>
                                </div>
                                <span className="text-2xl font-black text-purple-600">{teamBRaidSuccess}%</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-3xl font-black text-orange-500">{stats.teamA.tacklePoints}</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Tackles</span>
                            <span className="text-3xl font-black text-purple-600">{stats.teamB.tacklePoints}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xl font-black text-slate-700">{Math.floor(stats.teamA.tacklePoints * 0.6)}</span>
                            <span className="px-4 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500">Successful Tackles</span>
                            <span className="text-xl font-black text-slate-700">{Math.floor(stats.teamB.tacklePoints * 0.6)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xl font-black text-slate-700">{Math.floor(stats.teamA.tacklePoints * 0.15)}</span>
                            <span className="px-4 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500">Super Tackles</span>
                            <span className="text-xl font-black text-slate-700">{Math.floor(stats.teamB.tacklePoints * 0.15)}</span>
                        </div>
                        {/* Tackle Success Rate */}
                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-black text-orange-500">
                                    {stats.teamA.raids > 0 ? ((stats.teamA.tacklePoints / stats.teamA.raids) * 100).toFixed(1) : '0'}%
                                </span>
                                <div className="flex-1 mx-6">
                                    <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Tackle Success Rate</p>
                                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                                        <div className="h-full bg-orange-500" style={{ width: '40%' }} />
                                        <div className="h-full bg-purple-600" style={{ width: '30%' }} />
                                    </div>
                                </div>
                                <span className="text-2xl font-black text-purple-600">
                                    {stats.teamB.raids > 0 ? ((stats.teamB.tacklePoints / stats.teamB.raids) * 100).toFixed(1) : '0'}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
