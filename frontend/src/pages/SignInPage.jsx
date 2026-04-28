import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
    const preferredRole = localStorage.getItem('preferred_role');
    const redirectUrl = preferredRole === 'candidate' ? '/candidate-dashboard' : '/dashboard';

    return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                forceRedirectUrl={redirectUrl}
            />
        </div>
    );
}
