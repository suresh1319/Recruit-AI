import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
    const preferredRole = localStorage.getItem('preferred_role');
    const redirectUrl = preferredRole === 'candidate' ? '/candidate-dashboard' : '/dashboard';

    return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                forceRedirectUrl={redirectUrl}
            />
        </div>
    );
}
