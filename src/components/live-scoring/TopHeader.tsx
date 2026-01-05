import { Timer, Settings, Activity, Shield, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TopHeaderProps {
    timer: number;
    isTimerRunning: boolean;
    half: number | string;
    onOpenSettings?: () => void;
    onToggleTimer?: () => void;
    onOfficialTimeout?: () => void;
    onResumeMatch?: () => void;
    isMatchPaused?: boolean;
    activeTimeout?: "A" | "B" | "OFFICIAL" | null;
    timeoutTimer?: number;
    teamAName?: string;
    teamBName?: string;
}

export const TopHeader = ({
    timer,
    isTimerRunning,
    half,
    onOpenSettings,
    onToggleTimer,
    onOfficialTimeout,
    onResumeMatch,
    isMatchPaused = false,
    activeTimeout,
    timeoutTimer,
    teamAName = "Team A",
    teamBName = "Team B"
}: TopHeaderProps) => {
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getTimeoutTeamName = () => {
        if (activeTimeout === "A") return teamAName;
        if (activeTimeout === "B") return teamBName;
        return "Official";
    };

    return (
        <div className="h-[36px] bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 z-50 relative">
            {/* Left: Timer & Half */}
            <div className="flex items-center gap-2">
                <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded border",
                    isMatchPaused
                        ? "bg-red-950 border-red-500/50"
                        : "bg-slate-950 border-slate-800"
                )}>
                    <Timer className={cn(
                        "h-3.5 w-3.5",
                        isMatchPaused ? "text-red-500" : isTimerRunning ? "text-green-500 animate-pulse" : "text-slate-500"
                    )} />
                    <span className={cn(
                        "text-base font-mono font-bold w-[50px] text-center",
                        isMatchPaused ? "text-red-400" : "text-white"
                    )}>
                        {formatTime(timer)}
                    </span>
                    {isMatchPaused && <Pause className="h-3 w-3 text-red-500" />}
                </div>
                <div className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-bold border",
                    half === 1
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                        : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                )}>
                    {half === 1 ? "1st Half" : "2nd Half"}
                </div>
            </div>

            {/* Center: Timeout Indicator with Resume Button */}
            {isMatchPaused && activeTimeout && (
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-red-600 rounded-lg border border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.6)]">
                    <Activity className="h-4 w-4 animate-pulse" />
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                            {getTimeoutTeamName()} Timeout
                        </span>
                        <span className="text-lg font-mono font-black leading-none">
                            {formatTime(timeoutTimer || 0)}
                        </span>
                    </div>
                    <Button
                        onClick={onResumeMatch}
                        size="sm"
                        className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase shadow-lg"
                    >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Resume
                    </Button>
                </div>
            )}

            {/* Right: Controls */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-7 w-7",
                        activeTimeout === "OFFICIAL" && "bg-amber-500/20 text-amber-500"
                    )}
                    onClick={onOfficialTimeout}
                    title="Official Timeout"
                    disabled={isMatchPaused}
                >
                    <Shield className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-white"
                    onClick={onOpenSettings}
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
