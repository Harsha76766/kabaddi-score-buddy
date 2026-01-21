import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Upload, Trophy, Settings, Info, Calendar as CalendarIcon, Phone, MapPin, ChevronRight, Swords, Users2 } from "lucide-react";
import { z } from "zod";

const tournamentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  city: z.string().min(2, "City is required"),
  ground: z.string().min(2, "Ground name is required"),
  start_date: z.string(),
  end_date: z.string(),
  category: z.string(),
  tournament_type: z.string(),
  half_duration: z.string(),
  players_per_team: z.string(),
  points_win: z.string(),
  points_tie: z.string(),
  points_loss: z.string(),
  tie_breaker: z.string(),
});

const categories = [
  "Open",
  "Corporate",
  "Community",
  "School",
  "College",
  "University",
  "Series",
  "Other",
];

const tournamentTypes = ["League", "Knockout", "Round Robin"];

const CreateTournament = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    // Basic Details
    name: "",
    city: "",
    ground: "",
    organizer_phone: "",
    start_date: "",
    end_date: "",
    category: "Open",
    tournament_type: "League",

    // Team Configuration
    max_teams: "16",
    min_teams: "4",
    players_per_team: "12",
    on_court_players: "7",
    substitutes: "5",
    foreign_players_allowed: false,
    max_foreign_players: "0",

    // Match Rules
    match_duration: "40",
    halves: "2",
    half_duration: "20",
    break_duration: "5",
    raid_timer: "30",
    timeouts_per_half: "2",
    timeout_duration: "30",
    all_out_points: "2",

    // Points System
    points_win: "2",
    points_tie: "1",
    points_loss: "0",
    tie_breaker: "Score Difference",

    // Advanced Rules (Toggles)
    bonus_line_enabled: true,
    super_tackle_enabled: true,
    do_or_die_raid: true,
    golden_raid: false,
    review_system: false,
    video_referee: false,

    // Officials & Roles
    tournament_admin: "",
    referees: "",
    scorers: "",
    timekeepers: "",

    // Legacy fields for compatibility
    max_subs: "5",
  });



  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = tournamentSchema.parse(formData);
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get user profile for organizer details
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('id', user.id)
        .single();

      let logoUrl = null;
      let coverUrl = null;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('tournament-logos')
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('tournament-logos')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      // Upload cover if provided
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `cover-${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('tournament-logos')
          .upload(fileName, coverFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('tournament-logos')
          .getPublicUrl(fileName);

        coverUrl = publicUrl;
      }

      // Create tournament
      const { error } = await supabase.from('tournaments').insert({
        name: validated.name,
        city: validated.city,
        ground: validated.ground,
        organizer_id: user.id,
        organizer_name: profile?.name || 'Unknown',
        organizer_phone: formData.organizer_phone || profile?.phone || '',
        organizer_email: null,
        start_date: validated.start_date,
        end_date: validated.end_date,
        category: validated.category,
        tournament_type: validated.tournament_type,
        logo_url: logoUrl,
        cover_url: coverUrl,
        status: 'Draft',
        match_format: {
          match_duration: parseInt(formData.match_duration),
          halves: parseInt(formData.halves),
          half_duration: parseInt(formData.half_duration),
          break_duration: parseInt(formData.break_duration),
          raid_timer: parseInt(formData.raid_timer),
          timeout_duration: parseInt(formData.timeout_duration),
          all_out_points: parseInt(formData.all_out_points),
        },
        settings: {
          team_config: {
            max_teams: parseInt(formData.max_teams),
            min_teams: parseInt(formData.min_teams),
            players_per_team: parseInt(formData.players_per_team),
            on_court_players: parseInt(formData.on_court_players),
            substitutes: parseInt(formData.substitutes),
            foreign_players_allowed: formData.foreign_players_allowed,
            max_foreign_players: parseInt(formData.max_foreign_players),
          },
          officials: {
            tournament_admin: formData.tournament_admin || null,
            referees: formData.referees ? formData.referees.split(',').map(s => s.trim()).filter(Boolean) : [],
            scorers: formData.scorers ? formData.scorers.split(',').map(s => s.trim()).filter(Boolean) : [],
            timekeepers: formData.timekeepers ? formData.timekeepers.split(',').map(s => s.trim()).filter(Boolean) : [],
          },
        },

        rules_json: {
          points_system: {
            win: parseInt(formData.points_win),
            tie: parseInt(formData.points_tie),
            loss: parseInt(formData.points_loss),
          },
          tie_breaker: formData.tie_breaker,
          timeouts_per_half: parseInt(formData.timeouts_per_half),
          advanced_rules: {
            bonus_line_enabled: formData.bonus_line_enabled,
            super_tackle_enabled: formData.super_tackle_enabled,
            do_or_die_raid: formData.do_or_die_raid,
            golden_raid: formData.golden_raid,
            review_system: formData.review_system,
            video_referee: formData.video_referee,
          }
        },
      });


      if (error) throw error;

      toast({
        title: "Tournament Created!",
        description: "Your tournament has been created successfully",
      });

      navigate('/tournaments');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create tournament",
        description: error.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState("details");

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      {/* TOP HEADER */}
      <div className="bg-gradient-hero p-8 pb-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10 max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 mb-6 transition-all rounded-xl"
            onClick={() => navigate('/tournaments')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Back to Tournaments</span>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <Trophy className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none mb-1">Create Tournament</h1>
              <p className="text-[10px] font-black italic uppercase tracking-widest text-orange-100 opacity-80">Setup your kabaddi competition</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-8 relative z-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full bg-white p-1.5 rounded-[24px] h-14 border-2 border-slate-100 shadow-sm">
            <TabsTrigger
              value="details"
              className="flex-1 rounded-2xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all ring-0 border-0"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="rules"
              className="flex-1 rounded-2xl text-[10px] font-black uppercase tracking-tight data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all ring-0 border-0"
            >
              Rules
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-6">
            <TabsContent value="details" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
              <Card className="border-2 border-slate-100 shadow-sm overflow-hidden bg-white rounded-[32px]">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-orange-600" />
                    <CardTitle className="text-[10px] font-black italic uppercase tracking-widest text-slate-400">
                      Standard Information
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Media Upload */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3 p-4 border-2 border-slate-50 rounded-[24px] bg-slate-50/30">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tournament Logo</Label>
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
                          {logoFile ? (
                            <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Trophy className="h-7 w-7 text-slate-200" />
                          )}
                        </div>
                        <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full rounded-xl border-dashed border-2 hover:border-orange-500 hover:text-orange-600 transition-all text-[10px] font-black uppercase"
                          onClick={() => document.getElementById('logo')?.click()}
                        >
                          {logoFile ? 'Change' : 'Upload'}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 border-2 border-slate-50 rounded-[24px] bg-slate-50/30">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cover Photo</Label>
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {coverFile ? (
                            <img src={URL.createObjectURL(coverFile)} alt="Cover Preview" className="w-full h-full object-cover" />
                          ) : (
                            <CalendarIcon className="h-7 w-7 text-slate-200" />
                          )}
                        </div>
                        <Input id="cover" type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full rounded-xl border-dashed border-2 hover:border-orange-500 hover:text-orange-600 transition-all text-[10px] font-black uppercase"
                          onClick={() => document.getElementById('cover')?.click()}
                        >
                          {coverFile ? 'Change' : 'Upload'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Basic Details */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tournament Name</Label>
                      <Input
                        id="name"
                        placeholder="Maharashtra Grand Kabaddi"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-bold focus:ring-orange-500/20 focus:border-orange-500/20"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">City</Label>
                        <Input
                          id="city"
                          placeholder="Mumbai"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-bold"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ground" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ground</Label>
                        <Input
                          id="ground"
                          placeholder="Shivaji Park"
                          value={formData.ground}
                          onChange={(e) => setFormData({ ...formData, ground: e.target.value })}
                          className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="organizer_phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Organizer Phone</Label>
                      <Input
                        id="organizer_phone"
                        type="tel"
                        placeholder="+91 9876543210"
                        value={formData.organizer_phone}
                        onChange={(e) => setFormData({ ...formData, organizer_phone: e.target.value })}
                        className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-bold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_date" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Start Date</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-bold"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_date" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">End Date</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm font-bold uppercase tracking-tight">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-2 border-slate-100">
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat} className="font-bold uppercase text-[10px] tracking-widest">{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tournament_type" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Type</Label>
                        <Select
                          value={formData.tournament_type}
                          onValueChange={(value) => setFormData({ ...formData, tournament_type: value })}
                        >
                          <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm font-bold uppercase tracking-tight">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-2 border-slate-100">
                            {tournamentTypes.map((type) => (
                              <SelectItem key={type} value={type} className="font-bold uppercase text-[10px] tracking-widest">{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  size="lg"
                  className="bg-orange-600 hover:bg-orange-700 h-14 px-10 rounded-[28px] shadow-xl shadow-orange-600/20 text-xs font-black italic uppercase tracking-widest group"
                  onClick={() => setActiveTab("rules")}
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="rules" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
              <div className="space-y-6 pb-24">
                {/* TEAM CONFIGURATION */}
                <Card className="border-2 border-slate-100 shadow-sm overflow-hidden bg-white rounded-[32px]">
                  <CardHeader className="bg-orange-50/50 border-b border-orange-100 p-6">
                    <CardTitle className="text-[10px] font-black italic uppercase tracking-widest text-orange-600 flex items-center gap-2">
                      <Users2 className="h-4 w-4" />
                      Team Configuration (Critical)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Max Teams</Label>
                        <Input
                          type="number"
                          value={formData.max_teams}
                          onChange={(e) => setFormData({ ...formData, max_teams: e.target.value })}
                          className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Min Teams</Label>
                        <Input
                          type="number"
                          value={formData.min_teams}
                          onChange={(e) => setFormData({ ...formData, min_teams: e.target.value })}
                          className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2 text-center p-4 bg-blue-50/30 rounded-2xl border-2 border-blue-100/50">
                        <Label className="text-[9px] font-black uppercase text-blue-600 tracking-[0.1em] mb-1 block">Squad Size</Label>
                        <Input
                          type="number"
                          value={formData.players_per_team}
                          onChange={(e) => setFormData({ ...formData, players_per_team: e.target.value })}
                          className="bg-transparent border-0 text-center text-xl font-black italic h-auto p-0"
                        />
                      </div>
                      <div className="space-y-2 text-center p-4 bg-green-50/30 rounded-2xl border-2 border-green-100/50">
                        <Label className="text-[9px] font-black uppercase text-green-600 tracking-[0.1em] mb-1 block">On-Court</Label>
                        <Input
                          type="number"
                          value={formData.on_court_players}
                          onChange={(e) => setFormData({ ...formData, on_court_players: e.target.value })}
                          className="bg-transparent border-0 text-center text-xl font-black italic h-auto p-0"
                        />
                      </div>
                      <div className="space-y-2 text-center p-4 bg-purple-50/30 rounded-2xl border-2 border-purple-100/50">
                        <Label className="text-[9px] font-black uppercase text-purple-600 tracking-[0.1em] mb-1 block">Substitutes</Label>
                        <Input
                          type="number"
                          value={formData.substitutes}
                          onChange={(e) => setFormData({ ...formData, substitutes: e.target.value })}
                          className="bg-transparent border-0 text-center text-xl font-black italic h-auto p-0"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border-2 border-slate-100">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black uppercase tracking-tight text-slate-900">Foreign Players Allowed</Label>
                        <p className="text-[10px] font-medium text-slate-400 leading-none">For elite/international events</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {formData.foreign_players_allowed && (
                          <Input
                            type="number"
                            value={formData.max_foreign_players}
                            onChange={(e) => setFormData({ ...formData, max_foreign_players: e.target.value })}
                            className="w-16 h-10 rounded-xl border-2 border-slate-200 text-center text-sm font-bold"
                            placeholder="Max"
                          />
                        )}
                        <Switch
                          checked={formData.foreign_players_allowed}
                          onCheckedChange={(val) => setFormData({ ...formData, foreign_players_allowed: val })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* MATCH RULES */}
                <Card className="border-2 border-slate-100 shadow-sm overflow-hidden bg-white rounded-[32px]">
                  <CardHeader className="bg-red-50/50 border-b border-red-100 p-6">
                    <CardTitle className="text-[10px] font-black italic uppercase tracking-widest text-red-600 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Match Rules Engine
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Duration Settings */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Duration Settings (Minutes)</Label>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-2 text-center p-3 bg-slate-50/30 rounded-2xl border-2 border-slate-100">
                          <Label className="text-[8px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1 block">Match</Label>
                          <Input
                            type="number"
                            value={formData.match_duration}
                            onChange={(e) => setFormData({ ...formData, match_duration: e.target.value })}
                            className="bg-transparent border-0 text-center text-lg font-black italic h-auto p-0"
                          />
                        </div>
                        <div className="space-y-2 text-center p-3 bg-slate-50/30 rounded-2xl border-2 border-slate-100">
                          <Label className="text-[8px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1 block">Halves</Label>
                          <Input
                            type="number"
                            value={formData.halves}
                            onChange={(e) => setFormData({ ...formData, halves: e.target.value })}
                            className="bg-transparent border-0 text-center text-lg font-black italic h-auto p-0"
                          />
                        </div>
                        <div className="space-y-2 text-center p-3 bg-slate-50/30 rounded-2xl border-2 border-slate-100">
                          <Label className="text-[8px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1 block">Half</Label>
                          <Input
                            type="number"
                            value={formData.half_duration}
                            onChange={(e) => setFormData({ ...formData, half_duration: e.target.value })}
                            className="bg-transparent border-0 text-center text-lg font-black italic h-auto p-0"
                          />
                        </div>
                        <div className="space-y-2 text-center p-3 bg-slate-50/30 rounded-2xl border-2 border-slate-100">
                          <Label className="text-[8px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1 block">Break</Label>
                          <Input
                            type="number"
                            value={formData.break_duration}
                            onChange={(e) => setFormData({ ...formData, break_duration: e.target.value })}
                            className="bg-transparent border-0 text-center text-lg font-black italic h-auto p-0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Timer Settings */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Timer Settings (Seconds)</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2 text-center p-3 bg-orange-50/30 rounded-2xl border-2 border-orange-100/50">
                          <Label className="text-[8px] font-black uppercase text-orange-600 tracking-[0.1em] mb-1 block">Raid Timer</Label>
                          <Input
                            type="number"
                            value={formData.raid_timer}
                            onChange={(e) => setFormData({ ...formData, raid_timer: e.target.value })}
                            className="bg-transparent border-0 text-center text-lg font-black italic h-auto p-0"
                          />
                        </div>
                        <div className="space-y-2 text-center p-3 bg-blue-50/30 rounded-2xl border-2 border-blue-100/50">
                          <Label className="text-[8px] font-black uppercase text-blue-600 tracking-[0.1em] mb-1 block">Timeouts/Half</Label>
                          <Input
                            type="number"
                            value={formData.timeouts_per_half}
                            onChange={(e) => setFormData({ ...formData, timeouts_per_half: e.target.value })}
                            className="bg-transparent border-0 text-center text-lg font-black italic h-auto p-0"
                          />
                        </div>
                        <div className="space-y-2 text-center p-3 bg-purple-50/30 rounded-2xl border-2 border-purple-100/50">
                          <Label className="text-[8px] font-black uppercase text-purple-600 tracking-[0.1em] mb-1 block">Timeout (sec)</Label>
                          <Input
                            type="number"
                            value={formData.timeout_duration}
                            onChange={(e) => setFormData({ ...formData, timeout_duration: e.target.value })}
                            className="bg-transparent border-0 text-center text-lg font-black italic h-auto p-0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* All-Out Points */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50/30 border-2 border-red-100/50">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black uppercase tracking-tight text-red-600">All-Out Points</Label>
                        <p className="text-[10px] font-medium text-slate-400 leading-none">Bonus points for all-out</p>
                      </div>
                      <Input
                        type="number"
                        value={formData.all_out_points}
                        onChange={(e) => setFormData({ ...formData, all_out_points: e.target.value })}
                        className="w-16 h-12 rounded-xl border-2 border-red-200 text-center text-xl font-black"
                      />
                    </div>

                    {/* Points System */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Points System</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-orange-50/30 p-3 rounded-2xl border-2 border-orange-100/50">
                          <Label className="text-[9px] font-black uppercase text-orange-600 tracking-widest mb-2 block text-center">Win</Label>
                          <Input
                            type="number"
                            value={formData.points_win}
                            onChange={(e) => setFormData({ ...formData, points_win: e.target.value })}
                            className="bg-transparent border-0 text-center text-lg font-black italic p-0"
                          />
                        </div>
                        <div className="bg-amber-50/30 p-3 rounded-2xl border-2 border-amber-100/50">
                          <Label className="text-[9px] font-black uppercase text-amber-600 tracking-widest mb-2 block text-center">Tie</Label>
                          <Input
                            type="number"
                            value={formData.points_tie}
                            onChange={(e) => setFormData({ ...formData, points_tie: e.target.value })}
                            className="bg-transparent border-0 text-center text-lg font-black italic p-0"
                          />
                        </div>
                        <div className="bg-slate-50/30 p-3 rounded-2xl border-2 border-slate-100">
                          <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block text-center">Loss</Label>
                          <Input
                            type="number"
                            value={formData.points_loss}
                            onChange={(e) => setFormData({ ...formData, points_loss: e.target.value })}
                            className="bg-transparent border-0 text-center text-lg font-black italic p-0"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>


                {/* Advanced Rules */}
                <Card className="border-2 border-slate-100 shadow-sm overflow-hidden bg-white rounded-[32px]">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                    <CardTitle className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Swords className="h-4 w-4 text-orange-600" />
                      Advanced Rules (Toggles)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Row 1: Core Rules */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-green-50/50 border-2 border-green-100">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-black uppercase tracking-tight text-green-700">Bonus Line</Label>
                          <p className="text-[9px] font-medium text-green-500/70 leading-none">Enable bonus points</p>
                        </div>
                        <Switch
                          checked={formData.bonus_line_enabled}
                          onCheckedChange={(val) => setFormData({ ...formData, bonus_line_enabled: val })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 border-2 border-blue-100">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-black uppercase tracking-tight text-blue-700">Super Tackle</Label>
                          <p className="text-[9px] font-medium text-blue-500/70 leading-none">2+ point tackles</p>
                        </div>
                        <Switch
                          checked={formData.super_tackle_enabled}
                          onCheckedChange={(val) => setFormData({ ...formData, super_tackle_enabled: val })}
                        />
                      </div>
                    </div>

                    {/* Row 2: Raid Rules */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-orange-50/50 border-2 border-orange-100">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-black uppercase tracking-tight text-orange-700">Do-or-Die</Label>
                          <p className="text-[9px] font-medium text-orange-500/70 leading-none">3 empty = must score</p>
                        </div>
                        <Switch
                          checked={formData.do_or_die_raid}
                          onCheckedChange={(val) => setFormData({ ...formData, do_or_die_raid: val })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/50 border-2 border-amber-100">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-black uppercase tracking-tight text-amber-700">Golden Raid</Label>
                          <p className="text-[9px] font-medium text-amber-500/70 leading-none">Tie-breaker system</p>
                        </div>
                        <Switch
                          checked={formData.golden_raid}
                          onCheckedChange={(val) => setFormData({ ...formData, golden_raid: val })}
                        />
                      </div>
                    </div>

                    {/* Row 3: Review Rules */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-50/50 border-2 border-purple-100">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-black uppercase tracking-tight text-purple-700">Review System</Label>
                          <p className="text-[9px] font-medium text-purple-500/70 leading-none">Coaching challenges</p>
                        </div>
                        <Switch
                          checked={formData.review_system}
                          onCheckedChange={(val) => setFormData({ ...formData, review_system: val })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border-2 border-slate-200">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-black uppercase tracking-tight text-slate-600">Video Referee</Label>
                          <p className="text-[9px] font-medium text-slate-400 leading-none">VAR for decisions</p>
                        </div>
                        <Switch
                          checked={formData.video_referee}
                          onCheckedChange={(val) => setFormData({ ...formData, video_referee: val })}
                        />
                      </div>
                    </div>

                    {/* Tie-Breaker */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Standing Tie-Breaker</Label>
                      <Select
                        value={formData.tie_breaker}
                        onValueChange={(value) => setFormData({ ...formData, tie_breaker: value })}
                      >
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm font-bold uppercase tracking-tight">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-2 border-slate-100">
                          <SelectItem value="Score Difference" className="font-bold uppercase text-[10px] tracking-widest">Score Difference</SelectItem>
                          <SelectItem value="Head-to-Head" className="font-bold uppercase text-[10px] tracking-widest">Head-to-Head</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* OFFICIALS & ROLES */}
                <Card className="border-2 border-slate-100 shadow-sm overflow-hidden bg-white rounded-[32px]">
                  <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 p-6">
                    <CardTitle className="text-[10px] font-black italic uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                      <Users2 className="h-4 w-4" />
                      Officials & Roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-[10px] font-medium text-slate-400 -mt-2 mb-4">
                      Assign officials to manage this tournament. Enter email addresses or names.
                    </p>

                    {/* Tournament Admin */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tournament Admin</Label>
                      <div className="flex items-center gap-2 p-3 rounded-2xl bg-indigo-50/30 border-2 border-indigo-100/50">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Settings className="w-4 h-4 text-indigo-600" />
                        </div>
                        <Input
                          placeholder="admin@email.com (auto-assigned to you)"
                          value={formData.tournament_admin || ''}
                          onChange={(e) => setFormData({ ...formData, tournament_admin: e.target.value })}
                          className="flex-1 border-0 bg-transparent text-sm font-bold focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    {/* Referees */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Referees (comma-separated)</Label>
                      <div className="flex items-center gap-2 p-3 rounded-2xl bg-green-50/30 border-2 border-green-100/50">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Swords className="w-4 h-4 text-green-600" />
                        </div>
                        <Input
                          placeholder="referee1@email.com, referee2@email.com"
                          value={formData.referees || ''}
                          onChange={(e) => setFormData({ ...formData, referees: e.target.value })}
                          className="flex-1 border-0 bg-transparent text-sm font-bold focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    {/* Scorers */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Scorers (comma-separated)</Label>
                      <div className="flex items-center gap-2 p-3 rounded-2xl bg-orange-50/30 border-2 border-orange-100/50">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-orange-600" />
                        </div>
                        <Input
                          placeholder="scorer1@email.com, scorer2@email.com"
                          value={formData.scorers || ''}
                          onChange={(e) => setFormData({ ...formData, scorers: e.target.value })}
                          className="flex-1 border-0 bg-transparent text-sm font-bold focus-visible:ring-0"
                        />
                      </div>
                    </div>

                    {/* Timekeepers */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Timekeepers (comma-separated)</Label>
                      <div className="flex items-center gap-2 p-3 rounded-2xl bg-purple-50/30 border-2 border-purple-100/50">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <CalendarIcon className="w-4 h-4 text-purple-600" />
                        </div>
                        <Input
                          placeholder="timekeeper1@email.com, timekeeper2@email.com"
                          value={formData.timekeepers || ''}
                          onChange={(e) => setFormData({ ...formData, timekeepers: e.target.value })}
                          className="flex-1 border-0 bg-transparent text-sm font-bold focus-visible:ring-0"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* STICKY BOTTOM BAR FOR MOBILE */}
              <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 z-50 flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest"
                  onClick={() => setActiveTab("details")}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-[2] h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl shadow-xl shadow-orange-600/20 text-xs font-black italic uppercase tracking-widest"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create League"}
                </Button>
              </div>
            </TabsContent>
          </form>
        </Tabs>
      </div>
    </div>
  );
};

export default CreateTournament;
