import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Plus, Users, MapPin, Calendar, Trophy, Zap,
  Upload, UserCircle, Phone, Clock, Timer, Coffee, Link2, QrCode, Check,
  AlertCircle, Swords, ChevronRight
} from "lucide-react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "create_match_draft";

const matchSchema = z.object({
  match_name: z.string().optional(),
  team_a_id: z.string().uuid("Select Team A"),
  team_b_id: z.string().uuid("Select Team B"),
  venue: z.string().optional(),
  match_type: z.enum(["friendly", "tournament", "practice"]),
  match_date: z.string(),
  half_duration: z.number().min(5).max(30),
  num_halves: z.number().min(1).max(2),
  raid_timer: z.number().min(20).max(60),
  halftime_break: z.number().min(1).max(15),
}).refine((data) => data.team_a_id !== data.team_b_id, {
  message: "Teams must be different",
  path: ["team_b_id"],
});

interface FormData {
  match_name: string;
  team_a_id: string;
  team_b_id: string;
  venue: string;
  match_type: "friendly" | "tournament" | "practice";
  match_date: string;
  half_duration: number;
  num_halves: number;
  raid_timer: number;
  halftime_break: number;
}

const CreateMatch = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTeamPanel, setActiveTeamPanel] = useState<"A" | "B">("A");
  const [teamTab, setTeamTab] = useState("my-teams");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // New team form state
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamCaptain, setNewTeamCaptain] = useState("");
  const [captainPhone, setCaptainPhone] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  // Phone lookup state
  const [phoneSearching, setPhoneSearching] = useState(false);
  const [foundPlayer, setFoundPlayer] = useState<any>(null);
  const [phoneSearched, setPhoneSearched] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    match_name: "",
    team_a_id: "",
    team_b_id: "",
    venue: "",
    match_type: "friendly",
    match_date: new Date().toISOString().slice(0, 16),
    half_duration: 20,
    num_halves: 2,
    raid_timer: 30,
    halftime_break: 5,
  });

  const selectedTeamA = teams.find(t => t.id === formData.team_a_id);
  const selectedTeamB = teams.find(t => t.id === formData.team_b_id);

  // Load draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...draft }));
      } catch { }
    }
    fetchTeams();
  }, []);

  // Auto-save draft
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error loading teams", description: error.message });
    }
  };

  // Phone number lookup function - searches for players/users
  const handlePhoneLookup = async (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setFoundPlayer(null);
      setPhoneSearched(false);
      return;
    }

    setPhoneSearching(true);
    setPhoneSearched(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`phone.ilike.%${cleanPhone}%,phone.ilike.%${phone}%`)
        .limit(1);

      if (error) throw error;
      setFoundPlayer(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Player lookup error:', error);
      setFoundPlayer(null);
    } finally {
      setPhoneSearching(false);
    }
  };

  const handleCreateNewTeam = async () => {
    if (!newTeamName.trim()) {
      setErrors(prev => ({ ...prev, newTeamName: "Team name is required" }));
      return;
    }
    setErrors(prev => ({ ...prev, newTeamName: "" }));

    setCreatingTeam(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login first");

      let logoUrl = null;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('team-logos').upload(fileName, logoFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('team-logos').getPublicUrl(fileName);
          logoUrl = publicUrl;
        }
      }

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({ name: newTeamName, captain_name: newTeamCaptain || null, captain_phone: captainPhone || null, logo_url: logoUrl, created_by: user.id })
        .select()
        .single();

      if (teamError || !team) throw teamError || new Error("Failed to create team");

      setFormData(prev => ({
        ...prev,
        [activeTeamPanel === "A" ? "team_a_id" : "team_b_id"]: team.id,
      }));

      await fetchTeams();
      setNewTeamName("");
      setNewTeamCaptain("");
      setCaptainPhone("");
      setLogoFile(null);
      setTeamTab("my-teams");
      toast({ title: "Team created!", description: team.name });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleGenerateInviteLink = async () => {
    const inviteCode = Math.random().toString(36).substring(2, 15);
    const link = `${window.location.origin}/join-match?code=${inviteCode}`;
    setInviteLink(link);
    navigator.clipboard.writeText(link);
    toast({ title: "Invite link copied!" });
  };

  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.team_a_id) newErrors.team_a = "Select Team A";
      if (!formData.team_b_id) newErrors.team_b = "Select Team B";
      if (formData.team_a_id && formData.team_a_id === formData.team_b_id) newErrors.team_b = "Teams must be different";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleCreateMatch = async () => {
    setLoading(true);
    try {
      const matchName = formData.match_name || `${selectedTeamA?.name || 'Team A'} vs ${selectedTeamB?.name || 'Team B'}`;
      const validated = matchSchema.parse({ ...formData, match_name: matchName });
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("matches")
        .insert([{
          match_name: validated.match_name,
          team_a_id: validated.team_a_id,
          team_b_id: validated.team_b_id,
          venue: validated.venue || "Not specified",
          match_type: validated.match_type,
          match_date: validated.match_date,
          status: "upcoming",
          created_by: user?.id,
          settings: {
            half_duration: validated.half_duration,
            num_halves: validated.num_halves,
            raid_timer: validated.raid_timer,
            halftime_break: validated.halftime_break,
          }
        }])
        .select()
        .single();

      if (error) throw error;

      localStorage.removeItem(STORAGE_KEY);
      toast({ title: "Match created!", description: "Starting match..." });
      navigate(`/matches/${data.id}/score`, { state: { setup: true } });
    } catch (error: any) {
      let errorMessage = error.message;
      if (error instanceof z.ZodError) errorMessage = error.errors[0].message;
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: "Teams", icon: Users },
    { num: 2, label: "Details", icon: Swords },
    { num: 3, label: "Time", icon: Clock },
    { num: 4, label: "Review", icon: Check },
  ];

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-orange-500/30">
      {/* Premium Header with Glassmorphism */}
      <header className="sticky top-0 z-50 bg-[#050508]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 border border-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black italic uppercase tracking-tighter">Create Match</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-500">Step {currentStep} of 4</p>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
          </div>
        </div>
      </header>

      {/* Premium Progress Stepper */}
      <div className="bg-white/[0.02] border-b border-white/5">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <button
                  onClick={() => step.num < currentStep && setCurrentStep(step.num)}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative group",
                    currentStep === step.num && "bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-600/30",
                    currentStep > step.num && "bg-white/10 cursor-pointer hover:bg-white/15",
                    currentStep < step.num && "bg-white/5"
                  )}
                >
                  {currentStep > step.num ? (
                    <Check className="w-5 h-5 text-orange-400" />
                  ) : (
                    <step.icon className={cn(
                      "w-5 h-5",
                      currentStep === step.num ? "text-white" : "text-neutral-500"
                    )} />
                  )}
                </button>
                <div className={cn(
                  "ml-3 hidden sm:block",
                  currentStep >= step.num ? "text-white" : "text-neutral-600"
                )}>
                  <p className="text-[10px] font-black uppercase tracking-widest">{step.label}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-4 rounded-full",
                    currentStep > step.num ? "bg-gradient-to-r from-orange-500 to-orange-500/50" : "bg-white/5"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* STEP 1: SELECT TEAMS */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Team Selection Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Team A Card */}
              <div
                onClick={() => setActiveTeamPanel("A")}
                className={cn(
                  "bg-white/[0.03] rounded-3xl p-5 border-2 transition-all cursor-pointer group hover:bg-white/[0.05]",
                  activeTeamPanel === "A"
                    ? "border-orange-500 shadow-lg shadow-orange-500/10"
                    : "border-white/5 hover:border-white/10"
                )}
              >
                <Badge className={cn(
                  "mb-4 text-[9px] font-black uppercase tracking-widest",
                  activeTeamPanel === "A" ? "bg-orange-500" : "bg-white/10 text-neutral-400"
                )}>
                  Team A
                </Badge>
                {selectedTeamA ? (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-xl font-black overflow-hidden">
                      {selectedTeamA.logo_url ? (
                        <img src={selectedTeamA.logo_url} className="w-full h-full object-cover" />
                      ) : selectedTeamA.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-sm truncate">{selectedTeamA.name}</p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{selectedTeamA.captain_name || "Captain TBD"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <Plus className="w-6 h-6 text-neutral-500 group-hover:text-orange-500 transition-colors" />
                    </div>
                    <p className="text-sm text-neutral-500 group-hover:text-white transition-colors">Tap to select</p>
                  </div>
                )}
                {errors.team_a && (
                  <p className="mt-2 text-red-400 text-[10px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Required
                  </p>
                )}
              </div>

              {/* VS Divider */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <span className="text-xs font-black text-neutral-500">VS</span>
                </div>
              </div>

              {/* Team B Card */}
              <div
                onClick={() => setActiveTeamPanel("B")}
                className={cn(
                  "bg-white/[0.03] rounded-3xl p-5 border-2 transition-all cursor-pointer group hover:bg-white/[0.05]",
                  activeTeamPanel === "B"
                    ? "border-orange-500 shadow-lg shadow-orange-500/10"
                    : "border-white/5 hover:border-white/10"
                )}
              >
                <Badge className={cn(
                  "mb-4 text-[9px] font-black uppercase tracking-widest",
                  activeTeamPanel === "B" ? "bg-orange-500" : "bg-white/10 text-neutral-400"
                )}>
                  Team B
                </Badge>
                {selectedTeamB ? (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-black overflow-hidden">
                      {selectedTeamB.logo_url ? (
                        <img src={selectedTeamB.logo_url} className="w-full h-full object-cover" />
                      ) : selectedTeamB.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-sm truncate">{selectedTeamB.name}</p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{selectedTeamB.captain_name || "Captain TBD"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <Plus className="w-6 h-6 text-neutral-500 group-hover:text-orange-500 transition-colors" />
                    </div>
                    <p className="text-sm text-neutral-500 group-hover:text-white transition-colors">Tap to select</p>
                  </div>
                )}
                {errors.team_b && (
                  <p className="mt-2 text-red-400 text-[10px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.team_b}
                  </p>
                )}
              </div>
            </div>

            {/* Team Selection Panel */}
            <div className="bg-white/[0.03] rounded-3xl border border-white/5 overflow-hidden">
              <Tabs value={teamTab} onValueChange={setTeamTab}>
                <TabsList className="w-full grid grid-cols-4 bg-white/[0.02] p-1.5 gap-1 rounded-none h-auto border-b border-white/5">
                  <TabsTrigger value="my-teams" className="h-11 rounded-xl text-[10px] font-black uppercase tracking-wide data-[state=active]:bg-orange-500 data-[state=active]:text-white text-neutral-400">
                    <Users className="w-4 h-4 mr-2" /> My Teams
                  </TabsTrigger>
                  <TabsTrigger value="new" className="h-11 rounded-xl text-[10px] font-black uppercase tracking-wide data-[state=active]:bg-orange-500 data-[state=active]:text-white text-neutral-400">
                    <Plus className="w-4 h-4 mr-2" /> New
                  </TabsTrigger>
                  <TabsTrigger value="invite" className="h-11 rounded-xl text-[10px] font-black uppercase tracking-wide data-[state=active]:bg-orange-500 data-[state=active]:text-white text-neutral-400">
                    <Link2 className="w-4 h-4 mr-2" /> Invite
                  </TabsTrigger>
                  <TabsTrigger value="qr" className="h-11 rounded-xl text-[10px] font-black uppercase tracking-wide data-[state=active]:bg-orange-500 data-[state=active]:text-white text-neutral-400">
                    <QrCode className="w-4 h-4 mr-2" /> QR
                  </TabsTrigger>
                </TabsList>

                {/* My Teams Tab */}
                <TabsContent value="my-teams" className="p-4 max-h-[45vh] overflow-y-auto">
                  {teams.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-neutral-600" />
                      </div>
                      <p className="font-bold text-neutral-400">No teams found</p>
                      <p className="text-sm text-neutral-600 mt-1">Create a new team to get started</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {teams.map((team) => {
                        const isSelected = (activeTeamPanel === "A" && team.id === formData.team_a_id) ||
                          (activeTeamPanel === "B" && team.id === formData.team_b_id);
                        const isDisabled = (activeTeamPanel === "A" && team.id === formData.team_b_id) ||
                          (activeTeamPanel === "B" && team.id === formData.team_a_id);
                        return (
                          <button
                            key={team.id}
                            onClick={() => !isDisabled && setFormData(prev => ({
                              ...prev,
                              [activeTeamPanel === "A" ? "team_a_id" : "team_b_id"]: team.id,
                            }))}
                            disabled={isDisabled}
                            className={cn(
                              "p-4 rounded-2xl flex items-center gap-3 transition-all text-left",
                              isSelected && "bg-orange-500/10 border-2 border-orange-500",
                              !isSelected && !isDisabled && "bg-white/[0.03] hover:bg-white/[0.06] border-2 border-transparent",
                              isDisabled && "opacity-30 cursor-not-allowed bg-white/[0.02]"
                            )}
                          >
                            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                              {team.logo_url ? (
                                <img src={team.logo_url} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg font-black">{team.name.charAt(0)}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{team.name}</p>
                              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{team.captain_name || "Captain TBD"}</p>
                            </div>
                            {isSelected && <Check className="w-5 h-5 text-orange-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* New Team Tab */}
                <TabsContent value="new" className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" /> Team Name *
                    </Label>
                    <Input
                      value={newTeamName}
                      onChange={(e) => { setNewTeamName(e.target.value); setErrors(prev => ({ ...prev, newTeamName: "" })); }}
                      placeholder="Enter team name"
                      className={cn(
                        "h-14 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-neutral-600 font-medium focus:border-orange-500 focus:ring-orange-500/20",
                        errors.newTeamName && "border-red-500"
                      )}
                    />
                    {errors.newTeamName && <p className="text-red-400 text-[10px] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.newTeamName}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                        <UserCircle className="w-3.5 h-3.5" /> Captain Name
                      </Label>
                      <Input
                        value={newTeamCaptain}
                        onChange={(e) => setNewTeamCaptain(e.target.value)}
                        placeholder="Enter name"
                        className="h-14 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-neutral-600 font-medium focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" /> Captain Phone
                      </Label>
                      <div className="relative">
                        <Input
                          value={captainPhone}
                          onChange={(e) => {
                            setCaptainPhone(e.target.value);
                            handlePhoneLookup(e.target.value);
                          }}
                          placeholder="10 digits"
                          type="tel"
                          maxLength={15}
                          className={cn(
                            "h-14 rounded-2xl bg-white/5 border-2 text-white placeholder:text-neutral-600 font-medium pr-20",
                            phoneSearched && foundPlayer && "border-green-500 bg-green-500/5",
                            phoneSearched && !foundPlayer && !phoneSearching && "border-orange-500 bg-orange-500/5",
                            !phoneSearched && "border-white/10"
                          )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {phoneSearching ? (
                            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                          ) : phoneSearched && foundPlayer ? (
                            <Badge className="bg-green-500 text-[9px] font-black uppercase">Found</Badge>
                          ) : phoneSearched && !foundPlayer ? (
                            <Badge className="bg-orange-500 text-[9px] font-black uppercase">New</Badge>
                          ) : null}
                        </div>
                      </div>
                      {phoneSearched && foundPlayer && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl mt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                <UserCircle className="w-4 h-4 text-green-400" />
                              </div>
                              <div>
                                <p className="text-green-400 font-bold text-xs">{foundPlayer.name || 'Player'}</p>
                                <p className="text-green-400/60 text-[10px]">{foundPlayer.phone}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setNewTeamCaptain(foundPlayer.name || '');
                                toast({ title: "Captain set!", description: foundPlayer.name });
                              }}
                              className="bg-green-500 hover:bg-green-600 text-white h-7 px-3 text-[10px] font-black uppercase rounded-lg"
                            >
                              Set Captain
                            </Button>
                          </div>
                        </div>
                      )}
                      {phoneSearched && !foundPlayer && !phoneSearching && (
                        <p className="text-orange-400/80 text-[10px] mt-1">Player not registered yet</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" /> Team Logo (Optional)
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="h-14 rounded-2xl bg-white/5 border-white/10 text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-orange-500 file:text-white file:font-bold file:text-xs file:uppercase file:tracking-wide"
                    />
                  </div>

                  <Button
                    onClick={handleCreateNewTeam}
                    disabled={creatingTeam}
                    className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black uppercase tracking-wide rounded-2xl shadow-lg shadow-orange-600/20 mt-4"
                  >
                    {creatingTeam ? "Creating..." : "Create & Select Team"}
                  </Button>
                </TabsContent>

                {/* Invite Tab */}
                <TabsContent value="invite" className="p-6 space-y-4">
                  <p className="text-neutral-500 text-center text-sm">Generate an invite link to share with team captains</p>
                  <Button
                    onClick={handleGenerateInviteLink}
                    className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-2xl font-black uppercase tracking-wide shadow-lg shadow-orange-600/20"
                  >
                    <Link2 className="w-5 h-5 mr-2" /> Generate Invite Link
                  </Button>
                  {inviteLink && (
                    <div className="p-4 bg-white/5 rounded-2xl break-all text-sm text-orange-400 border border-white/5">{inviteLink}</div>
                  )}
                </TabsContent>

                {/* QR Tab */}
                <TabsContent value="qr" className="p-6 flex flex-col items-center">
                  <p className="text-neutral-500 text-center mb-4 text-sm">Generate a QR code for teams to scan</p>
                  {inviteLink ? (
                    <QRCodeDisplay value={inviteLink} />
                  ) : (
                    <Button
                      onClick={handleGenerateInviteLink}
                      className="h-14 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-2xl font-black uppercase tracking-wide px-8 shadow-lg shadow-orange-600/20"
                    >
                      <QrCode className="w-5 h-5 mr-2" /> Generate QR Code
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {/* STEP 2: MATCH DETAILS */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Team Preview Card */}
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-3xl p-6 shadow-xl shadow-orange-600/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-black">
                    {selectedTeamA?.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Team A</p>
                    <p className="font-black truncate max-w-24">{selectedTeamA?.name}</p>
                  </div>
                </div>
                <div className="text-2xl font-black text-white/40 italic">VS</div>
                <div className="flex items-center gap-3 flex-row-reverse text-right">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-black">
                    {selectedTeamB?.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Team B</p>
                    <p className="font-black truncate max-w-24">{selectedTeamB?.name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Match Type Selection */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Match Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "friendly", label: "Friendly", icon: Users, color: "green" },
                  { value: "tournament", label: "Tournament", icon: Trophy, color: "orange" },
                  { value: "practice", label: "Practice", icon: Zap, color: "blue" },
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setFormData(prev => ({ ...prev, match_type: type.value as any }))}
                    className={cn(
                      "p-4 rounded-2xl font-bold text-xs uppercase tracking-wide transition-all flex flex-col items-center gap-2 border-2",
                      formData.match_type === type.value
                        ? "bg-orange-500/10 border-orange-500 text-white"
                        : "bg-white/[0.03] border-white/5 text-neutral-400 hover:bg-white/[0.05] hover:border-white/10"
                    )}
                  >
                    <type.icon className={cn(
                      "w-6 h-6",
                      formData.match_type === type.value && "text-orange-500"
                    )} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> Venue / Ground
              </Label>
              <Input
                value={formData.venue}
                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                placeholder="Enter venue name"
                className="h-14 rounded-2xl bg-white/5 border-white/10 text-white text-base font-medium placeholder:text-neutral-600 focus:border-orange-500"
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Date & Time
              </Label>
              <Input
                type="datetime-local"
                value={formData.match_date}
                onChange={(e) => setFormData(prev => ({ ...prev, match_date: e.target.value }))}
                className="h-14 rounded-2xl bg-white/5 border-white/10 text-white text-base font-medium focus:border-orange-500"
              />
            </div>
          </div>
        )}

        {/* STEP 3: TIME SETTINGS */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-black italic uppercase tracking-tight">Time Settings</h2>
              <p className="text-neutral-500 text-sm mt-1">Configure match duration and timers</p>
            </div>

            {/* Half Duration */}
            <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Half Duration</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Time per half</p>
                  </div>
                </div>
                <div className="text-3xl font-black italic text-orange-400">{formData.half_duration}<span className="text-lg text-neutral-500 ml-1">min</span></div>
              </div>
              <Slider
                value={[formData.half_duration]}
                onValueChange={([val]) => setFormData(prev => ({ ...prev, half_duration: val }))}
                min={5} max={30} step={1}
                className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-0"
              />
              <div className="flex justify-between text-[10px] text-neutral-600 uppercase tracking-widest"><span>5 min</span><span>30 min</span></div>
            </div>

            {/* Number of Halves */}
            <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <span className="text-xl font-black text-blue-400">#</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">Number of Halves</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Choose 1 or 2</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[1, 2].map(num => (
                    <button
                      key={num}
                      onClick={() => setFormData(prev => ({ ...prev, num_halves: num }))}
                      className={cn(
                        "w-14 h-12 rounded-xl font-black text-lg transition-all",
                        formData.num_halves === num
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                          : "bg-white/5 text-neutral-500 hover:bg-white/10"
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Raid Timer */}
            <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Timer className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Raid Timer</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Time per raid</p>
                  </div>
                </div>
                <div className="text-3xl font-black italic text-red-400">{formData.raid_timer}<span className="text-lg text-neutral-500 ml-1">sec</span></div>
              </div>
              <Slider
                value={[formData.raid_timer]}
                onValueChange={([val]) => setFormData(prev => ({ ...prev, raid_timer: val }))}
                min={20} max={60} step={5}
                className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:bg-red-500 [&_[role=slider]]:border-0"
              />
              <div className="flex justify-between text-[10px] text-neutral-600 uppercase tracking-widest"><span>20 sec</span><span>60 sec</span></div>
            </div>

            {/* Half-Time Break */}
            <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                    <Coffee className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Half-Time Break</p>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Break duration</p>
                  </div>
                </div>
                <div className="text-3xl font-black italic text-purple-400">{formData.halftime_break}<span className="text-lg text-neutral-500 ml-1">min</span></div>
              </div>
              <Slider
                value={[formData.halftime_break]}
                onValueChange={([val]) => setFormData(prev => ({ ...prev, halftime_break: val }))}
                min={1} max={15} step={1}
                className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:bg-purple-500 [&_[role=slider]]:border-0"
              />
              <div className="flex justify-between text-[10px] text-neutral-600 uppercase tracking-widest"><span>1 min</span><span>15 min</span></div>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-black italic uppercase tracking-tight">Review Match</h2>
              <p className="text-neutral-500 text-sm mt-1">Confirm details before starting</p>
            </div>

            {/* Summary Card */}
            <div className="bg-white/[0.03] rounded-3xl border border-white/5 overflow-hidden">
              {/* Teams Header */}
              <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-black">
                      {selectedTeamA?.name?.charAt(0)}
                    </div>
                    <p className="font-black text-sm truncate max-w-20">{selectedTeamA?.name}</p>
                  </div>
                  <span className="text-xl font-black text-white/40 italic">VS</span>
                  <div className="flex items-center gap-3 flex-row-reverse">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-black">
                      {selectedTeamB?.name?.charAt(0)}
                    </div>
                    <p className="font-black text-sm truncate max-w-20">{selectedTeamB?.name}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4">
                {[
                  { icon: Trophy, label: "Match Type", value: formData.match_type, color: "orange" },
                  { icon: MapPin, label: "Venue", value: formData.venue || "Not specified", color: "neutral" },
                  { icon: Calendar, label: "Date", value: new Date(formData.match_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }), color: "neutral" },
                  { icon: Clock, label: "Duration", value: `${formData.num_halves} x ${formData.half_duration} min`, color: "orange" },
                  { icon: Timer, label: "Raid Timer", value: `${formData.raid_timer} sec`, color: "red" },
                  { icon: Coffee, label: "Break", value: `${formData.halftime_break} min`, color: "purple" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <span className="text-neutral-500 flex items-center gap-2 text-xs uppercase tracking-widest">
                      <item.icon className="w-4 h-4" /> {item.label}
                    </span>
                    <span className="font-bold text-sm capitalize">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions - Fixed */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#050508]/95 backdrop-blur-2xl border-t border-white/5 p-6">
        <div className="max-w-2xl mx-auto flex gap-4">
          {currentStep > 1 && (
            <Button
              onClick={prevStep}
              variant="outline"
              className="h-14 px-6 rounded-2xl font-black uppercase tracking-wide border-white/10 bg-white/5 hover:bg-white/10 text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </Button>
          )}
          {currentStep < 4 ? (
            <Button
              onClick={nextStep}
              className="flex-1 h-14 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black uppercase tracking-wide rounded-2xl shadow-lg shadow-orange-600/20"
            >
              Next <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <div className="flex-1 flex gap-3">
              <Button
                onClick={() => navigate('/matches')}
                variant="outline"
                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-wide border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                Schedule Later
              </Button>
              <Button
                onClick={handleCreateMatch}
                disabled={loading}
                className="flex-1 h-14 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black uppercase tracking-wide rounded-2xl shadow-lg shadow-orange-600/20"
              >
                {loading ? "Creating..." : "Start Match"} <Zap className="w-5 h-5 ml-2 fill-current" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateMatch;
