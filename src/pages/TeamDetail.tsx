import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Trophy, Target, Pencil, Trash2, Swords, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddPlayerDialog } from "@/components/AddPlayerDialog";

import { useBackNavigation } from "@/hooks/useBackNavigation";

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const handleBack = useBackNavigation();
  const { toast } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    matches: 0,
    wins: 0,
    losses: 0,
    points: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editJersey, setEditJersey] = useState("");
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeamDetails();
  }, [id]);

  const fetchTeamDetails = async () => {
    try {
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", id)
        .order("jersey_number", { ascending: true });
      setPlayers(playersData || []);

      // @ts-ignore - tournament_teams may have wins/losses/points columns
      const { data: statsData } = await (supabase
        .from("tournament_teams")
        .select("*")
        .eq("team_id", id) as any);

      if (statsData && statsData.length > 0) {
        const totalStats = statsData.reduce(
          (acc: any, curr: any) => ({
            wins: acc.wins + (curr.wins || 0),
            losses: acc.losses + (curr.losses || 0),
            points: acc.points + (curr.points || 0),
          }),
          { wins: 0, losses: 0, points: 0 }
        );
        setStats({
          matches: totalStats.wins + totalStats.losses,
          wins: totalStats.wins,
          losses: totalStats.losses,
          points: totalStats.points,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading team details",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlayer = (player: any) => {
    setEditingPlayer(player);
    setEditName(player.name);
    setEditJersey(player.jersey_number?.toString() || "");
  };

  const handleSaveEdit = async () => {
    if (!editingPlayer) return;

    setSaving(true);
    try {
      const updateData: any = { name: editName };
      if (editJersey) {
        updateData.jersey_number = parseInt(editJersey);
      }

      const { error } = await supabase
        .from("players")
        .update(updateData)
        .eq("id", editingPlayer.id);

      if (error) throw error;

      toast({
        title: "Player Updated!",
        description: "Player information has been updated successfully",
      });

      setEditingPlayer(null);
      fetchTeamDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update player",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!deletePlayerId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("players")
        .update({ team_id: null, jersey_number: null })
        .eq("id", deletePlayerId);

      if (error) throw error;

      toast({
        title: "Player Removed!",
        description: "Player has been removed from the team",
      });

      setDeletePlayerId(null);
      fetchTeamDetails();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to remove player",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPositionBadge = (position: string) => {
    const positions: Record<string, { label: string; color: string }> = {
      raider: { label: 'R', color: 'bg-red-500' },
      defender: { label: 'D', color: 'bg-blue-500' },
      allrounder: { label: 'A', color: 'bg-purple-500' },
    };
    return positions[position?.toLowerCase()] || { label: position?.charAt(0) || '?', color: 'bg-slate-400' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="animate-spin rounded-xl h-12 w-12 border-4 border-orange-500 border-t-transparent shadow-[0_0_20px_rgba(249,115,22,0.3)]"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center gap-4">
        <Users className="w-16 h-16 text-neutral-800" />
        <p className="text-neutral-500 font-black uppercase tracking-widest italic">Team not found</p>
        <Button onClick={() => handleBack()} variant="outline" className="border-white/10 text-white hover:bg-white/5 rounded-2xl">Back to Teams</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] pb-24 text-white">
      {/* Hero Header */}
      <div className="bg-[#050508] p-6 pb-24 text-white relative overflow-hidden border-b border-white/5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full -mr-32 -mt-32 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-red-600/5 rounded-full -ml-20 mb-10 blur-[100px]"></div>

        <div className="relative z-10 max-w-lg mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => handleBack()}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 p-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {/* Team Logo */}
            <div className="w-20 h-20 rounded-[28px] bg-white/5 backdrop-blur-xl flex items-center justify-center text-2xl font-black shrink-0 border border-white/10 shadow-2xl">
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.name} className="w-full h-full rounded-[28px] object-cover" />
              ) : (
                <span className="text-orange-500 italic">{getInitials(team.name)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black italic uppercase tracking-tight truncate">{team.name}</h1>
              <p className="text-white/70 flex items-center gap-2 mt-1">
                <span className="text-sm">Captain: <span className="font-semibold text-white">{team.captain_name}</span></span>
              </p>
              {team.captain_phone && (
                <p className="text-white/60 text-xs flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" /> {team.captain_phone}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-lg mx-auto px-4 -mt-16 relative z-20">
        <Card className="rounded-[32px] border border-white/10 bg-[#050508]/80 backdrop-blur-2xl shadow-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-4 divide-x divide-white/5">
              {[
                { icon: Target, value: stats.matches, label: 'Matches', color: 'text-orange-500' },
                { icon: Trophy, value: stats.wins, label: 'Wins', color: 'text-green-500' },
                { icon: Swords, value: stats.losses, label: 'Losses', color: 'text-red-500' },
                { icon: Trophy, value: stats.points, label: 'Points', color: 'text-blue-500' },
              ].map((stat, idx) => (
                <div key={idx} className="py-6 text-center hover:bg-white/5 transition-colors cursor-default">
                  <stat.icon className={`w-4 h-4 mx-auto mb-2 ${stat.color} drop-shadow-[0_0_8px_currentColor]`} />
                  <div className="text-xl font-black text-white italic tracking-tighter leading-none">{stat.value}</div>
                  <div className="text-[8px] font-black uppercase text-neutral-500 tracking-[0.2em] mt-2">{stat.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Players Section */}
      <div className="max-w-lg mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-black uppercase tracking-tighter italic text-white">
              SQUAD <span className="text-neutral-500 ml-1">[{players.length}]</span>
            </h2>
          </div>
          <AddPlayerDialog teamId={id!} onPlayerAdded={fetchTeamDetails} />
        </div>

        {players.length === 0 ? (
          <Card className="rounded-[32px] border border-white/10 bg-white/5 overflow-hidden relative">
            <Users className="absolute -right-10 -bottom-10 w-48 h-48 opacity-[0.02] -rotate-12" />
            <CardContent className="py-20 text-center relative z-10">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-neutral-700" />
              </div>
              <p className="text-neutral-500 font-black italic uppercase tracking-widest text-[10px]">Empty Arena</p>
              <p className="text-neutral-600 text-[10px] mt-2 font-medium">Recruit players to start competing</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {players.map((player) => {
              const pos = getPositionBadge(player.position);
              const totalPoints = (player.total_raid_points || 0) + (player.total_tackle_points || 0) + (player.total_bonus_points || 0);

              return (
                <Card key={player.id} className="rounded-[28px] border border-white/5 bg-white/5 hover:bg-white/[0.07] transition-all group overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Position Badge + Avatar - Clickable */}
                      <div
                        className="relative cursor-pointer shrink-0"
                        onClick={() => navigate(`/players/${player.id}`)}
                      >
                        <div className={`w-14 h-14 rounded-2xl ${pos.color} flex items-center justify-center text-white font-black text-xl hover:scale-105 transition-transform border border-white/10 shadow-lg`}>
                          {pos.label}
                        </div>
                        {player.jersey_number && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 text-white text-[10px] font-black rounded-lg flex items-center justify-center border border-[#050508] shadow-xl">
                            {player.jersey_number}
                          </div>
                        )}
                      </div>

                      {/* Player Info - Clickable */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigate(`/players/${player.id}`)}
                      >
                        <h3 className="font-black italic uppercase text-white tracking-tight group-hover:text-orange-500 transition-colors">{player.name}</h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <Badge variant="outline" className="text-[8px] font-black uppercase italic px-2 py-0.5 border-white/10 text-neutral-400 tracking-widest">
                            {player.matches_played || 0} MATCHES
                          </Badge>
                          <span className="text-[10px] font-black italic text-orange-500 tracking-tighter">{totalPoints} PTS</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-9 h-9 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white"
                          onClick={() => handleEditPlayer(player)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-9 h-9 rounded-xl hover:bg-red-500/10 text-red-500"
                          onClick={() => setDeletePlayerId(player.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Player Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent className="rounded-[32px] border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900">Edit Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Player Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-14 rounded-2xl bg-slate-50 border-0 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jersey Number</Label>
              <Input
                type="number"
                min="1"
                max="99"
                value={editJersey}
                onChange={(e) => setEditJersey(e.target.value)}
                className="h-14 rounded-2xl bg-slate-50 border-0 font-bold text-center text-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 mt-4">
            <Button variant="outline" onClick={() => setEditingPlayer(null)} className="rounded-2xl border-2">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="rounded-2xl bg-orange-600 hover:bg-orange-700">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePlayerId} onOpenChange={() => setDeletePlayerId(null)}>
        <AlertDialogContent className="rounded-[32px] border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black uppercase tracking-tight">Remove Player?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the player from this team. They can be added back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-2xl border-2">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlayer} disabled={saving} className="rounded-2xl bg-red-600 hover:bg-red-700">
              {saving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamDetail;
