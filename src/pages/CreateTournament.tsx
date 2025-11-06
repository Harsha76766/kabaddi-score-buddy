import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload } from "lucide-react";
import { z } from "zod";

const tournamentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  city: z.string().min(2, "City is required"),
  ground: z.string().min(2, "Ground name is required"),
  start_date: z.string(),
  end_date: z.string(),
  category: z.string(),
  tournament_type: z.string(),
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

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="bg-gradient-hero p-6 text-white">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 mb-4"
          onClick={() => navigate('/tournaments')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create Tournament</h1>
      </div>

      <div className="p-4 -mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Tournament Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logo">Tournament Logo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => document.getElementById('logo')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {logoFile ? 'Logo ✓' : 'Upload Logo'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cover">Cover Photo</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cover"
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => document.getElementById('cover')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {coverFile ? 'Cover ✓' : 'Upload Cover'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Tournament Name</Label>
                <Input
                  id="name"
                  placeholder="Summer Kabaddi League"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Mumbai"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ground">Ground</Label>
                  <Input
                    id="ground"
                    placeholder="Central Stadium"
                    value={formData.ground}
                    onChange={(e) => setFormData({ ...formData, ground: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizer_phone">Organizer Phone Number</Label>
                <Input
                  id="organizer_phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.organizer_phone}
                  onChange={(e) => setFormData({ ...formData, organizer_phone: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tournament_type">Tournament Type</Label>
                  <Select
                    value={formData.tournament_type}
                    onValueChange={(value) => setFormData({ ...formData, tournament_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tournamentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Match Format</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="half_duration" className="text-sm text-muted-foreground">
                      Half Duration (mins)
                    </Label>
                    <Input
                      id="half_duration"
                      type="number"
                      min="10"
                      max="30"
                      value={formData.half_duration}
                      onChange={(e) => setFormData({ ...formData, half_duration: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="players_per_team" className="text-sm text-muted-foreground">
                      Players per Team
                    </Label>
                    <Input
                      id="players_per_team"
                      type="number"
                      min="5"
                      max="12"
                      value={formData.players_per_team}
                      onChange={(e) => setFormData({ ...formData, players_per_team: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Points System</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="points_win" className="text-sm text-muted-foreground">Win</Label>
                    <Input
                      id="points_win"
                      type="number"
                      min="0"
                      value={formData.points_win}
                      onChange={(e) => setFormData({ ...formData, points_win: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="points_tie" className="text-sm text-muted-foreground">Tie</Label>
                    <Input
                      id="points_tie"
                      type="number"
                      min="0"
                      value={formData.points_tie}
                      onChange={(e) => setFormData({ ...formData, points_tie: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="points_loss" className="text-sm text-muted-foreground">Loss</Label>
                    <Input
                      id="points_loss"
                      type="number"
                      min="0"
                      value={formData.points_loss}
                      onChange={(e) => setFormData({ ...formData, points_loss: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tie_breaker">Tie-Breaking Criteria</Label>
                <Select
                  value={formData.tie_breaker}
                  onValueChange={(value) => setFormData({ ...formData, tie_breaker: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Score Difference">Score Difference</SelectItem>
                    <SelectItem value="Head-to-Head">Head-to-Head</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Tournament"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateTournament;
