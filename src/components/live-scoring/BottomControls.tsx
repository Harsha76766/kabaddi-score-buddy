import { Undo2, Redo2, Play, Square, FastForward, AlertTriangle, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RaidState } from "./types";

interface BottomControlsProps {
    raidState: RaidState;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void | Promise<void>;
    onRedo: () => void | Promise<void>;
    onStopRaid: () => void;
    hasMatchStarted: boolean;
    onStartMatch: () => void;
    onNextRaid: () => void;
    onTechnicalPoint: (team: 'A' | 'B') => void | Promise<void>;
    onManualPoints?: () => void;
    combinedMode?: boolean;
}

export const BottomControls = ({
    raidState,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onStopRaid,
    hasMatchStarted,
    onStartMatch,
    onNextRaid,
    onTechnicalPoint,
    onManualPoints,
    combinedMode = false
}: BottomControlsProps) => {
    return (
        <div className="h-[36px] bg-slate-950 border-t border-slate-900 flex items-center justify-between px-2">
            {/* Left: Undo/Redo */}
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canUndo}
                    onClick={onUndo}
                    className="h-7 px-1.5 text-slate-400 hover:text-white hover:bg-white/5"
                >
                    <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canRedo}
                    onClick={onRedo}
                    className="h-7 px-1.5 text-slate-400 hover:text-white hover:bg-white/5"
                >
                    <Redo2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Center: Tech Points + Manual */}
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTechnicalPoint('A')}
                    className="h-6 border-red-500/30 text-red-400 hover:bg-red-500/10 text-[8px] uppercase font-bold px-1.5"
                >
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                    T-A
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTechnicalPoint('B')}
                    className="h-6 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-[8px] uppercase font-bold px-1.5"
                >
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                    T-B
                </Button>
                {onManualPoints && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onManualPoints}
                        className={cn(
                            "h-6 text-[8px] uppercase font-bold px-1.5",
                            combinedMode
                                ? "bg-amber-600 border-amber-500 text-white"
                                : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        )}
                    >
                        <Edit3 className="h-2.5 w-2.5 mr-0.5" />
                        +/-
                    </Button>
                )}
            </div>

            {/* Right: Main Action Button */}
            <div className="flex items-center">
                {!hasMatchStarted ? (
                    <Button
                        onClick={onStartMatch}
                        className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs shadow-[0_0_15px_rgba(22,163,74,0.4)]"
                    >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        START
                    </Button>
                ) : raidState === 'RAIDING' ? (
                    <Button
                        variant="destructive"
                        onClick={onStopRaid}
                        className="h-7 px-3 text-xs flex items-center gap-1"
                    >
                        <Square className="h-3.5 w-3.5" />
                        CANCEL
                    </Button>
                ) : (
                    <Button
                        onClick={onNextRaid}
                        className="bg-red-600 hover:bg-red-700 text-white h-7 px-3 text-xs flex items-center gap-1 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                    >
                        <FastForward className="h-3.5 w-3.5" />
                        NEXT RAID
                    </Button>
                )}
            </div>
        </div>
    );
};
