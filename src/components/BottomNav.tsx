import { Home, Trophy, List, User, Plus, Swords, PenSquare, LayoutGrid, MoreHorizontal } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CreatePost } from "@/components/social/CreatePost";
import { useState } from "react";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: "Home", icon: Home, path: "/" },
    { label: "Feed", icon: LayoutGrid, path: "/feed" },
    { label: "Create", icon: Plus, path: "/create", isSpecial: true },
    { label: "Tourney", icon: Trophy, path: "/tournaments" },
    { label: "Profile", icon: User, path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)] h-[72px]">
      <div className="max-w-screen-lg mx-auto h-full px-2">
        <div className="flex justify-between items-center h-full">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));

            if (item.isSpecial) {
              return (
                <div key={item.path} className="flex-1 flex justify-center relative -mt-8">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-600/30 hover:scale-110 active:scale-90 transition-all border-4 border-white">
                        <Plus className="w-7 h-7 stroke-[3px]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48 rounded-[24px] p-2 mb-2 bg-slate-900 border-0 shadow-2xl">
                      <DropdownMenuItem onClick={() => navigate('/matches/create')} className="rounded-xl focus:bg-white/10 text-white gap-3 p-3 cursor-pointer">
                        <Swords className="w-4 h-4 text-orange-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">New Match</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/teams')} className="rounded-xl focus:bg-white/10 text-white gap-3 p-3 cursor-pointer">
                        <Plus className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Create Team</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 relative group",
                  isActive ? "text-orange-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <div className={cn(
                  "p-2 rounded-2xl transition-all duration-300",
                  isActive ? "bg-orange-50" : "group-hover:bg-slate-50"
                )}>
                  <item.icon className={cn("h-5 w-5", isActive && "stroke-[3px]")} />
                </div>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-[0.15em] mt-1 transition-all",
                  isActive ? "text-orange-600 opacity-100" : "text-slate-400 opacity-60"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 w-8 h-1 bg-orange-600 rounded-b-full shadow-[0_2px_10px_rgba(234,88,12,0.3)] animate-in fade-in slide-in-from-top-1" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
