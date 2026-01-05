import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreatePostProps {
    onPostCreated: () => void;
}

export const CreatePost = ({ onPostCreated }: CreatePostProps) => {
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // @ts-ignore - posts table exists but not in generated types
            const { error } = await supabase.from('posts').insert({
                user_id: user.id,
                content: content.trim(),
            });

            if (error) throw error;

            setContent("");
            setIsExpanded(false);
            onPostCreated();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-black border-b border-zinc-800 px-4 py-3">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shrink-0">
                    <Avatar className="w-full h-full border-2 border-black">
                        <AvatarFallback className="bg-zinc-900 text-white text-sm">U</AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex-1">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onFocus={() => setIsExpanded(true)}
                        placeholder="What's on your mind?"
                        className="w-full bg-transparent text-white placeholder-zinc-500 text-sm resize-none outline-none min-h-[40px] py-2"
                        rows={isExpanded ? 3 : 1}
                    />
                    {isExpanded && (
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                            <button className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm">
                                <Image className="w-5 h-5" />
                                Photo
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setIsExpanded(false); setContent(""); }}
                                    className="text-zinc-500 hover:text-white text-sm px-3 py-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!content.trim() || isSubmitting}
                                    className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:hover:bg-blue-500 text-white font-semibold text-sm px-4 py-1.5 rounded-full"
                                >
                                    {isSubmitting ? "Posting..." : "Share"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
