import { useEffect, useRef } from "react";
import { useUser } from "@/hooks/useUser";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from '@/lib/api';

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

                    const primaryEmail = user.primaryEmailAddress?.emailAddress ||
                        user.emailAddresses?.[0]?.emailAddress ||
                        (typeof user.email === 'string' ? user.email : '');

                    const payload = {
                        id: user.id,
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        imageUrl: user.imageUrl || '',
                        email: primaryEmail,
                        emailAddresses: primaryEmail ? [{ emailAddress: primaryEmail }] : [],
                        publicMetadata: user.publicMetadata || {},
                        role: preferredRole || user.publicMetadata?.role
                    };

                    const response = await fetch(`${API_BASE_URL}/api/users/sync`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });

                    const data = await response.json();
                    if (preferredRole) localStorage.removeItem('preferred_role');

                    const currentRole = data.user?.role || preferredRole;
                    const path = location.pathname;

                    // Redirection Rules
                    if (currentRole === 'admin') {
                        if (path === '/' || path === '/dashboard' || path === '/candidate-dashboard' || path === '/verify-company') {
                            navigate('/admin/verify');
                        }
                    } else if (currentRole === 'candidate') {
                        // Candidates should not be on recruiter-only pages
                        const recruiterPages = ['/dashboard', '/candidates', '/jobs', '/verify-company', '/admin/verify'];
                        if (recruiterPages.some(p => path.startsWith(p)) || path === '/') {
                            navigate('/candidate-dashboard');
                        }
                    } else if (currentRole === 'recruiter') {
                        // Check company verification status
                        try {
                            const verifyResponse = await fetch(`${API_BASE_URL}/api/companies/status?clerkId=${user.id}`);
                            const verifyData = await verifyResponse.json();
                            
                            if (verifyData.status !== 'Verified') {
                                if (path !== '/verify-company') {
                                    navigate('/verify-company');
                                }
                            } else {
                                if (path === '/verify-company' || path === '/') {
                                    navigate('/dashboard');
                                }
                            }
                        } catch (verErr) {
                            console.error("Error checking company status:", verErr);
                            if (path !== '/verify-company') {
                                navigate('/verify-company');
                            }
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

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            localStorage.removeItem('mock_clerk_id');
            localStorage.removeItem('mock_clerk_email');
            localStorage.removeItem('mock_clerk_first_name');
            localStorage.removeItem('mock_clerk_last_name');
            localStorage.removeItem('mock_clerk_role');
        }
    }, [isLoaded, isSignedIn]);

    return null;
}
