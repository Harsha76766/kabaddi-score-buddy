import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { TopHeader } from "@/components/live-scoring/TopHeader";
import { Scoreboard } from "@/components/live-scoring/Scoreboard";
import { PlayersArea } from "@/components/live-scoring/PlayersArea";
import { SplitScoringPanel } from "@/components/live-scoring/SplitScoringPanel";
import { BottomControls } from "@/components/live-scoring/BottomControls";
import { SubstitutionDialog } from "@/components/live-scoring/SubstitutionDialog";
import { TieBreakerSetupDialog } from "@/components/live-scoring/TieBreakerSetupDialog";
import { MatchStartDialog } from "@/components/MatchStartDialog";
import { Match, Player, Team, RaidState, RaidAction } from "@/components/live-scoring/types";
import { cn } from "@/lib/utils";
import { matchAudio } from "@/lib/audio";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Volume2, VolumeX, Settings } from "lucide-react";

const LiveScoring = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // --- Data State ---
  const [match, setMatch] = useState<Match | null>(null);
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [playersA, setPlayersA] = useState<Player[]>([]);
  const [playersB, setPlayersB] = useState<Player[]>([]);

  // --- Game State ---
  const [activeTeam, setActiveTeam] = useState<"A" | "B">("A");
  const [raidState, setRaidState] = useState<RaidState>('IDLE');
  const [selectedRaiderId, setSelectedRaiderId] = useState<string | null>(null);
  const [outPlayers, setOutPlayers] = useState<string[]>([]); // IDs of players currently out
  const [hasMatchStarted, setHasMatchStarted] = useState(false);
  const [isSelectingRaider, setIsSelectingRaider] = useState(false);

  // --- Setup State ---
  const [showSetup, setShowSetup] = useState(location.state?.setup || false);

  // --- Defender Selection State ---
  const [selectionMode, setSelectionMode] = useState<'RAIDER' | 'DEFENDER'>('RAIDER');
  const [selectedDefenderIds, setSelectedDefenderIds] = useState<string[]>([]);
  const [pendingRaidAction, setPendingRaidAction] = useState<RaidAction | null>(null);

  // --- Timer State ---
  const [matchTimer, setMatchTimer] = useState(1200); // 20 mins in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [raidTimer, setRaidTimer] = useState(30);
  const [isRaidRunning, setIsRaidRunning] = useState(false);
  const [half, setHalf] = useState(1);
  const [firstRaidingTeam, setFirstRaidingTeam] = useState<"A" | "B">("A"); // Track who started 1st half

  // --- History State (for Undo/Redo) ---
  const [history, setHistory] = useState<any[]>([]);
  const [future, setFuture] = useState<any[]>([]); // For Redo
  const [lastRaids, setLastRaids] = useState<string[]>([]);

  // --- Substitution State ---
  const [substitutionOpen, setSubstitutionOpen] = useState(false);
  const [substitutionTeam, setSubstitutionTeam] = useState<"A" | "B">("A");

  // --- Advanced Match Logic ---
  const [emptyRaidsA, setEmptyRaidsA] = useState(0);
  const [emptyRaidsB, setEmptyRaidsB] = useState(0);
  const [timeoutsA, setTimeoutsA] = useState(0);
  const [timeoutsB, setTimeoutsB] = useState(0);

  // --- New Timeout & Audio State ---
  const [activeTimeout, setActiveTimeout] = useState<"A" | "B" | "OFFICIAL" | null>(null);
  const [timeoutTimer, setTimeoutTimer] = useState(0);
  const [isMatchPaused, setIsMatchPaused] = useState(false); // Pauses both timers during timeout
  const [savedRaidTimer, setSavedRaidTimer] = useState(0); // Store raid timer when paused
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    timeoutDuration: 60, // 1 minute per official rules
    maxTimeouts: 2,
    raidDuration: 30,
    halfDuration: 1200, // 20 minutes per half
    intervalDuration: 300, // 5 minutes half-time break
  });

  // --- Match State & Half-Time Logic ---
  const [matchState, setMatchState] = useState<
    'NOT_STARTED' | 'LIVE_HALF_1' | 'COMPLETING_RAID' | 'HALF_TIME_BREAK' | 'LIVE_HALF_2' | 'MATCH_ENDED'
  >('NOT_STARTED');
  const [intervalTimer, setIntervalTimer] = useState(0);

  // Half stats for display during half-time and match end
  const [halfStats, setHalfStats] = useState({
    half1: { scoreA: 0, scoreB: 0, raidsA: 0, raidsB: 0 },
    half2: { scoreA: 0, scoreB: 0, raidsA: 0, raidsB: 0 }
  });

  // Combined scoring mode - enables both panels to be clickable
  const [showManualPoints, setShowManualPoints] = useState(false);

  // Tie-breaker state
  const [showTieBreakerSetup, setShowTieBreakerSetup] = useState(false);
  const [isTieBreakerMode, setIsTieBreakerMode] = useState(false);
  const [tieBreakerRaiders, setTieBreakerRaiders] = useState<{ A: string[]; B: string[] }>({ A: [], B: [] });
  const [tieBreakerRaidIndex, setTieBreakerRaidIndex] = useState(0); // 0-9 (alternating teams)
  const [tieBreakerScore, setTieBreakerScore] = useState({ A: 0, B: 0 });
  const [tieBreakerFirstTeam, setTieBreakerFirstTeam] = useState<'A' | 'B'>('A');
  const [tieBreakerWinner, setTieBreakerWinner] = useState<'A' | 'B' | null>(null);

  // --- Sync Refs ---
  const timerRef = useRef(1200);
  const isSyncing = useRef(false);

  // --- Timeout Tick (countdown during timeout, auto-resumes when done) ---
  useEffect(() => {
    let interval: any;
    if (activeTimeout && timeoutTimer > 0) {
      interval = setInterval(() => {
        setTimeoutTimer(prev => {
          if (prev <= 1) {
            matchAudio.playBuzzer();
            // Auto-resume match when timeout ends
            setActiveTimeout(null);
            setIsMatchPaused(false);
            return 0;
          }
          if (prev <= 5) matchAudio.playTick();
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimeout, timeoutTimer]);

  useEffect(() => {
    matchAudio.setMuted(isMuted);
  }, [isMuted]);

  // Update ref whenever state changes
  useEffect(() => {
    timerRef.current = matchTimer;
  }, [matchTimer]);

  // --- Initialization ---
  useEffect(() => {
    if (id) fetchMatchData();
  }, [id]);

  // Match Timer - respects pause state and handles half-time logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && matchTimer > 0 && !isMatchPaused) {
      interval = setInterval(() => {
        setMatchTimer(prev => prev - 1);
      }, 1000);
    } else if (matchTimer === 0 && isTimerRunning) {
      // Timer just hit 0 - handle half/match end
      if (raidState === 'RAIDING') {
        // Raid in progress - let it complete before ending
        setMatchState('COMPLETING_RAID');
        // Don't stop timer running - raid will continue
      } else {
        // No raid in progress - proceed with half/match end
        setIsTimerRunning(false);
        if (half === 1) {
          // Save 1st half stats
          setHalfStats(prev => ({
            ...prev,
            half1: {
              scoreA: match?.team_a_score || 0,
              scoreB: match?.team_b_score || 0,
              raidsA: history.filter(h => h.action.raidingTeam === 'A').length,
              raidsB: history.filter(h => h.action.raidingTeam === 'B').length
            }
          }));
          // End of 1st half - start interval break
          setMatchState('HALF_TIME_BREAK');
          setIntervalTimer(settings.intervalDuration);
          matchAudio.playBuzzer();
        } else {
          // Save 2nd half stats
          const half1ScoreA = halfStats.half1.scoreA;
          const half1ScoreB = halfStats.half1.scoreB;
          setHalfStats(prev => ({
            ...prev,
            half2: {
              scoreA: (match?.team_a_score || 0) - half1ScoreA,
              scoreB: (match?.team_b_score || 0) - half1ScoreB,
              raidsA: history.filter(h => h.action.raidingTeam === 'A').length - prev.half1.raidsA,
              raidsB: history.filter(h => h.action.raidingTeam === 'B').length - prev.half1.raidsB
            }
          }));


          // End of 2nd half - show match summary
          // If tied, Match Summary will show "Shootout" button
          setMatchState('MATCH_ENDED');
          matchAudio.playBuzzer();
        }
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, matchTimer, isMatchPaused, raidState, half, settings.intervalDuration, match, history, halfStats.half1]);

  // Throttled Timer Sync to Database
  useEffect(() => {
    if (!match || !hasMatchStarted) return;

    // Sync timer every 10 seconds to avoid excessive DB writes
    const timerSyncInterval = setInterval(async () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      try {
        await (supabase.from("matches") as any).update({
          current_timer: timerRef.current,
          is_timer_running: isTimerRunning,
          current_half: half,
          active_team: activeTeam
        }).eq("id", match.id);
      } finally {
        isSyncing.current = false;
      }
    }, 10000);

    return () => clearInterval(timerSyncInterval);
  }, [match?.id, hasMatchStarted, isTimerRunning, half, activeTeam]);

  // Raid Timer - respects pause state (pauses during timeout)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRaidRunning && raidTimer > 0 && !isMatchPaused) {
      interval = setInterval(() => {
        setRaidTimer(prev => {
          const next = prev - 1;
          if (next <= 5 && next > 0) {
            matchAudio.playTick();
          } else if (next === 0) {
            matchAudio.playBuzzer();
          }
          return next;
        });
      }, 1000);
    } else if (raidTimer === 0) {
      setIsRaidRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRaidRunning, raidTimer, isMatchPaused]);

  // --- Half-Time Interval Timer ---
  useEffect(() => {
    if (matchState !== 'HALF_TIME_BREAK' || intervalTimer <= 0) return;

    const interval = setInterval(() => {
      setIntervalTimer(prev => {
        if (prev <= 1) {
          // Interval complete - just stop timer, user will click to start 2nd half
          matchAudio.playBuzzer();
          return 0;
        }
        if (prev <= 5) matchAudio.playTick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [matchState, intervalTimer]);

  // Manual start of 2nd half
  const handleStart2ndHalf = () => {
    // 2nd half starts with the OPPOSITE team from who started 1st half
    const secondHalfStartingTeam = firstRaidingTeam === 'A' ? 'B' : 'A';

    setMatchState('LIVE_HALF_2');
    setHalf(2);
    setMatchTimer(settings.halfDuration);
    setActiveTeam(secondHalfStartingTeam);

    // Reset empty raids / DOD for the new half
    setEmptyRaidsA(0);
    setEmptyRaidsB(0);

    setIsTimerRunning(true);
    setRaidState('RAIDING');
    setIsSelectingRaider(true);
    setRaidTimer(settings.raidDuration);
    setIsRaidRunning(true);
    matchAudio.playBuzzer();
  };

  // --- Custom Back Button Handler (shows full-screen exit overlay) ---
  const [showExitScreen, setShowExitScreen] = useState(false);

  useEffect(() => {
    if (!hasMatchStarted) return;

    // Push a fake history entry so we can intercept back button
    window.history.pushState({ kabaddiMatch: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      if (match?.status === 'live') {
        // Prevent navigation
        window.history.pushState({ kabaddiMatch: true }, '');

        // Pause the match and show exit screen
        setIsMatchPaused(true);
        setShowExitScreen(true);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasMatchStarted, match?.status]);

  // Handle exit screen actions
  const handleContinueMatch = async () => {
    // Try to force fullscreen first (required for orientation lock on most browsers)
    const docEl = document.documentElement;
    try {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if ((docEl as any).webkitRequestFullscreen) {
        await (docEl as any).webkitRequestFullscreen();
      }
    } catch (e) {
      console.log('Fullscreen not available');
    }

    // Now try to lock orientation to landscape
    try {
      if (window.screen.orientation && (window.screen.orientation as any).lock) {
        await (window.screen.orientation as any).lock('landscape');
      } else if ((window.screen as any).lockOrientation) {
        (window.screen as any).lockOrientation('landscape');
      } else if ((window.screen as any).mozLockOrientation) {
        (window.screen as any).mozLockOrientation('landscape');
      } else if ((window.screen as any).msLockOrientation) {
        (window.screen as any).msLockOrientation('landscape');
      }
    } catch (e) {
      console.log('Orientation lock not available - please rotate your device manually');
    }

    // Resume match regardless
    setShowExitScreen(false);
    setIsMatchPaused(false);
  };

  const handleExitMatch = () => {
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    }
    setShowExitScreen(false);
    navigate('/');
  };

  // --- Auto Fullscreen & Landscape on Page Load ---
  const forceFullscreenAndLandscape = async () => {
    const docEl = document.documentElement;

    // Step 1: Request fullscreen first (required for orientation lock)
    try {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if ((docEl as any).webkitRequestFullscreen) {
        await (docEl as any).webkitRequestFullscreen();
      } else if ((docEl as any).mozRequestFullScreen) {
        await (docEl as any).mozRequestFullScreen();
      } else if ((docEl as any).msRequestFullscreen) {
        await (docEl as any).msRequestFullscreen();
      }
    } catch (e) {
      console.log('Fullscreen request failed:', e);
    }

    // Step 2: Lock to landscape orientation
    try {
      if (window.screen.orientation && (window.screen.orientation as any).lock) {
        await (window.screen.orientation as any).lock('landscape');
      } else if ((window.screen as any).lockOrientation) {
        (window.screen as any).lockOrientation('landscape');
      } else if ((window.screen as any).mozLockOrientation) {
        (window.screen as any).mozLockOrientation('landscape');
      } else if ((window.screen as any).msLockOrientation) {
        (window.screen as any).msLockOrientation('landscape');
      }
    } catch (e) {
      console.log('Orientation lock failed:', e);
    }
  };

  // Trigger on first user interaction (click from previous page counts)
  useEffect(() => {
    // Small delay to ensure we're in a user gesture context
    const timer = setTimeout(() => {
      forceFullscreenAndLandscape();
    }, 100);

    // Also trigger on first touch/click in case the above doesn't work
    const handleInteraction = () => {
      forceFullscreenAndLandscape();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const reconstructMatchState = (events: any[], currentMatch: Match) => {
    let currentOutPlayers: string[] = [];
    let currentHistory: any[] = [];
    let currentA = 0;
    let currentB = 0;
    let currentActive: "A" | "B" = "A"; // Assume A starts if no toss info

    // If match has toss info, set initial active team
    // (This matches logic in fetchMatchData for starting team)

    events.forEach(event => {
      const snapshot = event.event_data?.snapshot;
      const action = event.event_data?.action as RaidAction;

      if (!snapshot || !action) return;

      // Snapshot for Undo
      currentHistory.push({
        action: action,
        scoreSnapshot: snapshot.score,
        outPlayersSnapshot: snapshot.outPlayers,
        isAllOut: event.is_all_out
      });

      currentActive = currentActive === "A" ? "B" : "A";
    });

    setHistory(currentHistory);
  };

  const fetchMatchData = async () => {
    try {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", id)
        .single();

      if (matchError) throw matchError;
      setMatch(matchData);

      // Initialize state from existing match data (persistence)
      if (matchData.status === 'live' || matchData.status === 'completed') {
        const m = matchData as any;
        setHasMatchStarted(true);
        setMatchTimer(m.current_timer ?? 1200);
        setHalf(m.current_half ?? 1);
        setOutPlayers(m.out_player_ids || []);
        setActiveTeam((m.active_team as "A" | "B") || "A");
        // For live matches, always start the timer (auto-resume)
        if (matchData.status === 'live') {
          setIsTimerRunning(true);
        } else {
          setIsTimerRunning(m.is_timer_running ?? false);
        }
      }

      const [tA, tB, pA, pB, events] = await Promise.all([
        supabase.from("teams").select("*").eq("id", matchData.team_a_id).single(),
        supabase.from("teams").select("*").eq("id", matchData.team_b_id).single(),
        supabase.from("players").select("*").eq("team_id", matchData.team_a_id),
        supabase.from("players").select("*").eq("team_id", matchData.team_b_id),
        supabase.from("match_events").select("*").eq("match_id", matchData.id).order('created_at', { ascending: true })
      ]);

      setTeamA(tA.data);
      setTeamB(tB.data);
      setPlayersA(pA.data || []);
      setPlayersB(pB.data || []);

      if (events.data && events.data.length > 0) {
        const lastFiveCodes = events.data.slice(-5).reverse().map(e => ((e as any).points_awarded ?? (e as any).points ?? 0).toString());
        setLastRaids(lastFiveCodes);

        // Reconstruct History Stack
        reconstructMatchState(events.data, matchData);
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error loading match", description: error.message });
    }
  };

  // --- Actions ---

  const handleStartMatch = () => {
    if (playersA.length < 7 || playersB.length < 7) {
      toast({
        variant: "destructive",
        title: "Teams Incomplete",
        description: "Both teams must have at least 7 players to start setup."
      });
      return;
    }
    setShowSetup(true);
  };

  const onSetupComplete = async () => {
    // Re-fetch everything from DB now that MatchStartDialog has initialized it
    await fetchMatchData();

    // Start match timer
    setMatchTimer(settings.halfDuration);
    setIsTimerRunning(true);
    setMatchState('LIVE_HALF_1');

    // Track which team starts 1st half (so 2nd half uses opposite team)
    setFirstRaidingTeam(activeTeam);

    // Start first raid immediately
    setIsSelectingRaider(true);
    setRaidState('RAIDING');
    setRaidTimer(settings.raidDuration);
    setIsRaidRunning(true);
    setShowSetup(false);
  };

  const handleSelectRaider = (playerId: string) => {
    if (!hasMatchStarted) {
      toast({ variant: "destructive", title: "Match not started", description: "Please start the match first." });
      return;
    }
    if (!isSelectingRaider) {
      return;
    }

    setSelectedRaiderId(playerId);
    setIsSelectingRaider(false); // Selection done
    // Timer is already running
  };

  const handleSelectDefender = async (playerId: string) => {
    let newSelection: string[];

    // Toggle selection
    if (selectedDefenderIds.includes(playerId)) {
      newSelection = selectedDefenderIds.filter(id => id !== playerId);
    } else {
      newSelection = [...selectedDefenderIds, playerId];
    }

    setSelectedDefenderIds(newSelection);

    // CHECK FOR AUTO-SUBMIT
    if (pendingRaidAction) {
      let shouldSubmit = false;

      // Case 1: Touch Points (e.g. 2 points -> need 2 defenders)
      if (pendingRaidAction.touchPoints > 0) {
        if (newSelection.length === pendingRaidAction.touchPoints) {
          shouldSubmit = true;
        }
      }
      // Case 2: Tackle (Raider Out -> need at least 1 tackler)
      else if (pendingRaidAction.raiderOut) {
        if (newSelection.length === 1) {
          shouldSubmit = true;
        }
      }

      if (shouldSubmit) {
        const finalAction = {
          ...pendingRaidAction,
          defendersOut: pendingRaidAction.raiderOut ? [] : newSelection,
          tacklerId: pendingRaidAction.raiderOut ? newSelection[0] : undefined
        };
        await processRaid(finalAction);
        setSelectionMode('RAIDER');
        setSelectedDefenderIds([]);
        setPendingRaidAction(null);
      }
    }
  };

  const handleRecordOutcome = async (action: RaidAction) => {
    if (action.touchPoints > 0 || action.raiderOut) {
      setPendingRaidAction(action);
      setSelectionMode('DEFENDER');
      // Removed toast for "Select Defenders"
    } else {
      await processRaid(action);
    }
  };

  // --- Technical Point Handler ---
  const handleTechnicalPoint = async (team: "A" | "B") => {
    if (!match) return;

    const pointsToA = team === "A" ? 1 : 0;
    const pointsToB = team === "B" ? 1 : 0;

    const newScoreA = match.team_a_score + pointsToA;
    const newScoreB = match.team_b_score + pointsToB;

    setMatch(prev => prev ? { ...prev, team_a_score: newScoreA, team_b_score: newScoreB } : null);

    await (supabase.from("matches") as any).update({
      team_a_score: newScoreA,
      team_b_score: newScoreB,
      current_timer: matchTimer
    }).eq("id", match.id);

    // Removed toast
  };


  // --- Timeout Handler (Pauses Match) ---
  const handleToggleTimeout = (team: "A" | "B") => {
    // Check if team has timeouts remaining (max 2 per team per match)
    const currentTimeouts = team === 'A' ? timeoutsA : timeoutsB;
    if (currentTimeouts >= settings.maxTimeouts) {
      toast({
        variant: "destructive",
        title: "No Timeouts Remaining",
        description: `${team === 'A' ? teamA?.name : teamB?.name} has used all ${settings.maxTimeouts} timeouts.`
      });
      return;
    }

    // Save current raid timer state
    setSavedRaidTimer(raidTimer);

    // Pause match (both timers will stop due to isMatchPaused check in effects)
    setIsMatchPaused(true);
    setActiveTimeout(team);
    setTimeoutTimer(settings.timeoutDuration); // 60 seconds

    // Increment team's timeout count
    if (team === 'A') {
      setTimeoutsA(prev => prev + 1);
    } else {
      setTimeoutsB(prev => prev + 1);
    }

    toast({
      title: "Timeout Called",
      description: `${team === 'A' ? teamA?.name : teamB?.name} called a timeout. Match paused.`
    });
  };

  // --- Official Timeout Handler ---
  const handleOfficialTimeout = () => {
    setSavedRaidTimer(raidTimer);
    setIsMatchPaused(true);
    setActiveTimeout("OFFICIAL");
    setTimeoutTimer(settings.timeoutDuration);
    toast({ title: "Official Timeout", description: "Match paused for official timeout." });
  };

  // --- Resume Match Handler ---
  const handleResumeMatch = () => {
    setIsMatchPaused(false);
    setActiveTimeout(null);
    setTimeoutTimer(0);

    // Restore raid timer if there was an active raid
    if (savedRaidTimer > 0) {
      setRaidTimer(savedRaidTimer);
    }
    setSavedRaidTimer(0);

    toast({ title: "Match Resumed", description: "Timers are now running." });
  };

  // --- Substitution Handler ---
  const handleOpenSubstitution = (team: "A" | "B") => {
    setSubstitutionTeam(team);
    setSubstitutionOpen(true);
  };

  const handleConfirmSubstitution = async (activePlayerId: string, benchPlayerId: string) => {
    const teamPlayers = substitutionTeam === "A" ? playersA : playersB;
    const setTeamPlayers = substitutionTeam === "A" ? setPlayersA : setPlayersB;

    const activeIndex = teamPlayers.findIndex(p => p.id === activePlayerId);
    const benchIndex = teamPlayers.findIndex(p => p.id === benchPlayerId);

    if (activeIndex === -1 || benchIndex === -1) return;

    // Create new array
    const newPlayers = [...teamPlayers];

    // Swap
    [newPlayers[activeIndex], newPlayers[benchIndex]] = [newPlayers[benchIndex], newPlayers[activeIndex]];

    setTeamPlayers(newPlayers);

    // Handle Out Status Transfer
    let nextOutPlayers = [...outPlayers];
    if (outPlayers.includes(activePlayerId)) {
      // If the player coming OUT was marked as 'out', the new player entering takes that 'out' status
      nextOutPlayers = outPlayers.map(id => id === activePlayerId ? benchPlayerId : id);
      setOutPlayers(nextOutPlayers);
    }

    // Sync to DB
    if (match) {
      await (supabase.from("matches") as any).update({
        out_player_ids: nextOutPlayers
      }).eq("id", match.id);
    }
  };

  const updatePlayerStats = async (
    matchId: string,
    action: RaidAction,
    raiderId: string,
    // Active defenders count BEFORE the raid outcome (snapshot)
    activeDefendersCount: number
  ) => {
    try {
      // 1. Update Raider Stats
      const { data: existingRaider } = await supabase
        .from('player_match_stats')
        .select('*')
        .eq('match_id', matchId)
        .eq('player_id', raiderId)
        .single();

      const currentRaider = existingRaider || {
        match_id: matchId,
        player_id: raiderId,
        raid_points: 0,
        tackle_points: 0,
        bonus_points: 0
      };

      const raidPoints = action.touchPoints + (action.bonusPoint ? 1 : 0);

      const updatedRaider = {
        match_id: matchId,
        player_id: raiderId,
        raid_points: (currentRaider.raid_points || 0) + raidPoints,
        tackle_points: currentRaider.tackle_points || 0,
        bonus_points: (currentRaider.bonus_points || 0) + (action.bonusPoint ? 1 : 0),
      };

      await supabase.from('player_match_stats').upsert(updatedRaider);

      // 2. Update Tackler Stats (if applicable)
      if (action.raiderOut && action.tacklerId) {
        const { data: existingTackler } = await supabase
          .from('player_match_stats')
          .select('*')
          .eq('match_id', matchId)
          .eq('player_id', action.tacklerId)
          .single();

        const currentTackler = existingTackler || {
          match_id: matchId,
          player_id: action.tacklerId,
          raid_points: 0,
          tackle_points: 0,
          bonus_points: 0
        };

        const activeDefendersCount = (activeTeam === 'A' ? playersB : playersA)
          .filter(p => !outPlayers.includes(p.id)).length;
        const isSuperTackle = activeDefendersCount <= 3;
        const tacklePoints = isSuperTackle ? 2 : 1;

        const updatedTackler = {
          match_id: matchId,
          player_id: action.tacklerId,
          raid_points: currentTackler.raid_points || 0,
          tackle_points: (currentTackler.tackle_points || 0) + tacklePoints,
          bonus_points: currentTackler.bonus_points || 0,
        };

        await supabase.from('player_match_stats').upsert(updatedTackler);
      }
    } catch (error) {
      console.error("Error updating player stats:", error);
    }
  };

  const processRaid = async (action: RaidAction, isRedo: boolean = false) => {
    if (!match || !teamA || !teamB) return;

    // === TIE-BREAKER MODE ===
    if (isTieBreakerMode) {
      // Calculate points for this raid
      const raidPoints = action.touchPoints + (action.bonusPoint ? 1 : 0);
      // In tie-breaker, raider out also gives 1 point to defending
      const defendingPoints = action.raiderOut ? 1 : 0;

      // Update tie-breaker scores
      setTieBreakerScore(prev => ({
        A: prev.A + (activeTeam === 'A' ? raidPoints : defendingPoints),
        B: prev.B + (activeTeam === 'B' ? raidPoints : defendingPoints)
      }));

      // Progress to next raid
      const nextIndex = tieBreakerRaidIndex + 1;
      setTieBreakerRaidIndex(nextIndex);

      // Reset raid state
      setRaidState('IDLE');
      setSelectedRaiderId(null);
      setSelectedDefenderIds([]);
      setPendingRaidAction(null);
      setSelectionMode('RAIDER');

      // Check if shootout complete (10 raids)
      if (nextIndex >= 10) {
        // Use updated scores
        const finalA = tieBreakerScore.A + (activeTeam === 'A' ? raidPoints : defendingPoints);
        const finalB = tieBreakerScore.B + (activeTeam === 'B' ? raidPoints : defendingPoints);

        if (finalA > finalB) {
          setTieBreakerWinner('A');
        } else if (finalB > finalA) {
          setTieBreakerWinner('B');
        } else {
          // Still tied - golden raid (simplified: toss and single raid)
          const goldenTeam = Math.random() < 0.5 ? 'A' : 'B';
          toast({
            title: "⚡ Golden Raid!",
            description: `Still tied! ${goldenTeam === 'A' ? teamA.name : teamB.name} gets the golden raid.`
          });
          // For now, just pick a random winner
          setTieBreakerWinner(goldenTeam);
        }
        return;
      }

      // Switch teams and select next raider
      const nextTeam = activeTeam === 'A' ? 'B' : 'A';
      setActiveTeam(nextTeam);

      // Calculate which raider is next (0-4 for each team)
      const raidersTeamA = Math.floor(nextIndex / 2) + (tieBreakerFirstTeam === 'A' ? (nextIndex % 2 === 0 ? 0 : 0) : (nextIndex % 2 === 1 ? 0 : 0));
      const teamRaidIndex = Math.floor(nextIndex / 2);
      if (teamRaidIndex < 5) {
        const nextRaiderId = nextTeam === 'A' ? tieBreakerRaiders.A[teamRaidIndex] : tieBreakerRaiders.B[teamRaidIndex];
        if (nextRaiderId) {
          setSelectedRaiderId(nextRaiderId);
          setRaidState('RAIDING');
        }
      }

      return; // Don't proceed with normal raid processing
    }

    // === NORMAL MATCH MODE ===
    try {
      let isDOD = (activeTeam === "A" && emptyRaidsA >= 2) || (activeTeam === "B" && emptyRaidsB >= 2);

      // If DOD and empty raid -> Raider is out automatically
      let effectiveAction = { ...action };
      if (isDOD && action.outcome === 'success' && action.touchPoints === 0 && !action.bonusPoint) {
        effectiveAction.outcome = 'fail';
        effectiveAction.raiderOut = true;
      }

      let points = effectiveAction.touchPoints + (effectiveAction.bonusPoint ? 1 : 0) + (effectiveAction.raiderOut ? 1 : 0);
      const raidingTeamId = activeTeam === "A" ? teamA.id : teamB.id;
      const defendingPlayers = activeTeam === "A" ? playersB : playersA;

      // Calculate active defenders count BEFORE applying this raid's outcome
      // (This is critical for Super Tackle check)
      const currentActiveDefendersCount = defendingPlayers.filter(p => !outPlayers.includes(p.id)).length;

      let currentOutPlayers = [...outPlayers];
      if (effectiveAction.raiderOut) {
        currentOutPlayers.push(effectiveAction.raiderId);
      } else {
        effectiveAction.defendersOut.forEach(id => currentOutPlayers.push(id));
      }

      const defendingPlayersOut = currentOutPlayers.filter(id => defendingPlayers.some(p => p.id === id));
      const isAllOut = defendingPlayersOut.length === defendingPlayers.length && defendingPlayers.length > 0;

      // REVIVAL LOGIC
      let revivalCount = 0;
      let revivingTeamPlayers: Player[] = [];

      if (!effectiveAction.raiderOut) {
        // Effective Raid
        if (effectiveAction.touchPoints > 0) {
          revivalCount = effectiveAction.touchPoints;
          revivingTeamPlayers = (activeTeam === "A") ? playersA : playersB; // Raiding team revives
        }
      } else {
        // Raider Out / Tackle
        revivalCount = 1;
        revivingTeamPlayers = defendingPlayers; // Defending team revives
      }

      // 2. Apply Revival (FIFO)
      if (isAllOut) {
        points += 2;
        currentOutPlayers = currentOutPlayers.filter(id => !defendingPlayers.some(p => p.id === id));
      } else if (revivalCount > 0) {
        let revivedCount = 0;
        const newOutPlayers: string[] = [];

        for (const outId of currentOutPlayers) {
          const isRevivingTeam = revivingTeamPlayers.some(p => p.id === outId);
          if (isRevivingTeam && revivedCount < revivalCount) {
            revivedCount++;
          } else {
            newOutPlayers.push(outId);
          }
        }
        currentOutPlayers = newOutPlayers;
      }

      const pointsToA = (activeTeam === "A" && !effectiveAction.raiderOut) ? points : (activeTeam === "B" && effectiveAction.raiderOut) ? (currentActiveDefendersCount <= 3 && effectiveAction.raiderOut ? 2 : 1) : 0;
      const pointsToB = (activeTeam === "B" && !effectiveAction.raiderOut) ? points : (activeTeam === "A" && effectiveAction.raiderOut) ? (currentActiveDefendersCount <= 3 && effectiveAction.raiderOut ? 2 : 1) : 0;

      const newScoreA = match.team_a_score + pointsToA;
      const newScoreB = match.team_b_score + pointsToB;

      setMatch(prev => prev ? { ...prev, team_a_score: newScoreA, team_b_score: newScoreB } : null);

      const outPlayersSnapshot = [...outPlayers];
      setOutPlayers(currentOutPlayers);

      await (supabase as any).rpc('insert_match_event', {
        p_match_id: match.id,
        p_event_type: effectiveAction.raiderOut ? 'tackle' : 'raid',
        p_raider_id: effectiveAction.raiderId,
        p_defender_ids: effectiveAction.defendersOut,
        p_team_id: raidingTeamId,
        p_points_awarded: points,
        p_raid_time: 30 - raidTimer,
        p_is_do_or_die: isDOD,
        p_is_all_out: isAllOut,
        p_event_data: {
          half,
          tacklerId: effectiveAction.tacklerId,
          action: effectiveAction,
          snapshot: {
            score: { a: match.team_a_score, b: match.team_b_score },
            outPlayers: outPlayersSnapshot
          }
        }
      });

      const nextActiveTeam = activeTeam === "A" ? "B" : "A";

      await (supabase.from("matches") as any).update({
        team_a_score: newScoreA,
        team_b_score: newScoreB,
        out_player_ids: currentOutPlayers,
        active_team: nextActiveTeam,
        current_timer: matchTimer
      }).eq("id", match.id);

      // --- DOD Tracker Update ---
      if (activeTeam === "A") {
        if (effectiveAction.touchPoints > 0 || effectiveAction.bonusPoint) {
          setEmptyRaidsA(0);
        } else if (effectiveAction.touchPoints === 0 && !effectiveAction.bonusPoint) {
          // If raider out in DOD, it's a point to other team, so it counts as "not empty" for the count?
          // No, DOD logic: 2 empty raids, 3rd is DOD. If DOD fail, count resets.
          setEmptyRaidsA(prev => effectiveAction.outcome === 'fail' ? 0 : prev + 1);
        }
      } else {
        if (effectiveAction.touchPoints > 0 || effectiveAction.bonusPoint) {
          setEmptyRaidsB(0);
        } else if (effectiveAction.touchPoints === 0 && !effectiveAction.bonusPoint) {
          setEmptyRaidsB(prev => effectiveAction.outcome === 'fail' ? 0 : prev + 1);
        }
      }

      if (points > 0) matchAudio.playSuccess();

      const outcomeCode = effectiveAction.raiderOut ? "W" : points.toString();
      setLastRaids(prev => [outcomeCode, ...prev].slice(0, 5));

      setActiveTeam(nextActiveTeam);
      setRaidState('IDLE');
      setSelectedRaiderId(null);
      setRaidTimer(30);
      setIsRaidRunning(false);

      setSelectionMode('RAIDER');
      setSelectedDefenderIds([]);
      setPendingRaidAction(null);
      setIsSelectingRaider(false);

      setHistory(prev => [...prev, {
        action: action,
        scoreSnapshot: { a: match.team_a_score, b: match.team_b_score },
        outPlayersSnapshot: outPlayersSnapshot,
        isAllOut: isAllOut
      }]);

      if (!isRedo) {
        setFuture([]);
      }

      // Update Player Stats
      await updatePlayerStats(match.id, action, action.raiderId, currentActiveDefendersCount);

      // Check if we were completing a raid when timer hit 0
      if (matchState === 'COMPLETING_RAID') {
        setIsTimerRunning(false);
        if (half === 1) {
          // End of 1st half - start interval break
          setMatchState('HALF_TIME_BREAK');
          setIntervalTimer(settings.intervalDuration);
          matchAudio.playBuzzer();
        } else {
          // End of 2nd half - match over
          setMatchState('MATCH_ENDED');
          matchAudio.playBuzzer();
        }
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error submitting raid", description: error.message });
    }
  };

  const handleEndMatch = async () => {
    if (!match) return;
    if (!window.confirm("Are you sure you want to end this match?")) return;
    try {
      const { error } = await supabase
        .from("matches")
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          is_timer_running: false
        })
        .eq("id", match.id);
      if (error) throw error;

      // Advance winner in bracket if applicable
      const winnerId = (match.team_a_score ?? 0) > (match.team_b_score ?? 0) ? match.team_a_id : match.team_b_id;
      if (match.team_a_score !== match.team_b_score) {
        await handleWinnerAdvancement(winnerId);
      }

      navigate(`/match-summary/${match.id}`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error ending match", description: error.message });
    }
  };

  const handleWinnerAdvancement = async (winnerId: string) => {
    if (!match?.next_match_id) return;

    try {
      const updateField = match.is_team_a_winner_slot ? 'team_a_id' : 'team_b_id';
      const { error } = await supabase
        .from("matches")
        .update({ [updateField]: winnerId })
        .eq("id", match.next_match_id);

      if (error) console.error("Error advancing winner:", error);
    } catch (e) {
      console.error("Progression error:", e);
    }
  };

  const handleUndo = async () => {
    if (history.length === 0) return;
    const lastAction = history[history.length - 1];
    const newHistory = history.slice(0, history.length - 1);

    setMatch(prev => prev ? {
      ...prev,
      team_a_score: lastAction.scoreSnapshot.a,
      team_b_score: lastAction.scoreSnapshot.b
    } : null);

    try {
      const { data: lastEvent } = await supabase
        .from("match_events")
        .select("id")
        .eq("match_id", match!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (lastEvent) {
        await supabase.from("match_events").delete().eq("id", lastEvent.id);
      }

      const prevActiveTeam = activeTeam === "A" ? "B" : "A";

      await (supabase.from("matches") as any).update({
        team_a_score: lastAction.scoreSnapshot.a,
        team_b_score: lastAction.scoreSnapshot.b,
        out_player_ids: lastAction.outPlayersSnapshot,
        active_team: prevActiveTeam
      }).eq("id", match!.id);

      setHistory(newHistory);
      setFuture(prev => [lastAction, ...prev]);

      setLastRaids(prev => prev.slice(1));
      setActiveTeam(prevActiveTeam);
      setOutPlayers(lastAction.outPlayersSnapshot);
      // Removed toast

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error undoing", description: error.message });
    }
  };

  const handleRedo = async () => {
    if (future.length === 0) return;

    const nextAction = future[0];
    const newFuture = future.slice(1);
    setFuture(newFuture);

    await processRaid(nextAction.action, true);

    // Removed toast
  };

  const handleStopRaid = () => {
    setRaidState('IDLE');
    setSelectedRaiderId(null);
    setIsRaidRunning(false);
    setRaidTimer(30);
    setSelectionMode('RAIDER');
    setSelectedDefenderIds([]);
    setPendingRaidAction(null);
    setIsSelectingRaider(false);
  };

  const handleNextRaid = () => {
    if (raidState !== 'IDLE') return;
    setIsSelectingRaider(true);
    setRaidState('RAIDING');
    setRaidTimer(settings.raidDuration);
    setIsRaidRunning(true);

    const isDOD = (activeTeam === "A" && emptyRaidsA >= 2) || (activeTeam === "B" && emptyRaidsB >= 2);
    if (isDOD) {
      matchAudio.playDODBuzzer();
    } else {
      matchAudio.playRaidStart();
    }
  };

  if (!match || !teamA || !teamB) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;

  // Helper: Active Defenders Count
  const activeDefendersA = playersA.filter(p => !outPlayers.includes(p.id)).length;
  const activeDefendersB = playersB.filter(p => !outPlayers.includes(p.id)).length;

  // Super Tackle On? (3 or less)
  const isSuperTackleOnA = activeDefendersA <= 3;
  const isSuperTackleOnB = activeDefendersB <= 3;

  // Check if match ended in a tie
  const isMatchTied = match.team_a_score === match.team_b_score;

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden text-white font-rajdhani live-scoring-container landscape:overflow-y-auto landscape:gap-0 transition-all duration-500">
      {/* Match Summary Overlay */}
      {matchState === 'MATCH_ENDED' && !isTieBreakerMode && (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900/98 via-slate-950 to-slate-900/98 z-50 flex flex-col items-center justify-center p-4">
          <h1 className="text-3xl font-bold text-amber-400 mb-4">🏁 Match Complete</h1>

          {/* Final Scores */}
          <div className="flex items-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-sm text-red-400 font-bold">{teamA.name}</div>
              <div className="text-5xl font-bold text-red-500">{match.team_a_score}</div>
            </div>
            <div className="text-2xl text-slate-500">-</div>
            <div className="text-center">
              <div className="text-sm text-blue-400 font-bold">{teamB.name}</div>
              <div className="text-5xl font-bold text-blue-500">{match.team_b_score}</div>
            </div>
          </div>

          {/* Winner or Tie */}
          {isMatchTied ? (
            <div className="text-center mb-6">
              <div className="text-xl text-amber-400 mb-2">🤝 Match Tied!</div>
              <p className="text-sm text-slate-400 mb-4">Proceed to tie-breaker shootout to determine winner</p>
              <Button
                onClick={() => setShowTieBreakerSetup(true)}
                className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 text-lg"
              >
                🎯 Start Shootout
              </Button>
            </div>
          ) : (
            <div className="text-center mb-6">
              <div className={cn(
                "text-2xl font-bold",
                match.team_a_score > match.team_b_score ? "text-red-400" : "text-blue-400"
              )}>
                🏆 {match.team_a_score > match.team_b_score ? teamA.name : teamB.name} Wins!
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => navigate('/matches')}
            className="border-slate-600 text-slate-300"
          >
            Back to Matches
          </Button>
        </div>
      )}

      {/* Tie-Breaker Winner Overlay */}
      {tieBreakerWinner && (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-900/95 via-slate-950 to-amber-900/95 z-50 flex flex-col items-center justify-center p-4">
          <h1 className="text-3xl font-bold text-amber-400 mb-2">🏆 Tie-Breaker Winner!</h1>
          <div className={cn(
            "text-4xl font-bold mb-4",
            tieBreakerWinner === 'A' ? "text-red-400" : "text-blue-400"
          )}>
            {tieBreakerWinner === 'A' ? teamA.name : teamB.name}
          </div>
          <div className="text-lg text-slate-300 mb-6">
            Shootout Score: {tieBreakerScore.A} - {tieBreakerScore.B}
          </div>
          <Button
            onClick={() => {
              setTieBreakerWinner(null);
              setIsTieBreakerMode(false);

              const winnerId = tieBreakerWinner === 'A' ? match.team_a_id : match.team_b_id;
              handleWinnerAdvancement(winnerId).then(() => {
                navigate('/matches');
              });
            }}
            className="bg-amber-600 hover:bg-amber-500"
          >
            Finish Match
          </Button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @media (orientation: landscape) and (max-height: 500px) {
          .live-scoring-container {
            font-size: 0.9em;
          }
        }
      `}} />
      <TopHeader
        timer={matchTimer}
        isTimerRunning={isTimerRunning && !isMatchPaused}
        half={half}
        onOpenSettings={() => setShowSettings(true)}
        onOfficialTimeout={handleOfficialTimeout}
        onResumeMatch={handleResumeMatch}
        isMatchPaused={isMatchPaused}
        activeTimeout={activeTimeout}
        timeoutTimer={timeoutTimer}
        teamAName={teamA?.name}
        teamBName={teamB?.name}
      />

      <Scoreboard
        teamA={teamA}
        teamB={teamB}
        scoreA={match.team_a_score}
        scoreB={match.team_b_score}
        activeTeam={activeTeam}
        lastRaids={lastRaids}
        isSuperTackleOnA={isSuperTackleOnA}
        isSuperTackleOnB={isSuperTackleOnB}
        emptyRaidsA={emptyRaidsA}
        emptyRaidsB={emptyRaidsB}
      />

      <PlayersArea
        playersA={playersA}
        playersB={playersB}
        activeTeam={activeTeam}
        selectedRaiderId={selectedRaiderId}
        outPlayers={outPlayers}
        raidTimer={raidTimer}
        isRaidRunning={isRaidRunning}
        onSelectRaider={handleSelectRaider}
        selectionMode={selectionMode}
        selectedDefenderIds={selectedDefenderIds}
        onSelectDefender={handleSelectDefender}
        showFocusOverlay={isSelectingRaider || selectionMode === 'DEFENDER'}
        isSelecting={isSelectingRaider}
        onOpenSubstitution={handleOpenSubstitution}
        emptyRaidsA={emptyRaidsA}
        emptyRaidsB={emptyRaidsB}
      />

      <SplitScoringPanel
        activeTeam={activeTeam}
        teamAName={teamA?.name || "Team A"}
        teamBName={teamB?.name || "Team B"}
        onRecordOutcome={handleRecordOutcome}
        selectedRaiderId={selectedRaiderId}
        onToggleTimeout={handleToggleTimeout}
        emptyRaidsA={emptyRaidsA}
        emptyRaidsB={emptyRaidsB}
        timeoutsA={timeoutsA}
        timeoutsB={timeoutsB}
        isMatchPaused={isMatchPaused}
        maxTimeouts={settings.maxTimeouts}
        combinedMode={showManualPoints}
      />

      <BottomControls
        raidState={raidState}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onStopRaid={handleStopRaid}
        hasMatchStarted={hasMatchStarted}
        onStartMatch={handleStartMatch}
        onNextRaid={handleNextRaid}
        onTechnicalPoint={handleTechnicalPoint}
        onManualPoints={() => setShowManualPoints(!showManualPoints)}
        combinedMode={showManualPoints}
      />

      {/* Tie-Breaker Setup Dialog */}
      <TieBreakerSetupDialog
        open={showTieBreakerSetup}
        onOpenChange={setShowTieBreakerSetup}
        teamAName={teamA?.name || "Team A"}
        teamBName={teamB?.name || "Team B"}
        playersA={playersA}
        playersB={playersB}
        onComplete={(setup) => {
          // Start tie-breaker mode
          setIsTieBreakerMode(true);
          setTieBreakerRaiders({ A: setup.raidersA, B: setup.raidersB });
          setTieBreakerFirstTeam(setup.firstRaidingTeam);
          setActiveTeam(setup.firstRaidingTeam);
          setTieBreakerScore({ A: 0, B: 0 });
          setTieBreakerRaidIndex(0);
          setMatchState('LIVE_HALF_2'); // Use LIVE_HALF_2 for tie-breaker (no half concept)
          setShowTieBreakerSetup(false);
          // Auto-select first raider
          const firstRaiderId = setup.firstRaidingTeam === 'A' ? setup.raidersA[0] : setup.raidersB[0];
          setSelectedRaiderId(firstRaiderId);
          toast({
            title: "🎯 Tie-Breaker Started!",
            description: `${setup.firstRaidingTeam === 'A' ? teamA?.name : teamB?.name} will raid first.`
          });
        }}
      />

      <SubstitutionDialog
        isOpen={substitutionOpen}
        onClose={() => setSubstitutionOpen(false)}
        teamName={substitutionTeam === "A" ? teamA.name : teamB.name}
        activePlayers={(substitutionTeam === "A" ? playersA : playersB).slice(0, 7)}
        benchPlayers={(substitutionTeam === "A" ? playersA : playersB).slice(7)}
        onConfirm={handleConfirmSubstitution}
      />

      {match && (
        <MatchStartDialog
          matchId={match.id}
          teamAId={match.team_a_id}
          teamBId={match.team_b_id}
          teamAName={teamA.name}
          teamBName={teamB.name}
          playersA={playersA}
          playersB={playersB}
          open={showSetup}
          onOpenChange={setShowSetup}
          onComplete={onSetupComplete}
        />
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" />
              Match Settings
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Mute Match Audio</Label>
                <p className="text-sm text-slate-400">Silence all buzzer and tick sounds</p>
              </div>
              <div className="flex items-center gap-2">
                {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-green-400" />}
                <Switch
                  checked={isMuted}
                  onCheckedChange={setIsMuted}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base">Timeout Rules</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeoutDuration" className="text-xs text-slate-400">Duration (seconds)</Label>
                  <Input
                    id="timeoutDuration"
                    type="number"
                    value={settings.timeoutDuration}
                    onChange={(e) => setSettings(prev => ({ ...prev, timeoutDuration: parseInt(e.target.value) || 0 }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTimeouts" className="text-xs text-slate-400">Max per Half</Label>
                  <Input
                    id="maxTimeouts"
                    type="number"
                    value={settings.maxTimeouts}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxTimeouts: parseInt(e.target.value) || 0 }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="raidDuration" className="text-base">Raid Duration (seconds)</Label>
              <Input
                id="raidDuration"
                type="number"
                value={settings.raidDuration}
                onChange={(e) => setSettings(prev => ({ ...prev, raidDuration: parseInt(e.target.value) || 0 }))}
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="halfDuration" className="text-base">Half Duration (seconds)</Label>
              <Input
                id="halfDuration"
                type="number"
                value={settings.halfDuration}
                onChange={(e) => setSettings(prev => ({ ...prev, halfDuration: parseInt(e.target.value) || 0 }))}
                className="bg-slate-800 border-slate-700"
              />
              <p className="text-xs text-slate-500">Default: 1200 (20 minutes)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intervalDuration" className="text-base">Half-Time Break (seconds)</Label>
              <Input
                id="intervalDuration"
                type="number"
                value={settings.intervalDuration}
                onChange={(e) => setSettings(prev => ({ ...prev, intervalDuration: parseInt(e.target.value) || 0 }))}
                className="bg-slate-800 border-slate-700"
              />
              <p className="text-xs text-slate-500">Default: 300 (5 minutes)</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSettings(false)} className="w-full bg-blue-600 hover:bg-blue-700">
              Save & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Half-Time Break Overlay - Landscape Responsive */}
      {matchState === 'HALF_TIME_BREAK' && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-sm flex items-center justify-center p-4 overflow-auto">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 w-full max-w-4xl">
            {/* Left: Header and Timer */}
            <div className="flex flex-col items-center gap-2 lg:w-1/3">
              <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-full bg-orange-500/20 border-4 border-orange-500 flex items-center justify-center">
                <span className="text-2xl lg:text-3xl font-black text-orange-500">HT</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-wider">
                Half Time
              </h1>
              {intervalTimer > 0 ? (
                <>
                  <p className="text-sm lg:text-lg text-slate-400">Break ends in</p>
                  <div className="text-4xl lg:text-5xl font-mono font-black text-orange-500">
                    {Math.floor(intervalTimer / 60)}:{(intervalTimer % 60).toString().padStart(2, '0')}
                  </div>
                </>
              ) : (
                <p className="text-lg text-green-400">Ready to start!</p>
              )}

              {/* Start Button */}
              <Button
                onClick={handleStart2ndHalf}
                className="h-12 lg:h-14 px-6 lg:px-8 text-lg lg:text-xl font-bold bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-[0_0_30px_rgba(22,163,74,0.4)] transition-all hover:scale-105 mt-2"
              >
                🏃 Start 2nd Half
              </Button>
            </div>

            {/* Right: Stats */}
            <div className="flex flex-col gap-4 lg:w-2/3">
              {/* 1st Half Stats */}
              <div className="bg-slate-800/50 rounded-xl p-3 lg:p-4">
                <h2 className="text-base lg:text-lg font-bold text-slate-300 text-center mb-2">1st Half Stats</h2>
                <div className="grid grid-cols-3 gap-2 text-center text-sm lg:text-base">
                  <div className="text-red-400 font-bold">{teamA?.name}</div>
                  <div className="text-slate-500">Stat</div>
                  <div className="text-blue-400 font-bold">{teamB?.name}</div>

                  <div className="text-xl lg:text-2xl font-black text-red-500">{halfStats.half1.scoreA}</div>
                  <div className="text-slate-500">Score</div>
                  <div className="text-xl lg:text-2xl font-black text-blue-500">{halfStats.half1.scoreB}</div>

                  <div className="text-base lg:text-lg text-red-400">{halfStats.half1.raidsA}</div>
                  <div className="text-slate-500">Raids</div>
                  <div className="text-base lg:text-lg text-blue-400">{halfStats.half1.raidsB}</div>
                </div>
              </div>

              {/* Score Display */}
              <div className="flex items-center justify-center gap-4 text-xl lg:text-2xl font-bold">
                <span className="text-red-400">{teamA?.name}: {match?.team_a_score}</span>
                <span className="text-slate-600">vs</span>
                <span className="text-blue-400">{teamB?.name}: {match?.team_b_score}</span>
              </div>

              <p className="text-slate-400 text-sm text-center">
                🏃 {firstRaidingTeam === 'A' ? teamB?.name : teamA?.name} starts 2nd half raiding
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Match Ended Overlay */}
      {matchState === 'MATCH_ENDED' && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-4 overflow-auto">
          <div className="flex flex-col items-center gap-2">
            <div className="h-20 w-20 rounded-full bg-green-500/20 border-4 border-green-500 flex items-center justify-center">
              <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-wider mt-2">
              Full Time
            </h1>
          </div>

          {/* Final Score */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xl text-red-400 font-bold">{teamA?.name}</p>
              <p className="text-6xl font-mono font-black text-red-500">{match?.team_a_score}</p>
            </div>
            <span className="text-3xl text-slate-600">-</span>
            <div className="text-center">
              <p className="text-xl text-blue-400 font-bold">{teamB?.name}</p>
              <p className="text-6xl font-mono font-black text-blue-500">{match?.team_b_score}</p>
            </div>
          </div>

          {(match?.team_a_score ?? 0) > (match?.team_b_score ?? 0) ? (
            <p className="text-2xl text-green-400 font-bold">🏆 {teamA?.name} Wins!</p>
          ) : (match?.team_a_score ?? 0) < (match?.team_b_score ?? 0) ? (
            <p className="text-2xl text-green-400 font-bold">🏆 {teamB?.name} Wins!</p>
          ) : (
            <p className="text-2xl text-yellow-400 font-bold">🤝 Match Draw!</p>
          )}

          {/* Match Stats by Half */}
          <div className="bg-slate-800/50 rounded-xl p-4 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-300 text-center mb-3">Match Statistics</h2>
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="text-slate-500 font-bold">Half</div>
              <div className="text-red-400 font-bold">{teamA?.name}</div>
              <div className="text-blue-400 font-bold">{teamB?.name}</div>
              <div className="text-slate-500 font-bold">Diff</div>

              <div className="text-slate-400">1st</div>
              <div className="text-red-400">{halfStats.half1.scoreA}</div>
              <div className="text-blue-400">{halfStats.half1.scoreB}</div>
              <div className={halfStats.half1.scoreA > halfStats.half1.scoreB ? 'text-red-400' : halfStats.half1.scoreB > halfStats.half1.scoreA ? 'text-blue-400' : 'text-slate-400'}>
                {halfStats.half1.scoreA > halfStats.half1.scoreB ? `+${halfStats.half1.scoreA - halfStats.half1.scoreB}` :
                  halfStats.half1.scoreB > halfStats.half1.scoreA ? `+${halfStats.half1.scoreB - halfStats.half1.scoreA}` : '0'}
              </div>

              <div className="text-slate-400">2nd</div>
              <div className="text-red-400">{halfStats.half2.scoreA}</div>
              <div className="text-blue-400">{halfStats.half2.scoreB}</div>
              <div className={halfStats.half2.scoreA > halfStats.half2.scoreB ? 'text-red-400' : halfStats.half2.scoreB > halfStats.half2.scoreA ? 'text-blue-400' : 'text-slate-400'}>
                {halfStats.half2.scoreA > halfStats.half2.scoreB ? `+${halfStats.half2.scoreA - halfStats.half2.scoreB}` :
                  halfStats.half2.scoreB > halfStats.half2.scoreA ? `+${halfStats.half2.scoreB - halfStats.half2.scoreA}` : '0'}
              </div>

              <div className="text-white font-bold border-t border-slate-600 pt-2">Total</div>
              <div className="text-red-500 font-bold border-t border-slate-600 pt-2">{match?.team_a_score}</div>
              <div className="text-blue-500 font-bold border-t border-slate-600 pt-2">{match?.team_b_score}</div>
              <div className={(match?.team_a_score ?? 0) > (match?.team_b_score ?? 0) ? 'text-red-500 font-bold border-t border-slate-600 pt-2' : (match?.team_b_score ?? 0) > (match?.team_a_score ?? 0) ? 'text-blue-500 font-bold border-t border-slate-600 pt-2' : 'text-slate-400 font-bold border-t border-slate-600 pt-2'}>
                {Math.abs((match?.team_a_score ?? 0) - (match?.team_b_score ?? 0))}
              </div>

              <div className="col-span-4 border-t border-slate-600 pt-2 mt-2"></div>
              <div className="text-slate-500">Raids</div>
              <div className="text-red-400">{halfStats.half1.raidsA + halfStats.half2.raidsA}</div>
              <div className="text-blue-400">{halfStats.half1.raidsB + halfStats.half2.raidsB}</div>
              <div></div>
            </div>
          </div>

          <Button
            onClick={() => navigate('/')}
            className="h-14 px-8 text-xl font-bold bg-green-600 hover:bg-green-700 text-white rounded-2xl"
          >
            Back to Home
          </Button>
        </div>
      )}

      {/* Completing Raid Indicator */}
      {matchState === 'COMPLETING_RAID' && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 bg-amber-600 rounded-full text-white font-bold text-sm shadow-lg animate-pulse">
          ⏳ Completing current raid...
        </div>
      )}

      {/* Full-Screen Exit Overlay */}
      {showExitScreen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-sm flex flex-col items-center justify-center gap-8 p-6">
          {/* Paused Indicator */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-20 w-20 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center animate-pulse">
              <svg className="h-10 w-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-wider mt-4">
              Match Paused
            </h1>
            <p className="text-slate-400 text-center text-lg">
              {matchTimer > 0 ? `${Math.floor(matchTimer / 60)}:${(matchTimer % 60).toString().padStart(2, '0')} remaining` : 'Time up'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <Button
              onClick={handleContinueMatch}
              className="h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-[0_0_30px_rgba(22,163,74,0.4)] transition-all hover:scale-105"
            >
              <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Rotate & Continue
            </Button>

            <Button
              onClick={handleExitMatch}
              variant="outline"
              className="h-16 text-xl font-bold bg-transparent border-2 border-red-500 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
            >
              <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Exit Match
            </Button>
          </div>

          {/* Score Display */}
          <div className="mt-4 flex items-center gap-4 text-2xl font-bold">
            <span className="text-red-400">{teamA?.name}: {match?.team_a_score}</span>
            <span className="text-slate-600">vs</span>
            <span className="text-blue-400">{teamB?.name}: {match?.team_b_score}</span>
          </div>

          <p className="text-slate-500 text-sm mt-4">
            Press phone back button again to exit
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveScoring;