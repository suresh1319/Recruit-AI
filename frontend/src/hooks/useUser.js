import { useMemo } from 'react';
import { useUser as useClerkUser, useClerk as useClerkOriginal } from "@clerk/clerk-react";

export function useUser() {
    const mockClerkId = localStorage.getItem('mock_clerk_id');
    const mockEmail = localStorage.getItem('mock_clerk_email');
    const mockFirstName = localStorage.getItem('mock_clerk_first_name') || 'Mock';
    const mockLastName = localStorage.getItem('mock_clerk_last_name') || 'User';
    const mockRole = localStorage.getItem('mock_clerk_role');

    const clerkResult = useClerkUser();

    const mockResult = useMemo(() => {
        if (!mockClerkId) return null;
        return {
            isLoaded: true,
            isSignedIn: true,
            user: {
                id: mockClerkId,
                primaryEmailAddress: { emailAddress: mockEmail },
                firstName: mockFirstName,
                lastName: mockLastName,
                imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                fullName: `${mockFirstName} ${mockLastName}`.trim(),
                publicMetadata: {
                    role: mockRole
                }
            }
        };
    }, [mockClerkId, mockEmail, mockFirstName, mockLastName, mockRole]);

    if (mockClerkId) {
        return mockResult;
    }

    return clerkResult;
}

export function useClerk() {
    const mockClerkId = localStorage.getItem('mock_clerk_id');
    const clerk = useClerkOriginal();

    return useMemo(() => {
        if (mockClerkId) {
            return {
                ...clerk,
                signOut: (callback) => {
                    localStorage.removeItem('mock_clerk_id');
                    localStorage.removeItem('mock_clerk_email');
                    localStorage.removeItem('mock_clerk_first_name');
                    localStorage.removeItem('mock_clerk_last_name');
                    localStorage.removeItem('mock_clerk_role');
                    localStorage.removeItem('preferred_role');
                    if (typeof callback === 'function') {
                        callback();
                    } else if (typeof callback === 'object' && callback?.redirectUrl) {
                        window.location.href = callback.redirectUrl;
                    } else {
                        window.location.href = '/sign-in';
                    }
                }
            };
        }

        return {
            ...clerk,
            signOut: async (callback) => {
                localStorage.removeItem('preferred_role');
                try {
                    if (clerk && clerk.signOut) {
                        await clerk.signOut();
                    }
                } catch (e) {
                    console.error("Clerk signOut error:", e);
                }
                if (typeof callback === 'function') {
                    callback();
                } else if (typeof callback === 'object' && callback?.redirectUrl) {
                    window.location.href = callback.redirectUrl;
                } else {
                    window.location.href = '/sign-in';
                }
            }
        };
    }, [mockClerkId, clerk]);
}
