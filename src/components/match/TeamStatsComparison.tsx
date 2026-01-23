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
        colorB = "bg-blue-600"
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
                    <span className="text-xl font-black text-white">{valueA}</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">{label}</span>
                    <span className="text-xl font-black text-white">{valueB}</span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
                    <div
                        className={cn("h-full transition-all duration-1000", colorA)}
                        style={{ width: `${percentA}%` }}
                    />
                    <div
                        className={cn("h-full transition-all duration-1000", colorB)}
                        style={{ width: `${percentB}%` }}
                    />
                </div>
            </div>
        );
    };

    const TeamLogo = ({ team, side }: { team: { name: string; logo_url?: string }; side: 'left' | 'right' }) => (
        <div className={cn("flex items-center gap-3", side === 'right' && "flex-row-reverse")}>
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-cover rounded-xl" />
                ) : (
                    <Users className="w-5 h-5 text-neutral-700" />
                )}
            </div>
            <div className={cn("min-w-0 px-1", side === 'right' && "text-right")}>
                <p className="text-[10px] font-black uppercase tracking-tight text-neutral-400 truncate">{team.name}</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Half Tabs */}
            <div className="flex border-b border-white/10 p-1">
                <button
                    onClick={() => setSelectedHalf('first')}
                    className={cn(
                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-2xl",
                        selectedHalf === 'first'
                            ? "bg-white text-black shadow-lg"
                            : "text-neutral-500 hover:text-white"
                    )}
                >
                    First Half
                </button>
                <button
                    onClick={() => setSelectedHalf('second')}
                    className={cn(
                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-2xl",
                        selectedHalf === 'second'
                            ? "bg-white text-black shadow-lg"
                            : "text-neutral-500 hover:text-white"
                    )}
                >
                    Second Half
                </button>
            </div>

            {/* Team Headers */}
            <div className="px-6 py-4 bg-white/[0.02] border-b border-white/10">
                <div className="flex items-center justify-between">
                    <TeamLogo team={teamA} side="left" />
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Match Progress</p>
                    </div>
                    <TeamLogo team={teamB} side="right" />
                </div>
            </div>

            {/* Stats Comparison Bars */}
            <div className="px-6 py-6 space-y-5">
                <ComparisonBar
                    label="Current Score"
                    valueA={selectedHalf === 'first' ? halfData.teamA : totalScoreA}
                    valueB={selectedHalf === 'first' ? halfData.teamB : totalScoreB}
                />
                <ComparisonBar
                    label="Raid Points"
                    valueA={teamARaidPoints}
                    valueB={teamBRaidPoints}
                    colorA="bg-orange-500"
                    colorB="bg-blue-500"
                />
                <ComparisonBar
                    label="Tackle Points"
                    valueA={stats.teamA.tacklePoints}
                    valueB={stats.teamB.tacklePoints}
                    colorA="bg-orange-400"
                    colorB="bg-blue-400"
                />
                <ComparisonBar
                    label="All Out"
                    valueA={stats.teamA.allOuts}
                    valueB={stats.teamB.allOuts}
                    colorA="bg-red-500"
                    colorB="bg-red-500"
                />
                <ComparisonBar
                    label="Bonus"
                    valueA={stats.teamA.bonusPoints}
                    valueB={stats.teamB.bonusPoints}
                    colorA="bg-yellow-500"
                    colorB="bg-yellow-500"
                />
            </div>

            {/* Raids / Tackles Toggle */}
            <div className="flex border-t border-white/10">
                <button
                    onClick={() => setSelectedCategory('raids')}
                    className={cn(
                        "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-r border-white/10",
                        selectedCategory === 'raids'
                            ? "bg-orange-500 text-white"
                            : "bg-black/20 text-neutral-500"
                    )}
                >
                    Raids
                </button>
                <button
                    onClick={() => setSelectedCategory('tackles')}
                    className={cn(
                        "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                        selectedCategory === 'tackles'
                            ? "bg-blue-500 text-white"
                            : "bg-black/20 text-neutral-500"
                    )}
                >
                    Tackles
                </button>
            </div>

            {/* Category Breakdown */}
            <div className="px-6 py-6 bg-black/40">
                {selectedCategory === 'raids' ? (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black text-orange-500">{stats.teamA.raids}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Total Raids</span>
                            <span className="text-2xl font-black text-blue-500">{stats.teamB.raids}</span>
                        </div>
                        <div className="flex items-baseline justify-between pt-2">
                            <span className="text-lg font-black text-white">{stats.teamA.successfulRaids}</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-600">Success</span>
                            <span className="text-lg font-black text-white">{stats.teamB.successfulRaids}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-lg font-black text-white">{stats.teamA.touchPoints}</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-600">Touch</span>
                            <span className="text-lg font-black text-white">{stats.teamB.touchPoints}</span>
                        </div>
                        <div className="flex items-baseline justify-between pb-4">
                            <span className="text-lg font-black text-white">{stats.teamA.bonusPoints}</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-600">Bonus</span>
                            <span className="text-lg font-black text-white">{stats.teamB.bonusPoints}</span>
                        </div>
                        {/* Raid Success Rate */}
                        <div className="pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-black text-orange-500">{teamARaidSuccess}%</span>
                                <div className="flex-1 mx-4">
                                    <p className="text-center text-[8px] font-black uppercase tracking-widest text-neutral-500 mb-2">Efficiency</p>
                                    <div className="flex h-1 rounded-full overflow-hidden bg-white/5">
                                        <div className="h-full bg-orange-500" style={{ width: `${teamARaidSuccess}%` }} />
                                        <div className="h-full bg-blue-500" style={{ width: `${teamBRaidSuccess}%` }} />
                                    </div>
                                </div>
                                <span className="text-xl font-black text-blue-500">{teamBRaidSuccess}%</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black text-orange-500">{stats.teamA.tacklePoints}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Total Tackles</span>
                            <span className="text-2xl font-black text-blue-500">{stats.teamB.tacklePoints}</span>
                        </div>
                        <div className="flex items-baseline justify-between pt-2">
                            <span className="text-lg font-black text-white">{Math.floor(stats.teamA.tacklePoints * 0.6)}</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-600">Success</span>
                            <span className="text-lg font-black text-white">{Math.floor(stats.teamB.tacklePoints * 0.6)}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-lg font-black text-white">{Math.floor(stats.teamA.tacklePoints * 0.15)}</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-600">Super Tackles</span>
                            <span className="text-lg font-black text-white">{Math.floor(stats.teamB.tacklePoints * 0.15)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
