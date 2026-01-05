import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trophy, Zap, Target } from "lucide-react";

interface TieBreakerOverlayProps {
    phase: 'shootout' | 'golden_raid' | 'complete';
    teamAName: string;
    teamBName: string;
    shootoutScore: { A: number; B: number };
    shootoutRaids: { A: number; B: number };
    currentTeam: 'A' | 'B';
    goldenRaidTeam: 'A' | 'B' | null;
    winner: 'A' | 'B' | null;
    onRecordShootoutPoints: (points: number) => void;
    onStartGoldenRaid: () => void;
    onEndMatch: () => void;
}

export const TieBreakerOverlay = ({
    phase,
    teamAName,
    teamBName,
    shootoutScore,
    shootoutRaids,
    currentTeam,
    goldenRaidTeam,
    winner,
    onRecordShootoutPoints,
    onStartGoldenRaid,
    onEndMatch
}: TieBreakerOverlayProps) => {
    const totalShootoutRaids = shootoutRaids.A + shootoutRaids.B;
    const maxRaids = 10; // 5 per team

    const currentTeamName = currentTeam === 'A' ? teamAName : teamBName;
    const goldenTeamName = goldenRaidTeam === 'A' ? teamAName : teamBName;
    const winnerName = winner === 'A' ? teamAName : teamBName;

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-900/95 via-slate-900/98 to-amber-900/95 z-50 flex flex-col items-center justify-center p-4">
            {/* Header */}
            <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                    {phase === 'complete' ? (
                        <Trophy className="h-6 w-6 text-amber-400" />
                    ) : phase === 'golden_raid' ? (
                        <Zap className="h-6 w-6 text-yellow-400 animate-pulse" />
                    ) : (
                        <Target className="h-6 w-6 text-orange-400" />
                    )}
                    <h1 className="text-2xl font-bold text-amber-400 font-rajdhani tracking-wider">
                        {phase === 'complete' ? '🏆 WINNER' : phase === 'golden_raid' ? '⚡ GOLDEN RAID' : '🎯 TIE-BREAKER'}
                    </h1>
                </div>
                {phase === 'shootout' && (
                    <p className="text-xs text-amber-300/70">Five-Raid Shootout • Baulk = Bonus Line</p>
                )}
                {phase === 'golden_raid' && (
                    <p className="text-xs text-yellow-300/70">Winner Takes All!</p>
                )}
            </div>

            {/* Winner Display */}
            {phase === 'complete' && winner && (
                <div className="text-center mb-6">
                    <div className={cn(
                        "text-4xl font-bold font-rajdhani animate-pulse",
                        winner === 'A' ? "text-red-400" : "text-blue-400"
                    )}>
                        {winnerName}
                    </div>
                    <p className="text-amber-300/70 text-sm mt-1">Wins the Tie-Breaker!</p>
                    <Button
                        onClick={onEndMatch}
                        className="mt-4 bg-amber-600 hover:bg-amber-500 text-white px-6"
                    >
                        End Match
                    </Button>
                </div>
            )}

            {/* Shootout Phase */}
            {phase === 'shootout' && (
                <>
                    {/* Scores */}
                    <div className="flex gap-8 mb-4">
                        <div className={cn(
                            "text-center px-6 py-3 rounded-lg border transition-all",
                            currentTeam === 'A'
                                ? "bg-red-500/20 border-red-500/50 ring-2 ring-red-500/30"
                                : "bg-slate-800/50 border-slate-700"
                        )}>
                            <div className="text-xs text-red-400 font-bold">{teamAName}</div>
                            <div className="text-3xl font-bold text-white font-rajdhani">{shootoutScore.A}</div>
                            <div className="text-[9px] text-slate-400">{shootoutRaids.A}/5 raids</div>
                        </div>
                        <div className={cn(
                            "text-center px-6 py-3 rounded-lg border transition-all",
                            currentTeam === 'B'
                                ? "bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30"
                                : "bg-slate-800/50 border-slate-700"
                        )}>
                            <div className="text-xs text-blue-400 font-bold">{teamBName}</div>
                            <div className="text-3xl font-bold text-white font-rajdhani">{shootoutScore.B}</div>
                            <div className="text-[9px] text-slate-400">{shootoutRaids.B}/5 raids</div>
                        </div>
                    </div>

                    {/* Current Raider Info */}
                    <div className="text-center mb-4">
                        <p className="text-sm text-amber-300/80">
                            Raid {totalShootoutRaids + 1} of {maxRaids}
                        </p>
                        <p className={cn(
                            "text-lg font-bold",
                            currentTeam === 'A' ? "text-red-400" : "text-blue-400"
                        )}>
                            {currentTeamName} is Raiding
                        </p>
                    </div>

                    {/* Point Buttons */}
                    <div className="grid grid-cols-4 gap-2 max-w-xs">
                        {[0, 1, 2, 3].map(pts => (
                            <Button
                                key={pts}
                                onClick={() => onRecordShootoutPoints(pts)}
                                className={cn(
                                    "h-12 text-lg font-bold font-rajdhani transition-all",
                                    pts === 0
                                        ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                                        : "bg-green-600 hover:bg-green-500 text-white"
                                )}
                            >
                                {pts === 0 ? "Empty" : `+${pts}`}
                            </Button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-w-xs mt-2">
                        <Button
                            onClick={() => onRecordShootoutPoints(4)}
                            className="h-10 bg-green-600 hover:bg-green-500 text-white font-rajdhani font-bold"
                        >
                            +4 (Bonus)
                        </Button>
                        <Button
                            onClick={() => onRecordShootoutPoints(5)}
                            className="h-10 bg-green-600 hover:bg-green-500 text-white font-rajdhani font-bold"
                        >
                            +5 (Max)
                        </Button>
                    </div>
                    <p className="text-[9px] text-amber-300/50 mt-2">No outs/revivals • Only points count</p>
                </>
            )}

            {/* Golden Raid Phase */}
            {phase === 'golden_raid' && goldenRaidTeam && (
                <>
                    <div className="text-center mb-6">
                        <p className={cn(
                            "text-2xl font-bold",
                            goldenRaidTeam === 'A' ? "text-red-400" : "text-blue-400"
                        )}>
                            {goldenTeamName} is Raiding
                        </p>
                        <p className="text-xs text-yellow-300/70 mt-1">
                            Any point → {goldenTeamName} wins!
                        </p>
                        <p className="text-xs text-slate-400">
                            0 points → {goldenRaidTeam === 'A' ? teamBName : teamAName} wins!
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-w-xs">
                        <Button
                            onClick={() => onRecordShootoutPoints(0)}
                            className="h-14 bg-red-600 hover:bg-red-500 text-white font-rajdhani font-bold text-lg"
                        >
                            0 Points
                            <span className="block text-[9px] font-normal opacity-70">
                                {goldenRaidTeam === 'A' ? teamBName : teamAName} Wins
                            </span>
                        </Button>
                        <Button
                            onClick={() => onRecordShootoutPoints(1)}
                            className="h-14 bg-green-600 hover:bg-green-500 text-white font-rajdhani font-bold text-lg"
                        >
                            1+ Points
                            <span className="block text-[9px] font-normal opacity-70">
                                {goldenTeamName} Wins
                            </span>
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};
