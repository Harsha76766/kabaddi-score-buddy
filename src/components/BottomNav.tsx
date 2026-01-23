import { Home, Trophy, List, User, Plus, Swords, PenSquare, ShoppingBag, MoreHorizontal } from "lucide-react";
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
    { label: "Home", icon: Home, path: "/home" },
    { label: "Shop", icon: ShoppingBag, path: "/shop" },
    { label: "Create", icon: Plus, path: "/create", isSpecial: true },
    { label: "Tourney", icon: Trophy, path: "/tournaments" },
    { label: "Profile", icon: User, path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-6 left-4 right-4 md:left-auto md:right-auto md:w-[450px] md:translate-x-[-15%] bg-white/80 backdrop-blur-xl border border-white/20 z-50 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] h-[72px] mx-auto overflow-hidden">
      <div className="h-full px-4">
        <div className="flex justify-between items-center h-full gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            if (item.isSpecial) {
              return (
                <div key={item.path} className="flex-1 flex justify-center relative -mt-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-600/30 hover:scale-110 active:scale-90 transition-all border-4 border-white/10 ring-4 ring-white">
                        <Plus className="w-7 h-7 stroke-[3px]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48 rounded-[24px] p-2 mb-4 bg-slate-900 border border-white/10 shadow-2xl backdrop-blur-xl">
                      <DropdownMenuItem onClick={() => navigate('/matches/create')} className="rounded-xl focus:bg-white/10 text-white gap-3 p-3 cursor-pointer">
                        <Swords className="w-4 h-4 text-orange-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">New Match</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/teams')} className="rounded-xl focus:bg-white/10 text-white gap-3 p-3 cursor-pointer">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Create Team</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/scan-qr')} className="rounded-xl focus:bg-white/10 text-white gap-3 p-3 cursor-pointer">
                        <Plus className="w-4 h-4 text-green-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">QR Scanner</span>
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
