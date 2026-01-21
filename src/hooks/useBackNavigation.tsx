import { useNavigate, useLocation } from "react-router-dom";
import { useCallback } from "react";

/**
 * A hook to handle back navigation intelligently.
 * 
 * Logic:
 * 1. If there is a history stack (key !== default), it goes back (-1).
 * 2. If no history (direct link opener), it redirects to the fallback path.
 * 3. Default fallback is '/home' to avoid sending users to the Landing Page (/) which might redirect them again.
 */
export const useBackNavigation = (defaultFallback: string = "/home") => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleBack = useCallback((fallback?: string) => {
        // Check if there is a previous entry in the history stack
        // location.key is 'default' for the first page in a session (e.g. new tab or direct load)
        if (location.key !== "default") {
            navigate(-1);
        } else {
            navigate(fallback || defaultFallback);
        }
    }, [navigate, location, defaultFallback]);

    return handleBack;
};
