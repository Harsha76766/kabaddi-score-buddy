import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Player } from "./types";
import { Check, Users, ListOrdered, Coins } from "lucide-react";

interface TieBreakerSetupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamAName: string;
    teamBName: string;
    playersA: Player[];
    playersB: Player[];
    onComplete: (setup: {
        playingA: string[];
        playingB: string[];
        raidersA: string[];
        raidersB: string[];
        firstRaidingTeam: 'A' | 'B';
    }) => void;
}

type Step = 'players_a' | 'players_b' | 'raiders_a' | 'raiders_b' | 'toss' | 'ready';

export const TieBreakerSetupDialog = ({
    open,
    onOpenChange,
    teamAName,
    teamBName,
    playersA,
    playersB,
    onComplete
}: TieBreakerSetupDialogProps) => {
    const [step, setStep] = useState<Step>('players_a');
    const [selectedPlayersA, setSelectedPlayersA] = useState<string[]>([]);
    const [selectedPlayersB, setSelectedPlayersB] = useState<string[]>([]);
    const [orderedRaidersA, setOrderedRaidersA] = useState<string[]>([]);
    const [orderedRaidersB, setOrderedRaidersB] = useState<string[]>([]);
    const [tossWinner, setTossWinner] = useState<'A' | 'B' | null>(null);
    const [tossChoice, setTossChoice] = useState<'raid' | 'defend' | null>(null);
    const [showTossResult, setShowTossResult] = useState(false);

    const handleSelectPlayer = (id: string, team: 'A' | 'B') => {
        if (team === 'A') {
            setSelectedPlayersA(prev =>
                prev.includes(id)
                    ? prev.filter(p => p !== id)
                    : prev.length < 7 ? [...prev, id] : prev
            );
        } else {
            setSelectedPlayersB(prev =>
                prev.includes(id)
                    ? prev.filter(p => p !== id)
                    : prev.length < 7 ? [...prev, id] : prev
            );
        }
    };

    const handleSelectRaider = (id: string, team: 'A' | 'B') => {
        if (team === 'A') {
            setOrderedRaidersA(prev =>
                prev.includes(id)
                    ? prev.filter(p => p !== id)
                    : prev.length < 5 ? [...prev, id] : prev
            );
        } else {
            setOrderedRaidersB(prev =>
                prev.includes(id)
                    ? prev.filter(p => p !== id)
                    : prev.length < 5 ? [...prev, id] : prev
            );
        }
    };

    const handleToss = () => {
        const winner = Math.random() < 0.5 ? 'A' : 'B';
        setTossWinner(winner);
        setShowTossResult(true);
    };

    const handleTossChoice = (choice: 'raid' | 'defend') => {
        setTossChoice(choice);
        setStep('ready');
    };

    const handleStart = () => {
        if (!tossWinner || !tossChoice) return;

        // Determine which team raids first
        let firstRaidingTeam: 'A' | 'B';
        if (tossChoice === 'raid') {
            firstRaidingTeam = tossWinner;
        } else {
            firstRaidingTeam = tossWinner === 'A' ? 'B' : 'A';
        }

        onComplete({
            playingA: selectedPlayersA,
            playingB: selectedPlayersB,
            raidersA: orderedRaidersA,
            raidersB: orderedRaidersB,
            firstRaidingTeam
        });
    };

    const getStepTitle = () => {
        switch (step) {
            case 'players_a': return `Select 7 Players - ${teamAName}`;
            case 'players_b': return `Select 7 Players - ${teamBName}`;
            case 'raiders_a': return `Select 5 Raiders (in order) - ${teamAName}`;
            case 'raiders_b': return `Select 5 Raiders (in order) - ${teamBName}`;
            case 'toss': return 'Toss';
            case 'ready': return 'Ready to Start';
        }
    };

    const canProceed = () => {
        switch (step) {
            case 'players_a': return selectedPlayersA.length === 7;
            case 'players_b': return selectedPlayersB.length === 7;
            case 'raiders_a': return orderedRaidersA.length === 5;
            case 'raiders_b': return orderedRaidersB.length === 5;
            case 'toss': return showTossResult && tossChoice !== null;
            case 'ready': return true;
        }
    };

    const handleNext = () => {
        switch (step) {
            case 'players_a': setStep('players_b'); break;
            case 'players_b': setStep('raiders_a'); break;
            case 'raiders_a': setStep('raiders_b'); break;
            case 'raiders_b': setStep('toss'); break;
            case 'toss': setStep('ready'); break;
            case 'ready': handleStart(); break;
        }
    };

    const renderPlayerGrid = (players: Player[], selected: string[], team: 'A' | 'B') => (
        <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-auto">
            {players.map(player => (
                <Button
                    key={player.id}
                    variant="outline"
                    onClick={() => handleSelectPlayer(player.id, team)}
                    className={cn(
                        "h-12 flex flex-col items-center justify-center text-xs",
                        selected.includes(player.id)
                            ? team === 'A'
                                ? "bg-red-600 border-red-500 text-white"
                                : "bg-blue-600 border-blue-500 text-white"
                            : "border-slate-700 hover:bg-slate-800"
                    )}
                >
                    <span className="font-bold">{player.jersey_number}</span>
                    <span className="text-[9px] truncate max-w-full">{player.name.split(' ')[0]}</span>
                    {selected.includes(player.id) && (
                        <span className="text-[8px]">#{selected.indexOf(player.id) + 1}</span>
                    )}
                </Button>
            ))}
        </div>
    );

    const renderRaiderSelection = (players: Player[], selected: string[], orderedRaiders: string[], team: 'A' | 'B') => {
        const eligiblePlayers = players.filter(p => selected.includes(p.id));
        return (
            <div className="space-y-3">
                <div className="flex gap-2 justify-center mb-2">
                    {[1, 2, 3, 4, 5].map(n => {
                        const riderId = orderedRaiders[n - 1];
                        const raider = riderId ? players.find(p => p.id === riderId) : null;
                        return (
                            <div
                                key={n}
                                className={cn(
                                    "w-12 h-12 rounded-lg border-2 flex flex-col items-center justify-center text-xs",
                                    raider
                                        ? team === 'A' ? "bg-red-600 border-red-500" : "bg-blue-600 border-blue-500"
                                        : "border-dashed border-slate-600 text-slate-500"
                                )}
                            >
                                {raider ? (
                                    <>
                                        <span className="font-bold text-white">{raider.jersey_number}</span>
                                        <span className="text-[8px] text-white/80">Raid {n}</span>
                                    </>
                                ) : (
                                    <span>#{n}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {eligiblePlayers.map(player => (
                        <Button
                            key={player.id}
                            variant="outline"
                            onClick={() => handleSelectRaider(player.id, team)}
                            disabled={orderedRaiders.length >= 5 && !orderedRaiders.includes(player.id)}
                            className={cn(
                                "h-10 text-xs",
                                orderedRaiders.includes(player.id)
                                    ? team === 'A'
                                        ? "bg-red-600 border-red-500 text-white"
                                        : "bg-blue-600 border-blue-500 text-white"
                                    : "border-slate-700"
                            )}
                        >
                            {player.jersey_number} - {player.name.split(' ')[0]}
                        </Button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-lg max-h-[90vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-400">
                        {step === 'toss' ? <Coins className="h-5 w-5" /> :
                            step.includes('raiders') ? <ListOrdered className="h-5 w-5" /> :
                                <Users className="h-5 w-5" />}
                        🏆 Tie-Breaker Setup
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Step indicator */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className={cn(step.includes('players') && "text-amber-400 font-bold")}>Players</span>
                        <span>→</span>
                        <span className={cn(step.includes('raiders') && "text-amber-400 font-bold")}>Raiders Order</span>
                        <span>→</span>
                        <span className={cn(step === 'toss' && "text-amber-400 font-bold")}>Toss</span>
                        <span>→</span>
                        <span className={cn(step === 'ready' && "text-amber-400 font-bold")}>Start</span>
                    </div>

                    <h3 className="text-lg font-bold text-center">{getStepTitle()}</h3>

                    {/* Player Selection A */}
                    {step === 'players_a' && (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-400 text-center">Select 7 players for the shootout ({selectedPlayersA.length}/7)</p>
                            {renderPlayerGrid(playersA, selectedPlayersA, 'A')}
                        </div>
                    )}

                    {/* Player Selection B */}
                    {step === 'players_b' && (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-400 text-center">Select 7 players for the shootout ({selectedPlayersB.length}/7)</p>
                            {renderPlayerGrid(playersB, selectedPlayersB, 'B')}
                        </div>
                    )}

                    {/* Raiders A */}
                    {step === 'raiders_a' && (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-400 text-center">Select 5 raiders in order (click to add, click again to remove)</p>
                            {renderRaiderSelection(playersA, selectedPlayersA, orderedRaidersA, 'A')}
                        </div>
                    )}

                    {/* Raiders B */}
                    {step === 'raiders_b' && (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-400 text-center">Select 5 raiders in order (click to add, click again to remove)</p>
                            {renderRaiderSelection(playersB, selectedPlayersB, orderedRaidersB, 'B')}
                        </div>
                    )}

                    {/* Toss */}
                    {step === 'toss' && (
                        <div className="text-center space-y-4">
                            {!showTossResult ? (
                                <Button
                                    onClick={handleToss}
                                    className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-4 text-lg"
                                >
                                    <Coins className="h-5 w-5 mr-2" />
                                    Flip Coin
                                </Button>
                            ) : (
                                <div className="space-y-4">
                                    <div className={cn(
                                        "text-2xl font-bold",
                                        tossWinner === 'A' ? "text-red-400" : "text-blue-400"
                                    )}>
                                        🎉 {tossWinner === 'A' ? teamAName : teamBName} wins the toss!
                                    </div>

                                    {tossChoice === null && (
                                        <div className="space-y-2">
                                            <p className="text-sm text-slate-300">Choose to:</p>
                                            <div className="flex gap-3 justify-center">
                                                <Button
                                                    onClick={() => handleTossChoice('raid')}
                                                    className="bg-green-600 hover:bg-green-500 px-6"
                                                >
                                                    🏃 Raid First
                                                </Button>
                                                <Button
                                                    onClick={() => handleTossChoice('defend')}
                                                    className="bg-purple-600 hover:bg-purple-500 px-6"
                                                >
                                                    🛡️ Defend First
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {tossChoice && (
                                        <p className="text-sm text-slate-300">
                                            {tossWinner === 'A' ? teamAName : teamBName} chose to {tossChoice} first
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ready */}
                    {step === 'ready' && (
                        <div className="text-center space-y-3">
                            <Check className="h-12 w-12 text-green-400 mx-auto" />
                            <p className="text-lg font-bold text-green-400">Setup Complete!</p>
                            <p className="text-sm text-slate-300">
                                {(tossChoice === 'raid' ? tossWinner : (tossWinner === 'A' ? 'B' : 'A')) === 'A'
                                    ? teamAName
                                    : teamBName} will raid first
                            </p>
                            <div className="text-xs text-slate-400">
                                <p>• 5 raids per team (10 total)</p>
                                <p>• No timer, no outs/revivals</p>
                                <p>• Only points scored count</p>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                        {step !== 'players_a' && step !== 'ready' && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const steps: Step[] = ['players_a', 'players_b', 'raiders_a', 'raiders_b', 'toss', 'ready'];
                                    const idx = steps.indexOf(step);
                                    if (idx > 0) setStep(steps[idx - 1]);
                                }}
                                className="border-slate-700"
                            >
                                Back
                            </Button>
                        )}
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className={cn(
                                "px-6",
                                step === 'ready'
                                    ? "bg-green-600 hover:bg-green-500"
                                    : "bg-amber-600 hover:bg-amber-500"
                            )}
                        >
                            {step === 'ready' ? 'Start Tie-Breaker' : 'Next'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
