import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MapPin, Calendar, Search, Trophy, Circle, ChevronRight, Swords } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isAfter, isBefore, isSameDay } from "date-fns";
import BottomNav from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

interface Tournament {
  id: string;
  name: string;
  city: string;
  ground: string;
  start_date: string;
  end_date: string;
  category: string;
  logo_url: string | null;
  status: string;
  organizer_id: string;
  matches?: { status: string }[];
}

const Tournament = () => {
  const [tournaments, setTournaments] = useState<{
    live: Tournament[];
    upcoming: Tournament[];
    completed: Tournament[];
    my: Tournament[];
  }>({ live: [], upcoming: [], completed: [], my: [] });

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("player");
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = profile?.role || "player";
        setUserRole(role);
        setActiveTab(role === 'organizer' || role === 'admin' ? 'my' : 'live');
      }

      // Fetch all tournaments with match count/status to determine "really live" status
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          matches(status)
        `)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const now = new Date();

      const categorized = (data || []).reduce((acc: any, t: any) => {
        const startDate = new Date(t.start_date);
        const endDate = new Date(t.end_date);

        // My Tournaments (Involved as Organizer)
        if (t.organizer_id === user?.id) {
          acc.my.push(t);
        }

        // Live: Active status OR matches marked live right now
        const hasLiveMatches = t.matches?.some((m: any) => m.status === 'live');
        const isCurrentlyRunning = (isBefore(startDate, now) || isSameDay(startDate, now)) &&
          (isAfter(endDate, now) || isSameDay(endDate, now));

        if (hasLiveMatches || (t.status === 'Active' && isCurrentlyRunning)) {
          acc.live.push(t);
        } else if (isAfter(startDate, now) && t.status !== 'Completed') {
          acc.upcoming.push(t);
        } else if (isBefore(endDate, now) || t.status === 'Completed') {
          acc.completed.push(t);
        }

        return acc;
      }, { live: [], upcoming: [], completed: [], my: [] });

      setTournaments(categorized);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTournaments = (list: Tournament[]) => {
    return list.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCity = !cityFilter || t.city.toLowerCase() === cityFilter.toLowerCase();
      return matchesSearch && matchesCity;
    });
  };

  const renderStatusBadge = (status: string, tournament: Tournament) => {
    const now = new Date();
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date);

    // Determine the real display status
    let displayStatus = "Completed";
    let badgeClass = "bg-slate-100 text-slate-500 uppercase";

    const hasLiveMatches = tournament.matches?.some((m: any) => m.status === 'live');
    const isCurrentlyRunning = (isBefore(startDate, now) || isSameDay(startDate, now)) &&
      (isAfter(endDate, now) || isSameDay(endDate, now));

    if (hasLiveMatches || (tournament.status === 'Active' && isCurrentlyRunning)) {
      displayStatus = "LIVE";
      badgeClass = "bg-red-50 text-red-600 border border-red-100 animate-pulse uppercase";
    } else if (isAfter(startDate, now)) {
      displayStatus = "UPCOMING";
      badgeClass = "bg-amber-50 text-amber-600 border border-amber-100 uppercase";
    }

    return (
      <Badge className={cn("text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full border-0", badgeClass)}>
        {displayStatus === "LIVE" && <Circle className="w-1.5 h-1.5 fill-current mr-1.5" />}
        {displayStatus}
      </Badge>
    );
  };

  const renderTournamentCard = (t: Tournament) => (
    <Card
      key={t.id}
      className="group bg-white border-2 border-slate-100 hover:border-orange-500/20 rounded-[32px] overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-95"
      onClick={() => navigate(`/tournaments/${t.id}`)}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-5 p-5">
          {/* Logo Area */}
          <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center border-2 border-slate-100 group-hover:bg-orange-50 group-hover:border-orange-100 transition-colors shrink-0 overflow-hidden relative">
            {t.logo_url ? (
              <img src={t.logo_url} className="w-full h-full object-cover" alt={t.name} />
            ) : (
              <Trophy className="w-7 h-7 text-slate-300 group-hover:text-orange-400 transition-colors" />
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Info Area */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-sm font-black italic uppercase text-slate-900 truncate tracking-tight group-hover:text-orange-600 transition-colors">
                {t.name}
              </h3>
              {renderStatusBadge(t.status, t)}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest truncate">{t.city}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {format(new Date(t.start_date), 'MMM d')} - {format(new Date(t.end_date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>

          {/* CTA Arrow */}
          <div className="pl-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 transition-all duration-500 group-hover:scale-110">
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmptyState = (tab: string) => {
    const configs: Record<string, { icon: any, msg: string, btn: string, action: () => void }> = {
      live: {
        icon: Swords,
        msg: "No live tournaments right now",
        btn: "Explore Upcoming",
        action: () => setActiveTab("upcoming")
      },
      upcoming: {
        icon: Calendar,
        msg: "No upcoming tournaments found",
        btn: "Refresh",
        action: () => fetchTournaments()
      },
      completed: {
        icon: Trophy,
        msg: "No completed tournaments yet",
        btn: "Refresh",
        action: () => fetchTournaments()
      },
      my: {
        icon: Trophy,
        msg: "You haven't joined any tournaments yet",
        btn: "Find Tournaments",
        action: () => setActiveTab("live")
      }
    };

    const config = configs[tab] || configs.live;
    const Icon = config.icon || Trophy;

    return (
      <div className="py-20 flex flex-col items-center justify-center text-center px-10">
        <div className="w-24 h-24 rounded-[32px] bg-slate-50 flex items-center justify-center mb-6 relative overflow-hidden group">
          <Icon className="w-10 h-10 text-slate-200 group-hover:text-orange-600 transition-colors relative z-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs font-black italic uppercase tracking-[0.2em] text-slate-400 mb-6">{config.msg}</p>
        <Button
          variant="outline"
          className="rounded-2xl border-2 border-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all px-8 h-12"
          onClick={config.action}
        >
          {config.btn}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      {/* TOP BAR - FIXED */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 h-16 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-xl font-black italic uppercase tracking-tighter text-slate-900">Tourneys</span>
        </div>
        <div className="flex items-center gap-3">
          <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <SheetTrigger asChild>
              <button className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 group">
                <Search className="w-5 h-5 group-hover:text-slate-900 transition-colors" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[32px] h-[400px] bg-white border-0 p-8 shadow-2xl">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 text-left">
                  Search & Filter
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tournament Name / City</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="e.g. Pro Kabaddi, Mumbai..."
                      className="rounded-2xl border-2 border-slate-100 bg-slate-50 h-14 pl-12 text-sm font-bold focus:ring-orange-500/20"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Filter by City</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Mumbai', 'Delhi', 'Pune', 'Bangalore', 'Chennai'].map((city) => (
                      <button
                        key={city}
                        onClick={() => setCityFilter(cityFilter === city ? "" : city)}
                        className={cn(
                          "h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                          cityFilter === city
                            ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black italic uppercase tracking-widest shadow-xl shadow-orange-600/20"
                  onClick={() => setIsSearchOpen(false)}
                >
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {(userRole === 'organizer' || userRole === 'admin') && (
            <button
              onClick={() => navigate('/tournaments/create')}
              className="w-10 h-10 bg-orange-600 hover:bg-orange-700 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20 transition-all hover:scale-110 active:scale-95"
            >
              <Plus className="w-6 h-6 stroke-[3px]" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* SEGMENTED TABS - STICKY */}
        <div className="sticky top-16 z-40 bg-white/50 backdrop-blur-sm px-6 py-4 border-b border-slate-100/50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full bg-slate-100/50 p-1.5 rounded-2xl h-14 border border-slate-200/50">
              <TabsTrigger value="live" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm transition-all border-0 ring-0">Live</TabsTrigger>
              <TabsTrigger value="upcoming" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm transition-all border-0 ring-0">Upcoming</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all border-0 ring-0">History</TabsTrigger>
              <TabsTrigger value="my" className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all border-0 ring-0">My Hub</TabsTrigger>
            </TabsList>

            <div className="mt-6 space-y-4 px-1">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white border-2 border-slate-100 rounded-[32px] p-5 flex items-center gap-5">
                      <Skeleton className="w-16 h-16 rounded-[24px]" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-4 w-3/4 rounded-full" />
                        <Skeleton className="h-3 w-1/2 rounded-full" />
                        <Skeleton className="h-3 w-1/3 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <TabsContent value="live" className="space-y-4 mt-0 border-0 ring-0 focus-visible:ring-0">
                    {getFilteredTournaments(tournaments.live).length === 0 ? renderEmptyState("live") : getFilteredTournaments(tournaments.live).map(t => renderTournamentCard(t))}
                  </TabsContent>
                  <TabsContent value="upcoming" className="space-y-4 mt-0 border-0 ring-0 focus-visible:ring-0">
                    {getFilteredTournaments(tournaments.upcoming).length === 0 ? renderEmptyState("upcoming") : getFilteredTournaments(tournaments.upcoming).map(t => renderTournamentCard(t))}
                  </TabsContent>
                  <TabsContent value="completed" className="space-y-4 mt-0 border-0 ring-0 focus-visible:ring-0">
                    {getFilteredTournaments(tournaments.completed).length === 0 ? renderEmptyState("completed") : getFilteredTournaments(tournaments.completed).map(t => renderTournamentCard(t))}
                  </TabsContent>
                  <TabsContent value="my" className="space-y-4 mt-0 border-0 ring-0 focus-visible:ring-0">
                    {getFilteredTournaments(tournaments.my).length === 0 ? renderEmptyState("my") : getFilteredTournaments(tournaments.my).map(t => renderTournamentCard(t))}
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Tournament;
