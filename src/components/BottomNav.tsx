import { Home, Trophy, User, Users, Plus, Swords, ShoppingBag, QrCode } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 z-50 rounded-2xl shadow-2xl shadow-black/50 h-16">
      <div className="h-full px-2">
        <div className="flex justify-around items-center h-full">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;

            if (item.isSpecial) {
              return (
                <div key={item.path} className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-600/40 hover:scale-105 active:scale-95 transition-all">
                        <Plus className="w-6 h-6 stroke-[2.5px]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48 rounded-xl p-1.5 mb-3 bg-[#0a0a0f] border border-white/10 shadow-2xl">
                      <DropdownMenuItem onClick={() => navigate('/matches/create')} className="rounded-lg focus:bg-white/10 text-white gap-3 p-3 cursor-pointer">
                        <Swords className="w-4 h-4 text-orange-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">New Match</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/teams')} className="rounded-lg focus:bg-white/10 text-white gap-3 p-3 cursor-pointer">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Create Team</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/scan-qr')} className="rounded-lg focus:bg-white/10 text-white gap-3 p-3 cursor-pointer">
                        <QrCode className="w-4 h-4 text-green-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">QR Scanner</span>
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
                  "flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all",
                  isActive
                    ? "text-orange-500"
                    : "text-neutral-500 hover:text-neutral-300"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider mt-1",
                  isActive ? "text-orange-500" : "text-neutral-600"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;

