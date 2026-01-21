import { ShoppingBag, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const Shop = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-6 pb-32">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-[32px] flex items-center justify-center shadow-2xl shadow-orange-600/20 mb-8 animate-bounce">
                <ShoppingBag className="w-12 h-12 text-white" />
            </div>

            <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-4 text-center">
                The Pro Shop <br />
                <span className="text-orange-500">Coming Soon</span>
            </h1>

            <p className="text-neutral-400 text-center max-w-xs mb-8 font-medium">
                We're building an exclusive marketplace for tournament gear, team jerseys, and pro equipment. Stay tuned!
            </p>

            <Button
                onClick={() => navigate('/home')}
                className="rounded-2xl bg-white text-black hover:bg-neutral-200 h-12 px-8 font-black uppercase tracking-widest text-[10px]"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Hub
            </Button>

            <BottomNav />
        </div>
    );
};

export default Shop;
