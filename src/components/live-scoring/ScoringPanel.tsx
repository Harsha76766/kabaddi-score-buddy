import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X, User } from "lucide-react";
import { Player, RaidState, RaidAction } from "./types";

interface ScoringPanelProps {
    raidState: RaidState;
    activeTeam: "A" | "B";
    raider: Player | null;
    defenders: Player[];
    outDefenders: string[];
    onRecordOutcome: (action: RaidAction) => void;
    onCancelRaid: () => void;
}

export const ScoringPanel = ({
    raidState,
    activeTeam,
    raider,
    defenders,
    outDefenders,
    onRecordOutcome,
    onCancelRaid
}: ScoringPanelProps) => {
    // Local state for the form
    const [outcomeType, setOutcomeType] = useState<'success' | 'fail' | null>(null);
    const [selectedDefenders, setSelectedDefenders] = useState<string[]>([]);
    const [bonusPoint, setBonusPoint] = useState(false);

    // Reset form when raid state changes
    useEffect(() => {
        if (raidState === 'RAIDING') {
            setOutcomeType(null);
            setSelectedDefenders([]);
            setBonusPoint(false);
        }
    }, [raidState]);

    // Helper to toggle defender selection
    const toggleDefender = (id: string) => {
        if (outcomeType === 'fail') {
            // For tackle, only select one
            setSelectedDefenders([id]);
        } else {
            // For raid, toggle multiple
            setSelectedDefenders(prev =>
                prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
            );
        }
    };

    // Calculate total points for preview
    const totalPoints = outcomeType === 'success'
        ? selectedDefenders.length + (bonusPoint ? 1 : 0)
        : outcomeType === 'fail' ? 1 : 0;

    // Handle submission to parent
    const handleSubmit = () => {
        if (!raider || !outcomeType) return;

        onRecordOutcome({
            raiderId: raider.id,
            outcome: outcomeType,
            touchPoints: outcomeType === 'success' ? selectedDefenders.length : 0,
            bonusPoint: outcomeType === 'success' ? bonusPoint : false,
            defendersOut: outcomeType === 'success' ? selectedDefenders : [],
            raiderOut: outcomeType === 'fail',
            tacklerId: outcomeType === 'fail' ? selectedDefenders[0] : undefined
        });
    };

    // --- RENDER STATES ---

    // 1. IDLE / SELECT RAIDER
    if (raidState === 'IDLE') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-8">
                <div className="animate-bounce mb-4">
                    <User className="h-12 w-12 opacity-50" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">SELECT RAIDER</h2>
                <p>Tap a player from the strip above to begin raid</p>
            </div>
        );
    }

    // 2. RAIDING / RECORD OUTCOME
    if (raidState === 'RAIDING' || raidState === 'OUTCOME') {
        return (
            <div className="flex-1 bg-slate-900 p-4 overflow-y-auto">
                {/* Current Raider Info */}
                <div className={`flex items-center justify-between p-3 rounded-lg mb-4 ${activeTeam === 'A' ? 'bg-red-900/20 border border-red-900/50' : 'bg-blue-900/20 border border-blue-900/50'}`}>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏃</span>
                        <div>
                            <div className="text-xs text-slate-400">Current Raider</div>
                            <div className="font-bold text-white">{raider?.name} <span className="text-slate-400">#{raider?.jersey_number}</span></div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onCancelRaid} className="text-slate-400 hover:text-white">
                        Change
                    </Button>
                </div>

                {/* Outcome Selector */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                        onClick={() => { setOutcomeType('success'); setSelectedDefenders([]); }}
                        className={`h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${outcomeType === 'success'
                            ? 'bg-green-600 border-green-400 text-white shadow-lg'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <Check className="h-8 w-8" />
                        <span className="font-bold">SUCCESSFUL RAID</span>
                    </button>

                    <button
                        onClick={() => { setOutcomeType('fail'); setSelectedDefenders([]); }}
                        className={`h-24 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${outcomeType === 'fail'
                            ? 'bg-red-600 border-red-400 text-white shadow-lg'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <X className="h-8 w-8" />
                        <span className="font-bold">RAIDER OUT</span>
                    </button>
                </div>

                {/* Dynamic Form based on Outcome */}
                {outcomeType && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                        {/* Defender Selection */}
                        <div>
                            <div className="text-sm font-bold text-slate-400 mb-3 uppercase">
                                {outcomeType === 'success' ? 'Select Defenders Touched' : 'Select Defender Who Tackled'}
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                {defenders.map(defender => {
                                    const isOut = outDefenders.includes(defender.id);
                                    const isSelected = selectedDefenders.includes(defender.id);

                                    if (isOut) return null; // Don't show out defenders

                                    return (
                                        <button
                                            key={defender.id}
                                            onClick={() => toggleDefender(defender.id)}
                                            className={`
                        aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-1
                        transition-all
                        ${isSelected
                                                    ? outcomeType === 'success'
                                                        ? 'bg-green-500/20 border-green-500 text-green-400'
                                                        : 'bg-red-500/20 border-red-500 text-red-400'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                                }
                      `}
                                        >
                                            <span className="text-lg font-bold">#{defender.jersey_number}</span>
                                            <span className="text-[10px] truncate w-full text-center">{defender.name.split(' ')[0]}</span>
                                            {isSelected && <div className={`w-2 h-2 rounded-full mt-1 ${outcomeType === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Bonus Point Toggle (Only for Success) */}
                        {outcomeType === 'success' && (
                            <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-white">Bonus Point</Label>
                                    <div className="text-xs text-slate-400">Raider crossed bonus line</div>
                                </div>
                                <Switch
                                    checked={bonusPoint}
                                    onCheckedChange={setBonusPoint}
                                    className="data-[state=checked]:bg-orange-500"
                                />
                            </div>
                        )}

                        {/* Summary Box */}
                        <div className={`p-4 rounded-xl border ${outcomeType === 'success' ? 'bg-green-900/20 border-green-900/50' : 'bg-red-900/20 border-red-900/50'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-400">Total Points</span>
                                <span className="text-2xl font-bold text-white">+{totalPoints}</span>
                            </div>
                            <Button
                                className={`w-full font-bold ${outcomeType === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                onClick={handleSubmit}
                                disabled={outcomeType === 'fail' && selectedDefenders.length === 0}
                            >
                                CONFIRM OUTCOME
                            </Button>
                        </div>

                    </div>
                )}
            </div>
        );
    }

    // 3. CONFIRMATION
    if (raidState === 'CONFIRM') {
        // We need the pending action details here. 
        // For now, we'll rely on the parent to pass the pending action or we can reconstruct it from local state if we didn't reset it.
        // Actually, better to have the parent pass the pendingAction prop.
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 p-8 text-center">
                <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                    <Check className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">RAID RECORDED</h2>
                <p className="text-slate-400 mb-6">Ready to submit?</p>

                <div className="bg-slate-800 rounded-xl p-4 w-full max-w-md border border-slate-700">
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-400">Raider</span>
                        <span className="font-bold text-white">{raider?.name}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-400">Outcome</span>
                        <span className={`font-bold ${outcomeType === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {outcomeType === 'success' ? 'Successful' : 'Raider Out'}
                        </span>
                    </div>
                    <div className="border-t border-slate-700 my-2 pt-2 flex justify-between">
                        <span className="text-slate-400">Points</span>
                        <span className="font-bold text-white text-xl">+{totalPoints}</span>
                    </div>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                    Tap "Undo" below to change
                </p>
            </div>
        );
    }

    return null;
};
