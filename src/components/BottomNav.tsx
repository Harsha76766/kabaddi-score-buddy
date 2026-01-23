import { Home, Trophy, User, Users, Plus, X, Swords, ShoppingBag, QrCode } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Home", icon: Home, path: "/home" },
    { label: "Shop", icon: ShoppingBag, path: "/shop" },
    { label: "Create", icon: Plus, path: "/create", isSpecial: true },
    { label: "Tourney", icon: Trophy, path: "/tournaments" },
    { label: "Profile", icon: User, path: "/profile" },
  ];

  const fabActions = [
    { label: "Match", icon: Swords, path: "/matches/create", color: "bg-orange-500", angle: -45 },
    { label: "Team", icon: Users, path: "/teams", color: "bg-blue-500", angle: 0 },
    { label: "Scan", icon: QrCode, path: "/scan-qr", color: "bg-green-500", angle: 45 },
  ];

  const handleFabAction = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Radial FAB Menu */}
      {isOpen && (
        <div className="fixed bottom-24 left-1/2 z-50 pointer-events-none">
          {fabActions.map((action, index) => {
            // Calculate position in an arc above the + button
            const radius = 80;
            // Spread buttons evenly: -50deg, 0deg (top), +50deg
            const angles = [-50, 0, 50];
            const angle = angles[index];
            // Convert to radians and calculate position (negative Y is up)
            const radian = ((angle - 90) * Math.PI) / 180;
            const x = Math.cos(radian) * radius;
            const y = Math.sin(radian) * radius;

            return (
              <button
                key={action.path}
                onClick={() => handleFabAction(action.path)}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto",
                  "w-14 h-14 rounded-full flex flex-col items-center justify-center",
                  "text-white shadow-xl transition-all duration-200",
                  "hover:scale-110 active:scale-95 animate-in zoom-in-50 fade-in duration-200",
                  action.color
                )}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-[7px] font-bold uppercase tracking-wider mt-0.5">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Navigation */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 z-50 rounded-2xl shadow-2xl shadow-black/50 h-16">
        <div className="h-full px-2">
          <div className="flex justify-around items-center h-full">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;

              if (item.isSpecial) {
                return (
                  <div key={item.path} className="flex justify-center">
                    <button
                      onClick={() => setIsOpen(!isOpen)}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300",
                        isOpen
                          ? "bg-white/20 rotate-45"
                          : "bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-600/40 hover:scale-105 active:scale-95"
                      )}
                    >
                      <Plus className="w-6 h-6 stroke-[2.5px]" />
                    </button>
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
    </>
  );
};

export default BottomNav;
