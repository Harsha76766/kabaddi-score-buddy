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
  AlertCircle
} from "lucide-react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";

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
    { num: 1, label: "Teams" },
    { num: 2, label: "Details" },
    { num: 3, label: "Time" },
    { num: 4, label: "Review" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center gap-4 border-b border-slate-700/50">
        <button onClick={() => navigate(-1)} className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black uppercase tracking-tight">Create Match</h1>
          <p className="text-slate-400 text-sm font-medium">Step {currentStep} of 4</p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="px-6 py-4 bg-slate-800/50">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((step, idx) => (
            <div key={step.num} className="flex items-center">
              <button
                onClick={() => step.num < currentStep && setCurrentStep(step.num)}
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all",
                  currentStep === step.num && "bg-teal-500 text-white shadow-lg shadow-teal-500/30",
                  currentStep > step.num && "bg-teal-500/20 text-teal-400 cursor-pointer hover:bg-teal-500/30",
                  currentStep < step.num && "bg-slate-700 text-slate-500"
                )}
              >
                {currentStep > step.num ? <Check className="w-6 h-6" /> : step.num}
              </button>
              <span className={cn(
                "ml-3 text-sm font-bold uppercase tracking-wider hidden md:block",
                currentStep >= step.num ? "text-white" : "text-slate-500"
              )}>
                {step.label}
              </span>
              {idx < steps.length - 1 && (
                <div className={cn(
                  "w-8 md:w-16 h-1 mx-4 rounded-full",
                  currentStep > step.num ? "bg-teal-500" : "bg-slate-700"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">

          {/* STEP 1: SELECT TEAMS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Team Selection Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team A Panel */}
                <div
                  onClick={() => setActiveTeamPanel("A")}
                  className={cn(
                    "bg-slate-800 rounded-3xl p-6 border-2 transition-all cursor-pointer",
                    activeTeamPanel === "A" ? "border-teal-500 shadow-lg shadow-teal-500/20" : "border-slate-700 hover:border-slate-600"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team A</span>
                    {errors.team_a && <span className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Required</span>}
                  </div>
                  {selectedTeamA ? (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-2xl font-black">
                        {selectedTeamA.logo_url ? <img src={selectedTeamA.logo_url} className="w-full h-full rounded-2xl object-cover" /> : selectedTeamA.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-lg font-black">{selectedTeamA.name}</p>
                        <p className="text-slate-400 text-sm">{selectedTeamA.captain_name || "Captain TBD"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-slate-400">
                      <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center">
                        <Plus className="w-8 h-8" />
                      </div>
                      <p className="font-bold">Tap to select</p>
                    </div>
                  )}
                </div>

                {/* Team B Panel */}
                <div
                  onClick={() => setActiveTeamPanel("B")}
                  className={cn(
                    "bg-slate-800 rounded-3xl p-6 border-2 transition-all cursor-pointer",
                    activeTeamPanel === "B" ? "border-teal-500 shadow-lg shadow-teal-500/20" : "border-slate-700 hover:border-slate-600"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team B</span>
                    {errors.team_b && <span className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.team_b}</span>}
                  </div>
                  {selectedTeamB ? (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-black">
                        {selectedTeamB.logo_url ? <img src={selectedTeamB.logo_url} className="w-full h-full rounded-2xl object-cover" /> : selectedTeamB.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-lg font-black">{selectedTeamB.name}</p>
                        <p className="text-slate-400 text-sm">{selectedTeamB.captain_name || "Captain TBD"}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-slate-400">
                      <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center">
                        <Plus className="w-8 h-8" />
                      </div>
                      <p className="font-bold">Tap to select</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline Team Selection Tabs */}
              <div className="bg-slate-800 rounded-3xl overflow-hidden">
                <Tabs value={teamTab} onValueChange={setTeamTab}>
                  <TabsList className="w-full grid grid-cols-4 bg-slate-700/50 p-2 gap-2 rounded-none h-auto">
                    <TabsTrigger value="my-teams" className="h-12 rounded-xl font-bold data-[state=active]:bg-teal-500 data-[state=active]:text-white">
                      <Users className="w-4 h-4 mr-2" /> My Teams
                    </TabsTrigger>
                    <TabsTrigger value="new" className="h-12 rounded-xl font-bold data-[state=active]:bg-teal-500 data-[state=active]:text-white">
                      <Plus className="w-4 h-4 mr-2" /> New Team
                    </TabsTrigger>
                    <TabsTrigger value="invite" className="h-12 rounded-xl font-bold data-[state=active]:bg-teal-500 data-[state=active]:text-white">
                      <Link2 className="w-4 h-4 mr-2" /> Invite
                    </TabsTrigger>
                    <TabsTrigger value="qr" className="h-12 rounded-xl font-bold data-[state=active]:bg-teal-500 data-[state=active]:text-white">
                      <QrCode className="w-4 h-4 mr-2" /> QR
                    </TabsTrigger>
                  </TabsList>

                  {/* My Teams Tab */}
                  <TabsContent value="my-teams" className="p-4 max-h-[40vh] overflow-y-auto">
                    {teams.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-bold">No teams found</p>
                        <p className="text-sm">Create a new team to get started</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                "p-4 rounded-2xl flex items-center gap-4 transition-all text-left h-20",
                                isSelected && "bg-teal-500/20 border-2 border-teal-500",
                                !isSelected && !isDisabled && "bg-slate-700/50 hover:bg-slate-700 border-2 border-transparent",
                                isDisabled && "opacity-40 cursor-not-allowed bg-slate-700/30"
                              )}
                            >
                              <div className="w-12 h-12 rounded-xl bg-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                                {team.logo_url ? <img src={team.logo_url} className="w-full h-full object-cover" /> : <span className="text-xl font-black">{team.name.charAt(0)}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold truncate">{team.name}</p>
                                <p className="text-xs text-slate-400 uppercase tracking-wider">{team.captain_name || "Captain TBD"}</p>
                              </div>
                              {isSelected && <Check className="w-6 h-6 text-teal-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* New Team Tab */}
                  <TabsContent value="new" className="p-6 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Team Name *
                      </Label>
                      <Input
                        value={newTeamName}
                        onChange={(e) => { setNewTeamName(e.target.value); setErrors(prev => ({ ...prev, newTeamName: "" })); }}
                        placeholder="Enter team name"
                        className={cn("h-14 rounded-xl bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 font-medium", errors.newTeamName && "border-red-500")}
                      />
                      {errors.newTeamName && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.newTeamName}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-300 flex items-center gap-2"><UserCircle className="w-4 h-4" /> Captain Name</Label>
                        <Input value={newTeamCaptain} onChange={(e) => setNewTeamCaptain(e.target.value)} placeholder="Enter captain name" className="h-14 rounded-xl bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 font-medium" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Phone className="w-4 h-4" /> Captain Phone</Label>
                        <Input value={captainPhone} onChange={(e) => setCaptainPhone(e.target.value)} placeholder="Enter phone number" type="tel" className="h-14 rounded-xl bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 font-medium" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Upload className="w-4 h-4" /> Team Logo (Optional)</Label>
                      <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="h-14 rounded-xl bg-slate-700 border-slate-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-500 file:text-white file:font-bold" />
                    </div>
                    <Button onClick={handleCreateNewTeam} disabled={creatingTeam} className="w-full h-14 bg-teal-500 hover:bg-teal-600 text-white text-lg font-bold rounded-2xl mt-4">
                      {creatingTeam ? "Creating..." : "Create & Select Team"}
                    </Button>
                  </TabsContent>

                  {/* Invite Tab */}
                  <TabsContent value="invite" className="p-6 space-y-4">
                    <p className="text-slate-400 text-center">Generate an invite link to share with team captains</p>
                    <Button onClick={handleGenerateInviteLink} className="w-full h-14 bg-teal-500 hover:bg-teal-600 rounded-2xl font-bold">
                      <Link2 className="w-5 h-5 mr-2" /> Generate Invite Link
                    </Button>
                    {inviteLink && (
                      <div className="p-4 bg-slate-700 rounded-2xl break-all text-sm text-teal-400">{inviteLink}</div>
                    )}
                  </TabsContent>

                  {/* QR Tab */}
                  <TabsContent value="qr" className="p-6 flex flex-col items-center">
                    <p className="text-slate-400 text-center mb-4">Generate a QR code for teams to scan</p>
                    {inviteLink ? (
                      <QRCodeDisplay value={inviteLink} />
                    ) : (
                      <Button onClick={handleGenerateInviteLink} className="h-14 bg-teal-500 hover:bg-teal-600 rounded-2xl font-bold px-8">
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
              {/* Team Preview */}
              <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black backdrop-blur-md">
                      {selectedTeamA?.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Team A</p>
                      <p className="text-lg font-black">{selectedTeamA?.name}</p>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white/50">VS</div>
                  <div className="flex items-center gap-4 flex-row-reverse">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black backdrop-blur-md">
                      {selectedTeamB?.name?.charAt(0)}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Team B</p>
                      <p className="text-lg font-black">{selectedTeamB?.name}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Type */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Match Type</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "friendly", label: "Friendly", icon: Users },
                    { value: "tournament", label: "Tournament", icon: Trophy },
                    { value: "practice", label: "Practice", icon: Zap },
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setFormData(prev => ({ ...prev, match_type: type.value as any }))}
                      className={cn(
                        "h-16 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                        formData.match_type === type.value
                          ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      )}
                    >
                      <type.icon className="w-5 h-5" />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Venue */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Venue / Ground
                </Label>
                <Input
                  value={formData.venue}
                  onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Enter ground name"
                  className="h-16 rounded-2xl bg-slate-800 border-slate-700 text-white text-lg font-medium placeholder:text-slate-500"
                />
              </div>

              {/* Date & Time */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Date & Time
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.match_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, match_date: e.target.value }))}
                  className="h-16 rounded-2xl bg-slate-800 border-slate-700 text-white text-lg font-medium"
                />
              </div>
            </div>
          )}

          {/* STEP 3: TIME SETTINGS */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black">Time Settings</h2>
                <p className="text-slate-400">Configure match duration and timers</p>
              </div>

              {/* Half Duration */}
              <div className="bg-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-teal-400" />
                    </div>
                    <div>
                      <p className="font-bold">Half Duration</p>
                      <p className="text-sm text-slate-400">Time per half</p>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-teal-400">{formData.half_duration}<span className="text-lg text-slate-400 ml-1">min</span></div>
                </div>
                <Slider
                  value={[formData.half_duration]}
                  onValueChange={([val]) => setFormData(prev => ({ ...prev, half_duration: val }))}
                  min={5} max={30} step={1}
                  className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:bg-teal-500"
                />
                <div className="flex justify-between text-xs text-slate-500"><span>5 min</span><span>30 min</span></div>
              </div>

              {/* Number of Halves - Editable */}
              <div className="bg-slate-800 rounded-3xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                      <span className="text-lg sm:text-xl font-black text-blue-400">#</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm sm:text-base">Number of Halves</p>
                      <p className="text-xs sm:text-sm text-slate-400">Choose 1 or 2 halves</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, num_halves: 1 }))}
                      className={cn(
                        "flex-1 sm:flex-none h-12 sm:h-14 px-6 sm:px-8 rounded-xl font-bold text-lg transition-all",
                        formData.num_halves === 1
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                          : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                      )}
                    >
                      1 Half
                    </button>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, num_halves: 2 }))}
                      className={cn(
                        "flex-1 sm:flex-none h-12 sm:h-14 px-6 sm:px-8 rounded-xl font-bold text-lg transition-all",
                        formData.num_halves === 2
                          ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                          : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                      )}
                    >
                      2 Halves
                    </button>
                  </div>
                </div>
              </div>

              {/* Raid Timer */}
              <div className="bg-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                      <Timer className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <p className="font-bold">Raid Timer</p>
                      <p className="text-sm text-slate-400">Time per raid</p>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-orange-400">{formData.raid_timer}<span className="text-lg text-slate-400 ml-1">sec</span></div>
                </div>
                <Slider
                  value={[formData.raid_timer]}
                  onValueChange={([val]) => setFormData(prev => ({ ...prev, raid_timer: val }))}
                  min={20} max={60} step={5}
                  className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:bg-orange-500"
                />
                <div className="flex justify-between text-xs text-slate-500"><span>20 sec</span><span>60 sec</span></div>
              </div>

              {/* Half-Time Break */}
              <div className="bg-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                      <Coffee className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold">Half-Time Break</p>
                      <p className="text-sm text-slate-400">Break duration</p>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-purple-400">{formData.halftime_break}<span className="text-lg text-slate-400 ml-1">min</span></div>
                </div>
                <Slider
                  value={[formData.halftime_break]}
                  onValueChange={([val]) => setFormData(prev => ({ ...prev, halftime_break: val }))}
                  min={1} max={15} step={1}
                  className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:bg-purple-500"
                />
                <div className="flex justify-between text-xs text-slate-500"><span>1 min</span><span>15 min</span></div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black">Review Match</h2>
                <p className="text-slate-400">Confirm details before starting</p>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-800 rounded-3xl overflow-hidden">
                {/* Teams */}
                <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-black">{selectedTeamA?.name?.charAt(0)}</div>
                      <p className="font-black">{selectedTeamA?.name}</p>
                    </div>
                    <span className="text-2xl font-black text-white/50">VS</span>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-black">{selectedTeamB?.name?.charAt(0)}</div>
                      <p className="font-black">{selectedTeamB?.name}</p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-700">
                    <span className="text-slate-400 flex items-center gap-2 text-sm"><Trophy className="w-4 h-4" /> Match Type</span>
                    <span className="font-bold capitalize text-sm sm:text-base">{formData.match_type}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-700">
                    <span className="text-slate-400 flex items-center gap-2 text-sm"><MapPin className="w-4 h-4" /> Venue</span>
                    <span className="font-bold text-sm sm:text-base truncate ml-4">{formData.venue || "Not specified"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-700">
                    <span className="text-slate-400 flex items-center gap-2 text-sm"><Calendar className="w-4 h-4" /> Date</span>
                    <span className="font-bold text-sm sm:text-base">{new Date(formData.match_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-700">
                    <span className="text-slate-400 flex items-center gap-2 text-sm"><span className="text-blue-400 font-black">#</span> Halves</span>
                    <span className="font-bold text-sm sm:text-base">{formData.num_halves} {formData.num_halves === 1 ? 'Half' : 'Halves'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-700">
                    <span className="text-slate-400 flex items-center gap-2 text-sm"><Clock className="w-4 h-4" /> Half Duration</span>
                    <span className="font-bold text-sm sm:text-base">{formData.half_duration} min</span>
                  </div>
                  <div className="flex items-center justify-between py-2 sm:py-3 border-b border-slate-700">
                    <span className="text-slate-400 flex items-center gap-2 text-sm"><Timer className="w-4 h-4" /> Raid Timer</span>
                    <span className="font-bold text-sm sm:text-base">{formData.raid_timer} sec</span>
                  </div>
                  <div className="flex items-center justify-between py-2 sm:py-3">
                    <span className="text-slate-400 flex items-center gap-2 text-sm"><Coffee className="w-4 h-4" /> Break</span>
                    <span className="font-bold text-sm sm:text-base">{formData.halftime_break} min</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-6 bg-slate-800 border-t border-slate-700 flex gap-4">
        {currentStep > 1 && (
          <Button onClick={prevStep} variant="outline" className="h-16 px-8 rounded-2xl font-bold text-lg border-slate-600 bg-slate-700 hover:bg-slate-600 text-white">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </Button>
        )}
        {currentStep < 4 ? (
          <Button onClick={nextStep} className="flex-1 h-16 bg-teal-500 hover:bg-teal-600 text-white text-lg font-bold rounded-2xl shadow-lg shadow-teal-500/30">
            Next <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <div className="flex-1 flex gap-4">
            <Button onClick={() => navigate('/matches')} variant="outline" className="flex-1 h-16 rounded-2xl font-bold text-lg border-slate-600 bg-slate-700 hover:bg-slate-600 text-white">
              Schedule Later
            </Button>
            <Button onClick={handleCreateMatch} disabled={loading} className="flex-1 h-16 bg-teal-500 hover:bg-teal-600 text-white text-lg font-bold rounded-2xl shadow-lg shadow-teal-500/30">
              {loading ? "Creating..." : "Start Match"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateMatch;
