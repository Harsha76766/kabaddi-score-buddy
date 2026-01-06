import { toast } from "@/hooks/use-toast";

interface ShareOptions {
    title: string;
    text: string;
    url?: string;
}

const PRODUCTION_URL = "https://www.only20.shop";

/**
 * Utility to handle sharing across the app.
 * Uses navigator.share if available, falls back to copying to clipboard.
 */
export const handleShare = async (options: ShareOptions) => {
    // Determine the correct base URL
    // In Capacitor, origin is localhost. We want to share the public website URL.
    let origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('capacitor://')) {
        origin = PRODUCTION_URL;
    }

    // Use current origin if URL is not provided or is relative
    const shareUrl = options.url
        ? (options.url.startsWith('http') ? options.url : `${origin}/#${options.url}`)
        : window.location.href.replace(window.location.origin, origin);

    if (navigator.share) {
        try {
            await navigator.share({
                title: options.title,
                text: options.text,
                url: shareUrl,
            });
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                console.error('Error sharing:', error);
                copyToClipboard(shareUrl);
            }
        }
    } else {
        copyToClipboard(shareUrl);
    }
};

/**
 * Fallback to copy to clipboard
 */
export const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        toast({
            title: "Link Copied",
            description: "Link has been copied to your clipboard.",
        });
    } catch (err) {
        console.error('Failed to copy: ', err);
        toast({
            variant: "destructive",
            title: "Copy Failed",
            description: "Please try copying the URL manually from the browser address bar.",
        });
    }
};
