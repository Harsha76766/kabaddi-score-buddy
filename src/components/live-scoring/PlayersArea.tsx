import { Player } from "./types";
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";

interface PlayersAreaProps {
    playersA: Player[];
    playersB: Player[];
    activeTeam: "A" | "B";
    selectedRaiderId: string | null;
    outPlayers: string[];
    raidTimer: number;
    isRaidRunning: boolean;
    onSelectRaider: (playerId: string) => void;
    selectionMode: 'RAIDER' | 'DEFENDER';
    selectedDefenderIds: string[];
    onSelectDefender: (playerId: string) => void;
    showFocusOverlay?: boolean;
    isSelecting?: boolean;
    onOpenSubstitution: (team: "A" | "B") => void;
    emptyRaidsA?: number;
    emptyRaidsB?: number;
}

export const PlayersArea = ({
    playersA,
    playersB,
    activeTeam,
    selectedRaiderId,
    outPlayers,
    raidTimer,
    isRaidRunning,
    onSelectRaider,
    selectionMode,
    selectedDefenderIds,
    onSelectDefender,
    showFocusOverlay = false,
    isSelecting = false,
    onOpenSubstitution,
    emptyRaidsA = 0,
    emptyRaidsB = 0
}: PlayersAreaProps) => {
    const isDOD = (activeTeam === "A" && emptyRaidsA >= 2) || (activeTeam === "B" && emptyRaidsB >= 2);

    const renderPlayerBox = (player: Player | null, team: "A" | "B", isSub: boolean = false) => {
        if (isSub || !player) {
            return (
                <div
                    key={`sub-${team}`}
                    onClick={() => onOpenSubstitution(team)}
                    className="h-10 w-9 rounded border border-dashed border-white/20 flex items-center justify-center text-[8px] text-slate-500 font-bold shrink-0 cursor-pointer hover:bg-white/5 hover:text-white transition-all"
                >
                    SUB
                </div>
            );
        }

        const isOut = outPlayers.includes(player.id);
        const isSelectedRaider = selectedRaiderId === player.id;
        const isSelectedDefender = selectedDefenderIds.includes(player.id);

        const isRaidingTeam = activeTeam === team;
        const isDefendingTeam = !isRaidingTeam;

        let isClickable = false;
        if (selectionMode === 'RAIDER') {
            isClickable = !isOut && isRaidingTeam && isSelecting;
        } else {
            isClickable = !isOut && isDefendingTeam;
        }

        const baseClass = "relative h-10 w-9 rounded border-2 flex flex-col items-center justify-center transition-all duration-200 shrink-0";
        const cursorClass = isClickable ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-not-allowed opacity-80";

        const zIndexClass = showFocusOverlay && isClickable ? "z-50 ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "z-0";
        const focusDimmed = showFocusOverlay && !isClickable ? "brightness-50 blur-[1px]" : "";

        let stateClass = "";

        if (isSelectedRaider) {
            stateClass = team === "A"
                ? "bg-gradient-to-br from-red-600 to-red-900 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] scale-110"
                : "bg-gradient-to-br from-blue-600 to-blue-900 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-110";
        } else if (isSelectedDefender) {
            stateClass = "bg-amber-500 border-amber-300 text-black font-bold scale-110 shadow-[0_0_15px_rgba(245,158,11,0.6)]";
        } else if (isOut) {
            stateClass = "bg-red-500/10 border-red-500/30 text-red-400/50 opacity-50";
        } else {
            if (isClickable) {
                stateClass = "bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50";
            } else {
                stateClass = "bg-white/5 border-white/10 text-slate-500";
            }
        }

        const handleClick = () => {
            if (!isClickable) return;
            if (selectionMode === 'RAIDER') {
                onSelectRaider(player.id);
            } else {
                onSelectDefender(player.id);
            }
        };

        const displayName = player.name.split(' ')[0].slice(0, 4);

        return (
            <div
                key={player.id}
                onClick={handleClick}
                className={`${baseClass} ${stateClass} ${cursorClass} ${zIndexClass} ${focusDimmed}`}
            >
                <span className="text-lg font-bold leading-none">
                    {player.jersey_number}
                </span>
                <span className="text-[6px] font-bold uppercase truncate max-w-full px-0.5">
                    {displayName}
                </span>
                {isSelectedRaider && (
                    <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-white flex items-center justify-center">
                        <div className="h-1 w-1 rounded-full bg-red-600 animate-ping" />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-[60px] bg-slate-950 flex items-center relative">
            {/* Team A Players */}
            <div className="flex items-center gap-0.5 px-1 flex-1 justify-center">
                {playersA.slice(0, 7).map(p => renderPlayerBox(p, "A"))}
                {renderPlayerBox(null, "A", true)}
            </div>

            {/* Raid Timer Center */}
            <div className={cn(
                "flex flex-col items-center justify-center w-[70px] h-full bg-slate-900/80 border-x border-slate-800 transition-all relative shrink-0",
                isDOD && "bg-red-950/40 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            )}>
                {isDOD && <div className="absolute -top-0.5 px-1 bg-red-600 text-[5px] font-black rounded animate-bounce">D.O.D</div>}
                <div className="flex items-center gap-1">
                    <Timer className={cn("h-3 w-3 text-slate-500", isDOD && "text-red-400 animate-pulse")} />
                    <span className={cn(
                        "text-2xl font-mono font-black",
                        raidTimer <= 5 ? "text-red-500 animate-pulse" : "text-white",
                        isDOD && "text-red-400"
                    )}>
                        {raidTimer}
                    </span>
                </div>
            </div>

            {/* Team B Players */}
            <div className="flex items-center gap-0.5 px-1 flex-1 justify-center">
                {renderPlayerBox(null, "B", true)}
                {playersB.slice(0, 7).map(p => renderPlayerBox(p, "B"))}
            </div>

            {/* Background Focus Overlay */}
            {showFocusOverlay && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 pointer-events-none" />
            )}
        </div>
    );
};
