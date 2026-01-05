import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, AlertCircle, Clock, Pause } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RaidAction } from "./types";
import { cn } from "@/lib/utils";

interface SplitScoringPanelProps {
    activeTeam: "A" | "B";
    teamAName: string;
    teamBName: string;
    onRecordOutcome: (action: RaidAction) => void;
    selectedRaiderId: string | null;
    onToggleTimeout: (team: "A" | "B") => void;
    emptyRaidsA: number;
    emptyRaidsB: number;
    timeoutsA: number;
    timeoutsB: number;
    isMatchPaused?: boolean;
    maxTimeouts?: number;
    // Combined scoring mode - just enables both sides to be clickable
    combinedMode?: boolean;
}

export const SplitScoringPanel = ({
    activeTeam,
    teamAName,
    teamBName,
    onRecordOutcome,
    selectedRaiderId,
    onToggleTimeout,
    emptyRaidsA,
    emptyRaidsB,
    timeoutsA,
    timeoutsB,
    isMatchPaused = false,
    maxTimeouts = 2,
    combinedMode = false
}: SplitScoringPanelProps) => {
    const [bonusOpen, setBonusOpen] = useState(false);
    const [raidPointsOpen, setRaidPointsOpen] = useState(false);

    const isTeamARaiding = activeTeam === "A";
    // In combined mode, still check raider selection but enable both sides
    const scoringDisabled = !selectedRaiderId || isMatchPaused;

    const handleRaidPoint = (points: number, isBonus: boolean = false) => {
        if (scoringDisabled) return;
        onRecordOutcome({
            raiderId: selectedRaiderId!,
            outcome: 'success',
            touchPoints: points,
            bonusPoint: isBonus,
            defendersOut: [],
            raiderOut: false
        });
    };

    const handleTackle = (points: number, isSuperTackle: boolean = false) => {
        if (scoringDisabled) return;
        onRecordOutcome({
            raiderId: selectedRaiderId!,
            outcome: 'fail',
            touchPoints: 0,
            bonusPoint: false,
            defendersOut: [],
            raiderOut: true,
            tacklerId: undefined
        });
    };

    const handleRaiderOutBound = () => {
        if (scoringDisabled) return;
        onRecordOutcome({
            raiderId: selectedRaiderId!,
            outcome: 'fail',
            touchPoints: 0,
            bonusPoint: false,
            defendersOut: [],
            raiderOut: true,
        });
    };

    const renderTeamHeader = (teamName: string, side: "A" | "B", emptyRaids: number, timeouts: number) => {
        const isRaiding = activeTeam === side;
        const isDOD = isRaiding && emptyRaids >= 2;

        return (
            <div className={cn(
                "flex items-center justify-between px-2 py-1 border-b border-white/5 bg-white/5 rounded-t-lg transition-all",
                combinedMode ? "bg-amber-500/10 border-amber-500/20" : (isRaiding && (side === 'A' ? "bg-red-500/10 border-red-500/20" : "bg-blue-500/10 border-blue-500/20"))
            )}>
                <div className="flex items-center gap-2">
                    <span className="font-rajdhani font-bold text-[10px] text-slate-400 uppercase tracking-tighter">
                        {teamName}
                    </span>
                    {isDOD && (
                        <div className="flex items-center gap-1 bg-red-600 px-1 rounded animate-pulse">
                            <AlertCircle className="h-2 w-2 text-white" />
                            <span className="text-[8px] font-black text-white">D.O.D</span>
                        </div>
                    )}
                    {combinedMode && (
                        <span className="text-[8px] font-bold text-amber-400 bg-amber-500/20 px-1 rounded">
                            {isRaiding ? '🏃 RAID' : '🛡️ DEFEND'}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                        {[1, 2].map((i) => (
                            <div key={i} className={cn(
                                "h-1.5 w-1.5 rounded-full border border-white/10",
                                emptyRaids >= i ? "bg-amber-500 border-amber-400 shadow-[0_0_5px_rgba(245,158,11,0.5)]" : "bg-slate-800"
                            )} />
                        ))}
                    </div>
                    <div className="flex items-center gap-0.5 ml-1">
                        <Clock className="h-2 w-2 text-slate-500" />
                        <span className="text-[9px] font-bold text-slate-400">{maxTimeouts - timeouts}</span>
                    </div>
                </div>
            </div>
        );
    };

    const canTimeout = (side: "A" | "B") => {
        const usedTimeouts = side === 'A' ? timeoutsA : timeoutsB;
        return usedTimeouts < maxTimeouts && !isMatchPaused && !combinedMode;
    };

    const renderDefenseControls = (side: "A" | "B") => {
        const isActive = combinedMode || activeTeam !== side;
        return (
            <div className="flex flex-col gap-1 p-1">
                {/* Scoring buttons */}
                <div className={cn("grid grid-cols-2 gap-1", !isActive && "opacity-50 pointer-events-none")}>
                    <Button
                        onClick={() => handleTackle(1)}
                        className="h-8 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-400 text-purple-400 transition-all font-rajdhani font-bold text-xs"
                    >
                        Tackle
                    </Button>
                    <Button
                        onClick={() => handleTackle(2, true)}
                        className="h-8 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-400 text-purple-400 transition-all font-rajdhani font-bold text-xs"
                    >
                        Super Tackle
                    </Button>
                    <Button
                        onClick={handleRaiderOutBound}
                        className="h-8 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-400 text-red-400 transition-all font-rajdhani font-bold text-[9px] leading-tight"
                    >
                        Raider Out
                    </Button>
                    <Button
                        onClick={() => handleRaidPoint(1)}
                        className="h-8 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 hover:border-green-400 text-green-400 transition-all font-rajdhani font-bold text-[9px] leading-tight"
                    >
                        Defender Out
                    </Button>
                </div>
                {/* Timeout button - hidden in combined mode */}
                {!combinedMode && (
                    <Button
                        onClick={() => onToggleTimeout(side)}
                        disabled={!canTimeout(side)}
                        className={cn(
                            "h-8 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-400 text-yellow-400 transition-all font-rajdhani font-bold text-xs",
                            isMatchPaused && "animate-pulse bg-yellow-500/30"
                        )}
                    >
                        {isMatchPaused ? <><Pause className="h-3 w-3 mr-1" /> PAUSED</> : "Timeout"}
                    </Button>
                )}
            </div>
        );
    };

    const renderRaidingControls = (side: "A" | "B") => {
        const isActive = combinedMode || activeTeam === side;
        return (
            <div className="flex flex-col gap-1 p-1">
                {/* Scoring buttons */}
                <div className={cn("grid grid-cols-4 gap-1", !isActive && "opacity-50 pointer-events-none")}>
                    {[0, 1, 2, 3].map(pts => (
                        <Button
                            key={pts}
                            onClick={() => handleRaidPoint(pts)}
                            className={cn(
                                "h-8 bg-white/5 border border-white/10 transition-all font-rajdhani font-bold text-sm",
                                pts === 0 ? "hover:border-amber-400 hover:text-amber-400" : "hover:border-green-400 hover:text-green-400 text-slate-300"
                            )}
                        >
                            {pts === 0 ? 'Empty' : pts}
                        </Button>
                    ))}
                </div>

                <div className={cn("grid grid-cols-2 gap-1", !isActive && "opacity-50 pointer-events-none")}>
                    <DropdownMenu open={raidPointsOpen} onOpenChange={setRaidPointsOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button className="h-8 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 hover:border-green-400 text-green-400 transition-all font-rajdhani font-bold text-xs">
                                Raid Pts <ChevronDown className="ml-1 h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-900 border-slate-750 w-32">
                            {[4, 5, 6, 7].map(pts => (
                                <DropdownMenuItem
                                    key={pts}
                                    onClick={() => handleRaidPoint(pts)}
                                    className="font-rajdhani font-bold text-green-400 hover:bg-green-500/10 cursor-pointer"
                                >
                                    {pts} Points
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu open={bonusOpen} onOpenChange={setBonusOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button className="h-8 border bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-400 text-orange-400 transition-all font-rajdhani font-bold text-xs">
                                Bonus <ChevronDown className="ml-1 h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-900 border-slate-750 w-40">
                            {[0, 1, 2, 3, 4, 5, 6, 7].map(pts => (
                                <DropdownMenuItem
                                    key={pts}
                                    onClick={() => handleRaidPoint(pts, true)}
                                    className="font-rajdhani font-bold hover:text-orange-400 cursor-pointer text-slate-300"
                                >
                                    {pts === 0 ? "Bonus Only" : `Bonus +${pts}`}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className={cn("grid grid-cols-2 gap-1", !isActive && "opacity-50 pointer-events-none")}>
                    <Button
                        onClick={handleRaiderOutBound}
                        className="h-8 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-400 text-red-400 transition-all font-rajdhani font-bold text-[9px]"
                    >
                        Raider Out
                    </Button>
                </div>

                {/* Timeout button - hidden in combined mode */}
                {!combinedMode && (
                    <Button
                        onClick={() => onToggleTimeout(side)}
                        disabled={!canTimeout(side)}
                        className={cn(
                            "h-8 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-400 text-yellow-400 transition-all font-rajdhani font-bold text-xs",
                            isMatchPaused && "animate-pulse bg-yellow-500/30"
                        )}
                    >
                        {isMatchPaused ? <><Pause className="h-3 w-3 mr-1" /> PAUSED</> : "Timeout"}
                    </Button>
                )}
            </div>
        );
    };


    return (
        <div className="flex-1 flex flex-col gap-1 p-1 min-h-0 overflow-hidden bg-slate-950">
            <div className="flex-1 flex gap-1 min-h-0">
                {/* Team A Panel */}
                <div className={cn(
                    "flex-1 rounded-lg border transition-all duration-300 flex flex-col",
                    combinedMode
                        ? "bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20"
                        : activeTeam === 'A'
                            ? "bg-red-500/5 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20"
                            : "bg-slate-900/40 border-white/5 opacity-70"
                )}>
                    {renderTeamHeader(teamAName, 'A', emptyRaidsA, timeoutsA)}
                    <div className="flex-1 flex flex-col justify-center">
                        {isTeamARaiding ? renderRaidingControls('A') : renderDefenseControls('A')}
                    </div>
                </div>

                {/* Team B Panel */}
                <div className={cn(
                    "flex-1 rounded-lg border transition-all duration-300 flex flex-col",
                    combinedMode
                        ? "bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/20"
                        : activeTeam === 'B'
                            ? "bg-blue-500/5 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20"
                            : "bg-slate-900/40 border-white/5 opacity-70"
                )}>
                    {renderTeamHeader(teamBName, 'B', emptyRaidsB, timeoutsB)}
                    <div className="flex-1 flex flex-col justify-center">
                        {!isTeamARaiding ? renderRaidingControls('B') : renderDefenseControls('B')}
                    </div>
                </div>
            </div>
        </div>
    );
};
