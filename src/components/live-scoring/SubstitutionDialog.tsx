import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Player } from "./types";
import { ArrowLeftRight, ArrowDown } from "lucide-react";

interface SubstitutionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    teamName: string;
    activePlayers: Player[]; // Indices 0-6
    benchPlayers: Player[];  // Indices 7+
    onConfirm: (activePlayerId: string, benchPlayerId: string) => void;
}

export const SubstitutionDialog = ({
    isOpen,
    onClose,
    teamName,
    activePlayers,
    benchPlayers,
    onConfirm
}: SubstitutionDialogProps) => {
    const [selectedActiveId, setSelectedActiveId] = useState<string | null>(null);
    const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null);

    const handleConfirm = () => {
        if (selectedActiveId && selectedBenchId) {
            onConfirm(selectedActiveId, selectedBenchId);
            onClose();
            setSelectedActiveId(null);
            setSelectedBenchId(null);
        }
    };

    const renderPlayerList = (players: Player[], selectedId: string | null, onSelect: (id: string) => void, title: string) => (
        <div className="flex-1 flex flex-col gap-1">
            <h3 className="text-xs lg:text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</h3>
            <div className="flex-1 overflow-y-auto max-h-[120px] lg:max-h-[200px] space-y-1 pr-1">
                {players.map(p => (
                    <div
                        key={p.id}
                        onClick={() => onSelect(p.id)}
                        className={`p-2 lg:p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-sm lg:text-base ${selectedId === p.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                            : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                            }`}
                    >
                        <div className="flex items-center gap-2 lg:gap-3">
                            <span className="font-rajdhani font-bold text-lg lg:text-xl w-7 lg:w-8 text-center">{p.jersey_number}</span>
                            <span className="font-medium truncate max-w-[80px] lg:max-w-[120px]">{p.name}</span>
                        </div>
                        {selectedId === p.id && <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>}
                    </div>
                ))}
                {players.length === 0 && (
                    <div className="text-slate-600 text-center py-2 italic text-sm">No players available</div>
                )}
            </div>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg lg:text-2xl font-rajdhani font-bold flex items-center gap-2 lg:gap-3">
                        <ArrowLeftRight className="text-amber-500 h-5 w-5 lg:h-6 lg:w-6" />
                        Substitution - {teamName}
                    </DialogTitle>
                </DialogHeader>

                {/* Landscape: side by side, Portrait: stacked */}
                <div className="flex flex-row gap-3 lg:gap-4 py-2 lg:py-4 min-h-[150px] lg:min-h-[250px]">
                    {renderPlayerList(activePlayers, selectedActiveId, setSelectedActiveId, "On Court")}

                    <div className="flex items-center justify-center px-1 lg:px-2">
                        <ArrowLeftRight className="text-slate-600 w-5 h-5 lg:w-6 lg:h-6 hidden lg:block" />
                        <ArrowDown className="text-slate-600 w-4 h-4 lg:hidden rotate-90" />
                    </div>

                    {renderPlayerList(benchPlayers, selectedBenchId, setSelectedBenchId, "Bench")}
                </div>

                <DialogFooter className="flex-row gap-2">
                    <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-400 hover:bg-slate-900 hover:text-white text-sm lg:text-base h-9 lg:h-10">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedActiveId || !selectedBenchId}
                        className="bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm lg:text-base h-9 lg:h-10"
                    >
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
