import { Feed } from "@/components/social/Feed";
import BottomNav from "@/components/BottomNav";
import { LayoutGrid, TrendingUp, Search } from "lucide-react";

const FeedPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-sans selection:bg-orange-100">
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-orange-600" />
                    <span className="text-xl font-black uppercase tracking-tighter text-slate-900 italic">Arena Feed</span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <Search className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                        <TrendingUp className="w-3 h-3 text-orange-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Trending</span>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto">
                <div className="py-6 space-y-6">
                    <div className="px-6 space-y-1">
                        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">Latest Activity</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">What's happening in your circuit</p>
                    </div>
                    <Feed />
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default FeedPage;
