import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Capacitor } from "@capacitor/core";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Zap,
    ArrowRight,
    ChevronDown,
    Trophy,
    Users,
    Target,
    Timer,
    Shield,
    Play,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const Landing = () => {
    const navigate = useNavigate();
    const [session, setSession] = useState<any>(null);
    const [stats, setStats] = useState({ matches: 0, players: 0, tournaments: 0 });
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [activeLevel, setActiveLevel] = useState(3);
    const [animatedStats, setAnimatedStats] = useState({ matches: 0, players: 0, tournaments: 0 });
    const statsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            navigate('/auth');
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session && Capacitor.isNativePlatform()) {
                navigate('/home');
            }
        });

        fetchStats();
    }, [navigate]);

    const fetchStats = async () => {
        try {
            const [matchesRes, playersRes, tournamentsRes] = await Promise.all([
                supabase.from('matches').select('*', { count: 'exact', head: true }),
                supabase.from('players').select('*', { count: 'exact', head: true }),
                supabase.from('tournaments').select('*', { count: 'exact', head: true })
            ]);
            const newStats = {
                matches: matchesRes.count || 127,
                players: playersRes.count || 543,
                tournaments: tournamentsRes.count || 34
            };
            setStats(newStats);
            // Animate stats
            animateValue(0, newStats.matches, 800, (v) => setAnimatedStats(prev => ({ ...prev, matches: v })));
            animateValue(0, newStats.players, 800, (v) => setAnimatedStats(prev => ({ ...prev, players: v })));
            animateValue(0, newStats.tournaments, 800, (v) => setAnimatedStats(prev => ({ ...prev, tournaments: v })));
        } catch (e) {
            console.error('Error fetching stats:', e);
        }
    };

    const animateValue = (start: number, end: number, duration: number, callback: (v: number) => void) => {
        const startTime = performance.now();
        const step = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            callback(Math.floor(start + (end - start) * eased));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    const levels = [
        { name: "NOOB", short: "N" },
        { name: "SEMI-PRO", short: "SP" },
        { name: "PRO", short: "P" },
        { name: "ELITE", short: "E" },
        { name: "PKL READY", short: "PK" },
        { name: "PROSPECT", short: "PR" },
        { name: "PLAYER", short: "PL" }
    ];

    const faqs = [
        { q: "Who can score matches?", a: "Any authorized user. Organizers assign scorers per match." },
        { q: "Is the data verified?", a: "Yes. All stats come from live match events. No manual edits." },
        { q: "Can small tournaments use this?", a: "Yes. Works for 2-team friendlies to 32-team championships." },
        { q: "Is this accepted for selection?", a: "Verified stats create credible profiles selectors can trust." }
    ];

    return (
        <div className="min-h-screen bg-[#050508] text-white font-sans antialiased overflow-x-hidden">
            {/* ============ NAVBAR ============ */}
            <nav className="fixed top-0 w-full z-50 bg-[#050508]/95 backdrop-blur-sm border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-base font-black tracking-tight">RAIDBOOK</span>
                    </div>
                    <div className="flex items-center gap-8">
                        <button onClick={() => navigate('/explore-tournaments')} className="hidden md:block text-xs font-bold tracking-wider text-neutral-400 hover:text-white transition-colors uppercase">
                            Tournaments
                        </button>
                        <button onClick={() => navigate('/live-matches')} className="hidden md:flex items-center gap-1.5 text-xs font-bold tracking-wider text-red-500 hover:text-red-400 transition-colors uppercase">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            Live
                        </button>
                        <Button
                            onClick={() => navigate(session ? '/home' : '/auth')}
                            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-lg h-9 px-5 text-xs tracking-wider uppercase"
                        >
                            {session ? 'Dashboard' : 'Get Started'}
                        </Button>
                    </div>
                </div>
            </nav>

            {/* ============ HERO — MATCH DAY ENERGY ============ */}
            <section className="relative pt-28 pb-20 px-6 overflow-hidden">
                {/* Arena glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-orange-600/10 to-transparent blur-[100px] pointer-events-none" />

                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16 relative z-10">
                    {/* Left: Copy */}
                    <div className="flex-1 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-6">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase">Live Scoring Platform</span>
                        </div>

                        <h1 className="hero-snap text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[0.95] mb-6">
                            Track Every Point.
                            <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-orange-500">
                                Build Every Career.
                            </span>
                        </h1>

                        <p className="text-base text-neutral-400 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                            Tournaments. Live scoring. Verified stats.
                            <br />
                            From local grounds to pro-level eligibility.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                            <Button
                                onClick={() => navigate(session ? '/tournaments/create' : '/auth')}
                                className="h-12 px-7 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-xs tracking-wider uppercase"
                            >
                                Create Tournament
                            </Button>
                            <Button
                                onClick={() => navigate('/live-matches')}
                                variant="outline"
                                className="h-12 px-7 rounded-lg border-neutral-700 text-white hover:bg-white/5 font-bold text-xs tracking-wider uppercase"
                            >
                                Watch Live Match <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>

                    {/* Right: SCOREBOARD UI */}
                    <div className="flex-1 w-full max-w-md lg:max-w-lg">
                        <div className="relative">
                            {/* Glow effect */}
                            <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 to-red-600/20 rounded-3xl blur-2xl opacity-50" />

                            <div className="relative bg-[#0a0a0f] border border-neutral-800 rounded-2xl overflow-hidden">
                                {/* Match header */}
                                <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 px-5 py-3 flex items-center justify-between border-b border-neutral-700">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-black tracking-widest text-red-500 uppercase">Live</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase">Semi-Final • 2nd Half</span>
                                    <div className="flex items-center gap-1.5 text-amber-500">
                                        <Timer className="w-3.5 h-3.5" />
                                        <span className="text-xs font-mono font-bold">08:42</span>
                                    </div>
                                </div>

                                {/* Score display */}
                                <div className="p-6">
                                    <div className="flex items-center justify-between">
                                        {/* Team A */}
                                        <div className="text-center flex-1">
                                            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 flex items-center justify-center mb-2 ring-2 ring-orange-500/50">
                                                <Target className="w-7 h-7 text-orange-500" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-wide">Raiders</span>
                                            <div className="text-[10px] text-neutral-500 mt-0.5">Raiding</div>
                                        </div>

                                        {/* Score */}
                                        <div className="flex-1 text-center px-4">
                                            <div className="flex items-center justify-center gap-3">
                                                <span className="text-5xl font-black text-orange-500 tabular-nums">32</span>
                                                <span className="text-2xl text-neutral-600">-</span>
                                                <span className="text-5xl font-black text-neutral-400 tabular-nums">29</span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-center gap-2">
                                                <div className="h-1 w-3 bg-green-500 rounded-full" />
                                                <div className="h-1 w-3 bg-green-500 rounded-full" />
                                                <div className="h-1 w-3 bg-red-500 rounded-full" />
                                                <div className="h-1 w-3 bg-green-500 rounded-full" />
                                                <div className="h-1 w-3 bg-neutral-700 rounded-full" />
                                            </div>
                                        </div>

                                        {/* Team B */}
                                        <div className="text-center flex-1">
                                            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center mb-2">
                                                <Shield className="w-7 h-7 text-blue-500" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-wide">Warriors</span>
                                            <div className="text-[10px] text-neutral-500 mt-0.5">Defending</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Live event */}
                                <div className="px-5 pb-5">
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                            <Target className="w-4 h-4 text-green-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[10px] font-black text-green-400 uppercase tracking-wider">Touch Point</div>
                                            <div className="text-[10px] text-neutral-500">Rahul → Defender #7</div>
                                        </div>
                                        <div className="text-lg font-black text-green-400">+1</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ STATS STRIP — BROADCAST STYLE ============ */}
            <section ref={statsRef} className="border-y border-neutral-800 bg-[#08080c]">
                <div className="max-w-6xl mx-auto grid grid-cols-3 divide-x divide-neutral-800">
                    {[
                        { value: animatedStats.matches, label: "MATCHES SCORED" },
                        { value: animatedStats.players, label: "PLAYERS TRACKED" },
                        { value: animatedStats.tournaments, label: "TOURNAMENTS RUN" }
                    ].map((s, i) => (
                        <div key={i} className="py-6 px-4 text-center">
                            <div className="text-3xl md:text-4xl font-black tabular-nums tracking-tight">{s.value}+</div>
                            <div className="text-[9px] font-bold tracking-[0.2em] text-neutral-500 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ============ WHAT YOU GET — SPORTS LANGUAGE ============ */}
            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-center mb-14">
                        What You Get
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Trophy,
                                title: "FOR ORGANIZERS",
                                items: ["Fixtures, standings, points tables", "Zero paperwork", "Match-day control"],
                                color: "orange"
                            },
                            {
                                icon: Target,
                                title: "FOR PLAYERS",
                                items: ["Verified raid & tackle stats", "Career progression", "Selector-ready profiles"],
                                color: "blue"
                            },
                            {
                                icon: Timer,
                                title: "FOR SCORERS",
                                items: ["Tap-to-score interface", "Kabaddi-first logic", "Full match control"],
                                color: "green"
                            }
                        ].map((b, i) => (
                            <div key={i} className={cn(
                                "relative bg-[#0a0a0f] border rounded-xl p-6 group hover:border-opacity-50 transition-colors",
                                b.color === "orange" && "border-orange-500/20 hover:border-orange-500/40",
                                b.color === "blue" && "border-blue-500/20 hover:border-blue-500/40",
                                b.color === "green" && "border-green-500/20 hover:border-green-500/40"
                            )}>
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center mb-4",
                                    b.color === "orange" && "bg-orange-500/10",
                                    b.color === "blue" && "bg-blue-500/10",
                                    b.color === "green" && "bg-green-500/10"
                                )}>
                                    <b.icon className={cn(
                                        "w-5 h-5",
                                        b.color === "orange" && "text-orange-500",
                                        b.color === "blue" && "text-blue-500",
                                        b.color === "green" && "text-green-500"
                                    )} />
                                </div>
                                <h3 className="text-xs font-black tracking-widest text-neutral-400 mb-4">{b.title}</h3>
                                <ul className="space-y-2">
                                    {b.items.map((item, j) => (
                                        <li key={j} className="flex items-center gap-2 text-sm text-neutral-300">
                                            <ChevronRight className="w-3 h-3 text-neutral-600" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ HOW IT WORKS — MATCH FLOW ============ */}
            <section className="py-20 px-6 bg-[#08080c] border-y border-neutral-800">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-center mb-14">
                        Match Flow
                    </h2>

                    <div className="relative">
                        {/* Flow line */}
                        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 hidden md:block" />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { phase: "PRE", title: "CREATE", desc: "Set up match" },
                                { phase: "SET", title: "ASSIGN", desc: "Teams & scorer" },
                                { phase: "LIVE", title: "SCORE", desc: "Raid-by-raid" },
                                { phase: "END", title: "LOCKED", desc: "Results final" }
                            ].map((step, i) => (
                                <div key={i} className="relative text-center">
                                    <div className="w-12 h-12 mx-auto rounded-full bg-[#0a0a0f] border-2 border-orange-500 flex items-center justify-center mb-4 relative z-10">
                                        <span className="text-[10px] font-black text-orange-500 tracking-wider">{step.phase}</span>
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-wide mb-1">{step.title}</h3>
                                    <p className="text-xs text-neutral-500">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ PROGRESSION — LEAGUE LADDER ============ */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-3">
                            Progression That Matters
                        </h2>
                        <p className="text-sm text-neutral-500 max-w-md mx-auto">
                            Match XP builds verified levels. Levels unlock selector visibility.
                        </p>
                    </div>

                    {/* League ladder */}
                    <div className="flex items-center justify-center gap-1 md:gap-2 mb-8 overflow-x-auto py-2">
                        {levels.map((level, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveLevel(i)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center w-12 h-16 md:w-16 md:h-20 rounded-lg transition-all duration-150",
                                    activeLevel === i
                                        ? "bg-gradient-to-b from-orange-500 to-red-600 scale-110 shadow-lg shadow-orange-500/30"
                                        : i < activeLevel
                                            ? "bg-neutral-800 opacity-60"
                                            : "bg-neutral-900 border border-neutral-800 opacity-40"
                                )}
                            >
                                <span className={cn(
                                    "text-xs md:text-sm font-black",
                                    activeLevel === i ? "text-white" : "text-neutral-500"
                                )}>{level.short}</span>
                                {activeLevel === i && (
                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <span className="text-[10px] font-bold text-orange-500">{level.name}</span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="h-8" />
                </div>
            </section>

            {/* ============ BUILT FOR EVERYONE ============ */}
            <section className="py-20 px-6 bg-[#08080c] border-y border-neutral-800">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-center mb-12">
                        Built For Everyone in Kabaddi
                    </h2>

                    <Tabs defaultValue="player" className="w-full">
                        <TabsList className="flex w-full max-w-sm mx-auto bg-[#0a0a0f] p-1 rounded-lg h-11 border border-neutral-800 mb-10">
                            <TabsTrigger value="player" className="flex-1 rounded-md text-[10px] font-black tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white text-neutral-500">
                                Player
                            </TabsTrigger>
                            <TabsTrigger value="organizer" className="flex-1 rounded-md text-[10px] font-black tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white text-neutral-500">
                                Organizer
                            </TabsTrigger>
                            <TabsTrigger value="academy" className="flex-1 rounded-md text-[10px] font-black tracking-wider uppercase data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white text-neutral-500">
                                Academy
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="player" className="text-center">
                            <h3 className="text-lg font-black uppercase tracking-tight mb-3">Build Your Career</h3>
                            <p className="text-sm text-neutral-400 mb-8 max-w-md mx-auto">
                                Every raid. Every tackle. Every point. Tracked and verified.
                            </p>
                            <Button onClick={() => navigate('/auth')} className="h-11 px-8 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-lg font-bold text-xs tracking-wider uppercase">
                                <Play className="w-4 h-4 mr-2" /> Create Profile
                            </Button>
                        </TabsContent>

                        <TabsContent value="organizer" className="text-center">
                            <h3 className="text-lg font-black uppercase tracking-tight mb-3">Run Pro Tournaments</h3>
                            <p className="text-sm text-neutral-400 mb-8 max-w-md mx-auto">
                                Auto fixtures. Live scoring. Instant results. Zero disputes.
                            </p>
                            <Button onClick={() => navigate(session ? '/tournaments/create' : '/auth')} className="h-11 px-8 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-lg font-bold text-xs tracking-wider uppercase">
                                <Trophy className="w-4 h-4 mr-2" /> Create Tournament
                            </Button>
                        </TabsContent>

                        <TabsContent value="academy" className="text-center">
                            <h3 className="text-lg font-black uppercase tracking-tight mb-3">Scout Verified Talent</h3>
                            <p className="text-sm text-neutral-400 mb-8 max-w-md mx-auto">
                                Real match data. Proven performance. No fake claims.
                            </p>
                            <Button onClick={() => navigate('/explore-tournaments')} className="h-11 px-8 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-lg font-bold text-xs tracking-wider uppercase">
                                <Users className="w-4 h-4 mr-2" /> Explore Players
                            </Button>
                        </TabsContent>
                    </Tabs>
                </div>
            </section>

            {/* ============ FAQ — MATCH DAY DOUBTS ============ */}
            <section className="py-20 px-6">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-center mb-12">
                        Questions Answered
                    </h2>

                    <div className="space-y-2">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-[#0a0a0f] border border-neutral-800 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-4 text-left"
                                >
                                    <span className="text-sm font-bold">{faq.q}</span>
                                    <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-transform duration-150", openFaq === i && "rotate-180")} />
                                </button>
                                <div className={cn("overflow-hidden transition-all duration-150", openFaq === i ? "max-h-24 pb-4 px-4" : "max-h-0")}>
                                    <p className="text-sm text-neutral-500">{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ FINAL CTA — MATCH DAY CALL ============ */}
            <section className="py-24 px-6 bg-gradient-to-b from-[#08080c] to-[#0a0a0f] border-t border-neutral-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFhMWExYSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
                <div className="max-w-xl mx-auto text-center relative z-10">
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
                        Start Your First Match Today
                    </h2>
                    <p className="text-sm text-neutral-500 mb-10">
                        No contracts. No paperwork. Just Kabaddi.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button
                            onClick={() => navigate(session ? '/matches/create' : '/auth')}
                            className="h-12 px-10 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-xs tracking-wider uppercase"
                        >
                            <Play className="w-4 h-4 mr-2" /> Create Match
                        </Button>
                        <Button
                            onClick={() => navigate('/explore-tournaments')}
                            variant="outline"
                            className="h-12 px-10 rounded-lg border-neutral-700 text-white hover:bg-white/5 font-bold text-xs tracking-wider uppercase"
                        >
                            Explore Tournaments
                        </Button>
                    </div>
                </div>
            </section>

            {/* ============ FOOTER ============ */}
            <footer className="py-8 px-6 border-t border-neutral-800 bg-[#050508]">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-red-600 rounded flex items-center justify-center">
                            <Zap className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-black tracking-tight">RAIDBOOK</span>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-neutral-600">
                        <button onClick={() => navigate('/explore-tournaments')} className="hover:text-neutral-400 transition-colors uppercase tracking-wider font-bold">Tournaments</button>
                        <button onClick={() => navigate('/live-matches')} className="hover:text-neutral-400 transition-colors uppercase tracking-wider font-bold">Live</button>
                        <button className="hover:text-neutral-400 transition-colors uppercase tracking-wider font-bold">Privacy</button>
                        <button className="hover:text-neutral-400 transition-colors uppercase tracking-wider font-bold">Terms</button>
                    </div>

                    <p className="text-xs text-neutral-700">© 2026 RaidBook</p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
