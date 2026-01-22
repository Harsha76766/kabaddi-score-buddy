import { Trophy, Calendar, ChevronRight, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

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

interface FixturesListProps {
  matches: Match[];
}

export const FixturesList = ({ matches }: FixturesListProps) => {
  const navigate = useNavigate();

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100">
        <Trophy className="w-12 h-12 text-slate-200 mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 text-center px-8 leading-relaxed">
          No fixtures generated yet.
        </p>
      </div>
    );
  }

  // Group matches by round
  const roundsMap: Record<string, Match[]> = {};
  matches.forEach(m => {
    const key = m.round_name || m.group_name || `Round ${m.round_number || 1}`;
    if (!roundsMap[key]) roundsMap[key] = [];
    roundsMap[key].push(m);
  });

  const sortedRounds = Object.entries(roundsMap)
    .sort((a, b) => {
      const aNum = matches.find(m => (m.round_name || m.group_name) === a[0])?.round_number || 0;
      const bNum = matches.find(m => (m.round_name || m.group_name) === b[0])?.round_number || 0;
      return aNum - bNum;
    });

  return (
    <div className="space-y-4">
      {sortedRounds.map(([roundName, roundMatches]) => (
        <div key={roundName} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Round Header */}
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.15em]">{roundName}</span>
            <span className="text-[9px] text-slate-400 ml-auto">
              {roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''}
            </span>
          </div>

          {/* Matches List */}
          <div className="divide-y divide-slate-50">
            {roundMatches
              .sort((a, b) => Number(a.match_number) - Number(b.match_number))
              .map((match, idx) => {
                const isLive = match.status === 'live';
                const isDone = match.status === 'completed';
                const teamAWon = isDone && match.team_a_score > match.team_b_score;
                const teamBWon = isDone && match.team_b_score > match.team_a_score;

                return (
                  <div
                    key={match.id}
                    onClick={() => navigate(isDone ? `/match-summary/${match.id}` : `/matches/${match.id}/spectate`)}
                    className={cn(
                      "flex items-center px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors gap-2",
                      isLive && "bg-orange-50"
                    )}
                  >
                    {/* Match Number */}
                    <div className="w-6 text-center">
                      <span className="text-[9px] font-black text-slate-300">#{match.match_number || idx + 1}</span>
                    </div>

                    {/* Team A */}
                    <div className={cn(
                      "flex-1 flex items-center gap-2 min-w-0",
                      teamBWon && "opacity-50"
                    )}>
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {match.team_a?.logo_url ? (
                          <img src={match.team_a.logo_url} className="w-full h-full object-cover" />
                        ) : (
                          <Trophy className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold truncate",
                        teamAWon ? "text-green-600" : "text-slate-700"
                      )}>
                        {match.team_a?.name || 'TBD'}
                      </span>
                    </div>

                    {/* Score / VS */}
                    <div className="w-16 text-center flex-shrink-0">
                      {isDone ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className={cn("text-xs font-black", teamAWon ? "text-green-600" : "text-slate-400")}>
                            {match.team_a_score}
                          </span>
                          <span className="text-[8px] text-slate-300">-</span>
                          <span className={cn("text-xs font-black", teamBWon ? "text-green-600" : "text-slate-400")}>
                            {match.team_b_score}
                          </span>
                        </div>
                      ) : isLive ? (
                        <Badge className="bg-red-500 text-white text-[7px] px-1.5 py-0 animate-pulse">LIVE</Badge>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-300">VS</span>
                      )}
                    </div>

                    {/* Team B */}
                    <div className={cn(
                      "flex-1 flex items-center gap-2 min-w-0 justify-end",
                      teamAWon && "opacity-50"
                    )}>
                      <span className={cn(
                        "text-[10px] font-bold truncate text-right",
                        teamBWon ? "text-green-600" : "text-slate-700"
                      )}>
                        {match.team_b?.name || 'TBD'}
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {match.team_b?.logo_url ? (
                          <img src={match.team_b.logo_url} className="w-full h-full object-cover" />
                        ) : (
                          <Trophy className="w-3 h-3 text-slate-300" />
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FixturesList;
