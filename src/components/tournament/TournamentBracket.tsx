import { useMemo } from "react";
import { Trophy, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Match {
  id: string;
  match_name: string;
  match_number?: string | number;
  status: string;
  team_a_score: number;
  team_b_score: number;
  team_a_id: string;
  team_b_id: string;
  round_name?: string | null;
  round_number?: number | null;
  team_a?: { name: string; id: string; logo_url?: string | null } | null;
  team_b?: { name: string; id: string; logo_url?: string | null } | null;
}

interface TournamentBracketProps {
  matches: Match[];
  tournamentType: string;
}

const MatchCard = ({ match, compact = false }: { match: Match; compact?: boolean }) => {
  const navigate = useNavigate();
  const isDone = match.status === 'completed';
  const isLive = match.status === 'live';
  const teamAWon = isDone && match.team_a_score > match.team_b_score;
  const teamBWon = isDone && match.team_b_score > match.team_a_score;

  return (
    <div
      onClick={() => navigate(isDone ? `/match-summary/${match.id}` : `/matches/${match.id}/spectate`)}
      className={cn(
        "bg-white border-2 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-orange-300 active:scale-[0.98]",
        isLive ? "border-red-300 shadow-red-100 shadow-md" : "border-slate-100",
        compact ? "min-w-[140px]" : "min-w-[180px]"
      )}
    >
      {/* Match Header */}
      <div className={cn(
        "px-2 py-1 text-center border-b",
        isLive ? "bg-red-500 border-red-400" : "bg-slate-900 border-slate-800"
      )}>
        <span className={cn(
          "text-[8px] font-black uppercase tracking-widest",
          isLive ? "text-white" : "text-white/70"
        )}>
          {isLive ? "🔴 LIVE" : match.round_name || `Match ${match.match_number}`}
        </span>
      </div>

      {/* Team A */}
      <div className={cn(
        "px-3 py-2 flex items-center gap-2 border-b border-slate-50",
        teamAWon && "bg-green-50",
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
          "text-[10px] font-bold flex-1 truncate",
          teamAWon ? "text-green-700" : "text-slate-700"
        )}>
          {match.team_a?.name || 'TBD'}
        </span>
        {isDone && (
          <span className={cn(
            "text-xs font-black",
            teamAWon ? "text-green-600" : "text-slate-400"
          )}>
            {match.team_a_score}
          </span>
        )}
        {teamAWon && <span className="text-green-500 text-[10px]">✓</span>}
      </div>

      {/* Team B */}
      <div className={cn(
        "px-3 py-2 flex items-center gap-2",
        teamBWon && "bg-green-50",
        teamAWon && "opacity-50"
      )}>
        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {match.team_b?.logo_url ? (
            <img src={match.team_b.logo_url} className="w-full h-full object-cover" />
          ) : (
            <Trophy className="w-3 h-3 text-slate-300" />
          )}
        </div>
        <span className={cn(
          "text-[10px] font-bold flex-1 truncate",
          teamBWon ? "text-green-700" : "text-slate-700"
        )}>
          {match.team_b?.name || 'TBD'}
        </span>
        {isDone && (
          <span className={cn(
            "text-xs font-black",
            teamBWon ? "text-green-600" : "text-slate-400"
          )}>
            {match.team_b_score}
          </span>
        )}
        {teamBWon && <span className="text-green-500 text-[10px]">✓</span>}
      </div>
    </div>
  );
};

export const TournamentBracket = ({ matches, tournamentType }: TournamentBracketProps) => {
  const isKnockout = tournamentType === 'Knockout' || 
                     tournamentType === 'League + Knockout' || 
                     tournamentType === 'Group + Knockout';

  // Group matches by round for knockout bracket
  const roundsData = useMemo(() => {
    const roundsMap: Record<number, Match[]> = {};
    
    matches.forEach(m => {
      const roundNum = m.round_number || 1;
      if (!roundsMap[roundNum]) roundsMap[roundNum] = [];
      roundsMap[roundNum].push(m);
    });

    // Sort each round by match number
    Object.keys(roundsMap).forEach(key => {
      roundsMap[Number(key)].sort((a, b) => 
        Number(a.match_number || 0) - Number(b.match_number || 0)
      );
    });

    return Object.entries(roundsMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([roundNum, roundMatches]) => ({
        roundNumber: Number(roundNum),
        roundName: roundMatches[0]?.round_name || `Round ${roundNum}`,
        matches: roundMatches
      }));
  }, [matches]);

  // Determine if we should show bracket view
  const showBracket = isKnockout && roundsData.length > 0;

  // Find knockout matches only (for combined formats)
  const knockoutMatches = useMemo(() => {
    if (tournamentType === 'League + Knockout' || tournamentType === 'Group + Knockout') {
      return matches.filter(m => 
        m.round_name?.includes('Final') || 
        m.round_name?.includes('Quarter') || 
        m.round_name?.includes('Semi') ||
        m.round_name?.includes('Round of')
      );
    }
    return matches;
  }, [matches, tournamentType]);

  const knockoutRounds = useMemo(() => {
    const roundsMap: Record<string, Match[]> = {};
    
    knockoutMatches.forEach(m => {
      const key = m.round_name || 'Unknown';
      if (!roundsMap[key]) roundsMap[key] = [];
      roundsMap[key].push(m);
    });

    // Sort rounds in correct order
    const roundOrder = ['Round of 16', 'Round of 8', 'Quarter Final', 'Semi Final', 'Final'];
    
    return Object.entries(roundsMap)
      .sort(([a], [b]) => {
        const aIdx = roundOrder.findIndex(r => a.includes(r));
        const bIdx = roundOrder.findIndex(r => b.includes(r));
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return -1;
        if (bIdx === -1) return 1;
        return aIdx - bIdx;
      })
      .map(([name, matchList]) => ({ name, matches: matchList }));
  }, [knockoutMatches]);

  if (!showBracket || knockoutRounds.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-200" />
        <p className="text-xs font-bold uppercase tracking-widest">
          No knockout bracket available
        </p>
        <p className="text-[10px] mt-1">
          Switch to list view to see all fixtures
        </p>
      </div>
    );
  }

  // Calculate the maximum matches in any round (for scaling)
  const maxMatchesInRound = Math.max(...knockoutRounds.map(r => r.matches.length));

  return (
    <div className="relative">
      {/* Tournament Roadmap Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          🏆 Tournament Roadmap
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* Horizontal Scrollable Bracket */}
      <div className="overflow-x-auto pb-4 -mx-6 px-6">
        <div className="flex gap-4 min-w-max">
          {knockoutRounds.map((round, roundIdx) => {
            const isLast = roundIdx === knockoutRounds.length - 1;
            const isFinal = round.name.includes('Final') && !round.name.includes('Semi');

            return (
              <div key={round.name} className="flex items-center">
                {/* Round Column */}
                <div className="flex flex-col items-center">
                  {/* Round Label */}
                  <div className={cn(
                    "mb-4 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                    isFinal 
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg" 
                      : "bg-slate-100 text-slate-600"
                  )}>
                    {round.name}
                  </div>

                  {/* Matches in this round */}
                  <div 
                    className="flex flex-col justify-around"
                    style={{ 
                      gap: `${Math.pow(2, roundIdx) * 20}px`,
                      minHeight: `${maxMatchesInRound * 100}px`
                    }}
                  >
                    {round.matches.map((match) => (
                      <MatchCard key={match.id} match={match} compact />
                    ))}
                  </div>
                </div>

                {/* Connector Lines */}
                {!isLast && (
                  <div className="flex items-center px-3">
                    <div className="w-8 flex flex-col justify-around" style={{ height: `${round.matches.length * 80}px` }}>
                      {round.matches.map((_, idx) => (
                        <div key={idx} className="relative h-px">
                          <div className="absolute top-0 left-0 w-full h-px bg-slate-200" />
                          <ChevronRight className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Champion Trophy at the end */}
          <div className="flex flex-col items-center justify-center pl-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-orange-200">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-3">
              Champion
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Tip */}
      <div className="flex items-center justify-center gap-2 mt-4 text-slate-400">
        <ChevronRight className="w-3 h-3 animate-pulse" />
        <span className="text-[9px] font-medium">Scroll to see full bracket</span>
      </div>
    </div>
  );
};

export default TournamentBracket;
