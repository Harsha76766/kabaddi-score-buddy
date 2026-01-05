import { Player } from "./types";
import { Badge } from "@/components/ui/badge";

interface PlayerStripProps {
    players: Player[];
    activeTeam: "A" | "B";
    selectedRaiderId: string | null;
    outPlayers: string[];
    onSelectRaider: (playerId: string) => void;
}

export const PlayerStrip = ({
    players,
    activeTeam,
    selectedRaiderId,
    outPlayers,
    onSelectRaider
}: PlayerStripProps) => {
    const themeColor = activeTeam === "A" ? "red" : "blue";
    const themeClass = activeTeam === "A" ? "bg-red-600 border-red-400" : "bg-blue-600 border-blue-400";
    const ringClass = activeTeam === "A" ? "ring-red-500/30" : "ring-blue-500/30";

    return (
        <div className="h-[100px] bg-slate-900/50 border-b border-slate-800 overflow-x-auto overflow-y-hidden shrink-0">
            <div className="h-full flex items-center px-4 gap-3 min-w-max">
                {players.map((player) => {
                    const isOut = outPlayers.includes(player.id);
                    const isSelected = selectedRaiderId === player.id;

                    return (
                        <button
                            key={player.id}
                            onClick={() => !isOut && onSelectRaider(player.id)}
                            disabled={isOut}
                            className={`
                relative h-[80px] w-[80px] rounded-xl border-2 flex flex-col items-center justify-center
                transition-all duration-300 shrink-0
                ${isSelected
                                    ? `${themeClass} text-white shadow-lg scale-105 ring-4 ${ringClass} z-10`
                                    : isOut
                                        ? 'bg-slate-800/30 border-slate-700 text-slate-600 opacity-50 cursor-not-allowed'
                                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                                }
              `}
                        >
                            {/* Jersey Number */}
                            <span className={`text-2xl font-bold ${isSelected ? 'text-white' : isOut ? 'text-slate-600' : 'text-slate-200'}`}>
                                {player.jersey_number || "?"}
                            </span>

                            {/* Name */}
                            <span className="text-[10px] font-medium truncate w-full text-center px-1 mt-1">
                                {player.name.split(' ')[0]}
                            </span>

                            {/* Status Badge */}
                            {isSelected && (
                                <Badge className="absolute -bottom-2 px-2 py-0 text-[8px] bg-white text-black border-0">
                                    RAIDING
                                </Badge>
                            )}
                            {isOut && (
                                <Badge variant="destructive" className="absolute -bottom-2 px-2 py-0 text-[8px]">
                                    OUT
                                </Badge>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
