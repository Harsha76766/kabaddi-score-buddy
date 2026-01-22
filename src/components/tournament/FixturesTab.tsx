import { useState } from "react";
import { Rocket, List, GitBranch, Trophy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TournamentBracket } from "./TournamentBracket";
import { FixturesList } from "./FixturesList";
import { cn } from "@/lib/utils";

interface Match {
  id: string;
  match_name: string;
  match_date: string;
  match_number?: string | number;
  venue: string | null;
  status: string;
  team_a_score: number;
  team_b_score: number;
  team_a_id: string;
  team_b_id: string;
  round_name?: string | null;
  group_name?: string | null;
  round_number?: number | null;
  team_a?: { name: string; id: string; logo_url?: string | null } | null;
  team_b?: { name: string; id: string; logo_url?: string | null } | null;
}

interface Team {
  id: string;
  teams: {
    id: string;
    name: string;
  };
}

interface FixturesTabProps {
  matches: Match[];
  teams: Team[];
  tournamentType: string;
  isOrganizer: boolean;
  loading: boolean;
  fixtureType: string;
  setFixtureType: (type: string) => void;
  onGenerateFixtures: (type: string) => void;
  onClearFixtures?: () => void;
}

type ViewMode = 'list' | 'bracket';

export const FixturesTab = ({
  matches,
  teams,
  tournamentType,
  isOrganizer,
  loading,
  fixtureType,
  setFixtureType,
  onGenerateFixtures,
  onClearFixtures,
}: FixturesTabProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('bracket');

  const hasKnockout = tournamentType === 'Knockout' || 
                      tournamentType === 'League + Knockout' || 
                      tournamentType === 'Group + Knockout';

  // Show generator if organizer and no matches
  if (isOrganizer && matches.length === 0) {
    return (
      <Card className="rounded-[28px] border-2 border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 py-5">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-white">
            <Rocket className="w-5 h-5 text-orange-400" />
            Auto-Generate Fixtures
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Select Tournament Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'League', label: '🏆 League', desc: 'Round Robin' },
                { value: 'Knockout', label: '⚔️ Knockout', desc: 'Single Elimination' },
                { value: 'League + Knockout', label: '🏆+⚔️ League + KO', desc: 'Best of both' },
                { value: 'Group + Knockout', label: '👥+⚔️ Group + KO', desc: 'Groups then KO' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFixtureType(opt.value)}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all",
                    fixtureType === opt.value 
                      ? "border-orange-500 bg-orange-50" 
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  )}
                >
                  <span className="text-sm font-bold block">{opt.label}</span>
                  <span className="text-[10px] text-slate-400">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {fixtureType === 'League' && '✨ Every team plays every other team once. Best for accuracy & fairness.'}
              {fixtureType === 'Knockout' && '⚡ Single elimination bracket. Lose once = out. Fast & dramatic!'}
              {fixtureType === 'League + Knockout' && '🎯 Round robin first, then top 4 play knockout semi-finals & final.'}
              {fixtureType === 'Group + Knockout' && '🌟 Teams split into groups, top teams advance to knockout rounds.'}
            </p>
          </div>

          <Button
            onClick={() => onGenerateFixtures(fixtureType)}
            disabled={teams.length < 2 || loading}
            className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-2xl text-white font-black uppercase tracking-widest text-sm shadow-lg shadow-orange-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              `🚀 Generate ${fixtureType} Fixtures`
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Trophy className="w-3 h-3" />
            <span className="text-[9px] font-medium">
              {teams.length} teams registered
              {teams.length < 2 
                ? ' • Need at least 2 teams' 
                : ` • Will create ${fixtureType === 'League' || fixtureType === 'Round Robin' 
                    ? (teams.length * (teams.length - 1)) / 2 
                    : Math.ceil(Math.log2(teams.length)) + teams.length - 1
                  }+ matches`
              }
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state for non-organizers
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100">
        <Trophy className="w-12 h-12 text-slate-200 mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 text-center px-8 leading-relaxed">
          No fixtures generated yet.<br />
          <span className="text-[10px] font-medium lowercase">Check back later for the match schedule.</span>
        </p>
      </div>
    );
  }

  // Show fixtures with view toggle
  return (
    <div className="space-y-4">
      {/* View Mode Toggle & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('bracket')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
              viewMode === 'bracket' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <GitBranch className="w-3 h-3" />
            Roadmap
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
              viewMode === 'list' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <List className="w-3 h-3" />
            List
          </button>
        </div>

        {isOrganizer && onClearFixtures && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFixtures}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 text-[10px] font-bold"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
          <span className="text-2xl font-black text-slate-900">{matches.length}</span>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total Matches</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
          <span className="text-2xl font-black text-green-600">
            {matches.filter(m => m.status === 'completed').length}
          </span>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Completed</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
          <span className="text-2xl font-black text-orange-600">
            {matches.filter(m => m.status === 'scheduled' || m.status === 'upcoming').length}
          </span>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Upcoming</p>
        </div>
      </div>

      {/* View Content */}
      <div className="bg-white rounded-[28px] border border-slate-100 p-5">
        {viewMode === 'bracket' && hasKnockout ? (
          <TournamentBracket matches={matches} tournamentType={tournamentType} />
        ) : (
          <FixturesList matches={matches} />
        )}
      </div>
    </div>
  );
};

export default FixturesTab;
