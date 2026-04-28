import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function SyncUser() {
    const { isLoaded, isSignedIn, user } = useUser();
    const hasSynced = useRef(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isLoaded && isSignedIn && user) {
            // Role-based redirection logic
            const syncAndRedirect = async () => {
                try {
                    const preferredRole = localStorage.getItem('preferred_role');

                    const response = await fetch("http://localhost:5001/api/users/sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ...user,
                            role: preferredRole
                        }),
                    });

                    const data = await response.json();
                    if (preferredRole) localStorage.removeItem('preferred_role');

                    const currentRole = data.user?.role;
                    const path = location.pathname;

                    // Redirection Rules
                    if (currentRole === 'candidate') {
                        // Candidates should not be on recruiter-only pages
                        const recruiterPages = ['/dashboard', '/candidates', '/jobs'];
                        if (recruiterPages.some(p => path.startsWith(p)) || path === '/') {
                            navigate('/candidate-dashboard');
                        }
                    } else if (currentRole === 'recruiter') {
                        // Recruiters should not be on candidate-only pages
                        const candidatePages = ['/candidate-dashboard'];
                        if (candidatePages.some(p => path.startsWith(p)) || path === '/') {
                            navigate('/dashboard');
                        }
                    }
                } catch (err) {
                    console.error("Sync error:", err);
                }
            };

            if (!hasSynced.current) {
                hasSynced.current = true;
                syncAndRedirect();
            } else {
                // If already synced, just handle redirection based on existing knowledge or re-check if on a "shared" landing
                const isSharedLanding = ['/', '/sign-in', '/sign-up', '/dashboard', '/candidate-dashboard'].includes(location.pathname);
                if (isSharedLanding) {
                    syncAndRedirect(); // Re-verify on landing pages to be safe
                }
            }
        }
    }, [isLoaded, isSignedIn, user, navigate, location.pathname]);

    return null;
}
