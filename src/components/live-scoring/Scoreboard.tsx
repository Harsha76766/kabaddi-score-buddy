import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Team } from "./types";
import { ShieldAlert } from "lucide-react";

interface ScoreboardProps {
    teamA: Team;
    teamB: Team;
    scoreA: number;
    scoreB: number;
    activeTeam: "A" | "B";
    lastRaids: string[];
    isSuperTackleOnA: boolean;
    isSuperTackleOnB: boolean;
    emptyRaidsA?: number;
    emptyRaidsB?: number;
}

export const Scoreboard = ({
    teamA,
    teamB,
    scoreA,
    scoreB,
    activeTeam,
    lastRaids,
    isSuperTackleOnA,
    isSuperTackleOnB,
    emptyRaidsA = 0,
    emptyRaidsB = 0
}: ScoreboardProps) => {
    const isDODA = activeTeam === 'A' && emptyRaidsA >= 2;
    const isDODB = activeTeam === 'B' && emptyRaidsB >= 2;

    const teamAName = teamA?.name || "Team A";
    const teamBName = teamB?.name || "Team B";

    return (
        <div className={cn(
            "h-[70px] bg-slate-900 border-b border-slate-800 flex shrink-0 transition-all overflow-hidden",
            (isDODA || isDODB) && "ring-1 ring-red-500/50 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]"
        )}>
            {/* Team A */}
            <div className={cn(
                "flex-1 flex items-center justify-between px-3 py-1 transition-all duration-300",
                activeTeam === 'A' ? 'bg-red-500/10 border-r border-red-500/30' : 'border-r border-slate-800'
            )}>
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-red-400 truncate max-w-[100px]">
                            {teamAName}
                        </span>
                        {isSuperTackleOnA && (
                            <div className="flex items-center gap-0.5 px-1 bg-yellow-500/20 border border-yellow-500/40 rounded text-[8px] text-yellow-400">
                                <ShieldAlert className="w-2.5 h-2.5" /> ST
                            </div>
                        )}
                        {isDODA && <Badge className="bg-red-600 text-[7px] h-3 px-1 animate-pulse border-none">DOD</Badge>}
                    </div>
                    {activeTeam === 'A' && (
                        <span className="text-[9px] text-red-500/70 font-bold uppercase flex items-center gap-1">
                            RAIDING <div className="h-1 w-1 rounded-full bg-red-500 animate-ping" />
                        </span>
                    )}
                </div>
                <div className="text-4xl font-mono font-bold text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    {scoreA}
                </div>
            </div>

            {/* VS Divider */}
            <div className="w-[40px] flex items-center justify-center bg-slate-950">
                <span className="text-slate-600 font-bold text-xs">VS</span>
            </div>

            {/* Team B */}
            <div className={cn(
                "flex-1 flex items-center justify-between px-3 py-1 transition-all duration-300",
                activeTeam === 'B' ? 'bg-blue-500/10 border-l border-blue-500/30' : 'border-l border-slate-800'
            )}>
                <div className="text-4xl font-mono font-bold text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                    {scoreB}
                </div>
                <div className="flex flex-col items-end min-w-0">
                    <div className="flex items-center gap-1.5">
                        {isDODB && <Badge className="bg-red-600 text-[7px] h-3 px-1 animate-pulse border-none">DOD</Badge>}
                        {isSuperTackleOnB && (
                            <div className="flex items-center gap-0.5 px-1 bg-yellow-500/20 border border-yellow-500/40 rounded text-[8px] text-yellow-400">
                                <ShieldAlert className="w-2.5 h-2.5" /> ST
                            </div>
                        )}
                        <span className="text-sm font-bold text-blue-400 truncate max-w-[100px]">
                            {teamBName}
                        </span>
                    </div>
                    {activeTeam === 'B' && (
                        <span className="text-[9px] text-blue-500/70 font-bold uppercase flex items-center gap-1">
                            <div className="h-1 w-1 rounded-full bg-blue-500 animate-ping" /> RAIDING
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
