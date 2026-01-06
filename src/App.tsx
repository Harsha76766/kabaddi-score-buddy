import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import AppUrlListener from "./components/AppUrlListener";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Tournament from "./pages/Tournament";
import CreateTournament from "./pages/CreateTournament";
import TournamentDetail from "./pages/TournamentDetail";
import TeamDetail from "./pages/TeamDetail";
import Teams from "./pages/Teams";
import Players from "./pages/Players";
import Matches from "./pages/Matches";
import CreateMatch from "./pages/CreateMatch";
import Profile from "./pages/Profile";
import LiveScoring from "./pages/LiveScoring";
import LiveMatch from "./pages/LiveMatch";
import MatchSummary from "./pages/MatchSummary";
import Leaderboard from "./pages/Leaderboard";
import FeedPage from "./pages/Feed";
import NotFound from "./pages/NotFound";
// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageTournaments from "./pages/admin/ManageTournaments";
import ManageMatches from "./pages/admin/ManageMatches";
import ManageTeams from "./pages/admin/ManageTeams";
import LiveMonitor from "./pages/admin/LiveMonitor";
import ContentModeration from "./pages/admin/ContentModeration";
import RankEngine from "./pages/admin/RankEngine";
import Analytics from "./pages/admin/Analytics";
import AdminSettings from "./pages/admin/Settings";
import ManagePlayers from "./pages/admin/ManagePlayers";
import Achievements from "./pages/admin/Achievements";
import MatchEventLog from "./pages/admin/MatchEventLog";
import Sponsorship from "./pages/admin/Sponsorship";
import Reports from "./pages/admin/Reports";
import NotificationCenter from "./pages/admin/NotificationCenter";
import SupportTickets from "./pages/admin/SupportTickets";
import AuditLogs from "./pages/admin/AuditLogs";
import RBAC from "./pages/admin/RBAC";
import DeveloperTools from "./pages/admin/DeveloperTools";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AppUrlListener />
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/tournaments" element={<ProtectedRoute><Tournament /></ProtectedRoute>} />
          <Route path="/tournaments/create" element={<ProtectedRoute><CreateTournament /></ProtectedRoute>} />
          <Route path="/tournaments/:id" element={<ProtectedRoute><TournamentDetail /></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
          <Route path="/teams/:id" element={<ProtectedRoute><TeamDetail /></ProtectedRoute>} />
          <Route path="/players" element={<ProtectedRoute><Players /></ProtectedRoute>} />
          <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
          <Route path="/matches/create" element={<ProtectedRoute><CreateMatch /></ProtectedRoute>} />
          <Route path="/matches/:id/score" element={<ProtectedRoute><LiveScoring /></ProtectedRoute>} />
          <Route path="/matches/:id/spectate" element={<ProtectedRoute><LiveMatch /></ProtectedRoute>} />
          <Route path="/match-summary/:id" element={<ProtectedRoute><MatchSummary /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><ManageUsers /></AdminRoute>} />
          <Route path="/admin/tournaments" element={<AdminRoute><ManageTournaments /></AdminRoute>} />
          <Route path="/admin/matches" element={<AdminRoute><ManageMatches /></AdminRoute>} />
          <Route path="/admin/teams" element={<AdminRoute><ManageTeams /></AdminRoute>} />
          <Route path="/admin/players" element={<AdminRoute><ManagePlayers /></AdminRoute>} />
          <Route path="/admin/live" element={<AdminRoute><LiveMonitor /></AdminRoute>} />
          <Route path="/admin/content" element={<AdminRoute><ContentModeration /></AdminRoute>} />
          <Route path="/admin/ranks" element={<AdminRoute><RankEngine /></AdminRoute>} />
          <Route path="/admin/achievements" element={<AdminRoute><Achievements /></AdminRoute>} />
          <Route path="/admin/event-log" element={<AdminRoute><MatchEventLog /></AdminRoute>} />
          <Route path="/admin/analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
          <Route path="/admin/sponsorship" element={<AdminRoute><Sponsorship /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><Reports /></AdminRoute>} />
          <Route path="/admin/notifications" element={<AdminRoute><NotificationCenter /></AdminRoute>} />
          <Route path="/admin/support" element={<AdminRoute><SupportTickets /></AdminRoute>} />
          <Route path="/admin/audit-logs" element={<AdminRoute><AuditLogs /></AdminRoute>} />
          <Route path="/admin/rbac" element={<AdminRoute><RBAC /></AdminRoute>} />
          <Route path="/admin/developer" element={<AdminRoute><DeveloperTools /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

