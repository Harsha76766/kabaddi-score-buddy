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
import { ArrowLeft, Upload, Trophy, Settings, Info, Calendar as CalendarIcon, Phone, MapPin, ChevronRight, Swords } from "lucide-react";
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
    name: "",
    city: "",
    ground: "",
    organizer_phone: "",
    start_date: "",
    end_date: "",
    category: "Open",
    tournament_type: "League",
    half_duration: "20",
    players_per_team: "7",
    points_win: "2",
    points_tie: "1",
    points_loss: "0",
    tie_breaker: "Score Difference",
    golden_raid: true,
    max_subs: "5",
    timeouts_per_half: "2",
    review_system: false,
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
          half_duration: parseInt(formData.half_duration),
          players_per_team: parseInt(formData.players_per_team),
        },
        rules_json: {
          points_system: {
            win: parseInt(formData.points_win),
            tie: parseInt(formData.points_tie),
            loss: parseInt(formData.points_loss),
          },
          tie_breaker: formData.tie_breaker,
          advanced_rules: {
            golden_raid: formData.golden_raid,
            max_subs: parseInt(formData.max_subs),
            timeouts_per_half: parseInt(formData.timeouts_per_half),
            review_system: formData.review_system,
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
                {/* Match Format */}
                <Card className="border-2 border-slate-100 shadow-sm overflow-hidden bg-white rounded-[32px]">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                    <CardTitle className="text-[10px] font-black italic uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Settings className="h-4 w-4 text-orange-600" />
                      Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="half_duration" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Half Duration (Mins)</Label>
                        <Input
                          id="half_duration"
                          type="number"
                          value={formData.half_duration}
                          onChange={(e) => setFormData({ ...formData, half_duration: e.target.value })}
                          className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="players_per_team" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Players / Team</Label>
                        <Input
                          id="players_per_team"
                          type="number"
                          value={formData.players_per_team}
                          onChange={(e) => setFormData({ ...formData, players_per_team: e.target.value })}
                          className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm font-bold"
                        />
                      </div>
                    </div>

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
                      Advanced Rules
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border-2 border-slate-100">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black uppercase tracking-tight text-slate-900">Golden Raid</Label>
                        <p className="text-[10px] font-medium text-slate-400 leading-none">Tie-breaker raid system</p>
                      </div>
                      <Switch
                        checked={formData.golden_raid}
                        onCheckedChange={(val) => setFormData({ ...formData, golden_raid: val })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border-2 border-slate-100">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black uppercase tracking-tight text-slate-900">Review System (VAR)</Label>
                        <p className="text-[10px] font-medium text-slate-400 leading-none">Official coaching challenges</p>
                      </div>
                      <Switch
                        checked={formData.review_system}
                        onCheckedChange={(val) => setFormData({ ...formData, review_system: val })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 text-center p-4 bg-slate-50/30 rounded-2xl border-2 border-slate-100">
                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1 block">Max Subs</Label>
                        <Input
                          type="number"
                          value={formData.max_subs}
                          onChange={(e) => setFormData({ ...formData, max_subs: e.target.value })}
                          className="bg-transparent border-0 text-center text-xl font-black italic h-auto p-0"
                        />
                      </div>
                      <div className="space-y-2 text-center p-4 bg-slate-50/30 rounded-2xl border-2 border-slate-100">
                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em] mb-1 block">Timeouts (Half)</Label>
                        <Input
                          type="number"
                          value={formData.timeouts_per_half}
                          onChange={(e) => setFormData({ ...formData, timeouts_per_half: e.target.value })}
                          className="bg-transparent border-0 text-center text-xl font-black italic h-auto p-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
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
