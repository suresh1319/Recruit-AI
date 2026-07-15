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

    const mockClerkObj = useMemo(() => {
        if (!mockClerkId) return null;
        return {
            ...clerk,
            signOut: (callback) => {
                localStorage.removeItem('mock_clerk_id');
                localStorage.removeItem('mock_clerk_email');
                localStorage.removeItem('mock_clerk_first_name');
                localStorage.removeItem('mock_clerk_last_name');
                localStorage.removeItem('mock_clerk_role');
                if (callback) callback();
            }
        };
    }, [mockClerkId, clerk]);

    if (mockClerkId) {
        return mockClerkObj;
    }

    return clerk;
}
