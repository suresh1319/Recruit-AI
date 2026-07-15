import React, { useState } from 'react';
import { SignIn } from "@clerk/clerk-react";
import { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, Database, ShieldAlert, Sparkles, Building2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SignInPage() {
    const preferredRole = localStorage.getItem('preferred_role');
    const redirectUrl = preferredRole === 'candidate' ? '/candidate-dashboard' : '/dashboard';
    const navigate = useNavigate();

    const [seeding, setSeeding] = useState(false);
    const [mocking, setMocking] = useState(false);

    const handleSeedData = async () => {
        setSeeding(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/companies/seed-mock-data`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to seed mock data.');
            const data = await res.json();
            toast.success(data.message || 'Seeded mock companies successfully!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to seed sandbox database.');
        } finally {
            setSeeding(false);
        }
    };

    const handleMockLogin = (mockUser) => {
        setMocking(true);
        localStorage.setItem('mock_clerk_id', mockUser.id);
        localStorage.setItem('mock_clerk_email', mockUser.email);
        localStorage.setItem('mock_clerk_role', mockUser.role);
        localStorage.setItem('mock_clerk_first_name', mockUser.firstName);
        localStorage.setItem('mock_clerk_last_name', mockUser.lastName);

        toast.success(`Signed in as ${mockUser.firstName} (${mockUser.role})!`);

        setTimeout(() => {
            if (mockUser.role === 'admin') {
                navigate('/admin/verify');
            } else if (mockUser.role === 'candidate') {
                navigate('/candidate-dashboard');
            } else {
                navigate('/dashboard');
            }
        }, 800);
    };

    const mockAccounts = [
        {
            id: 'mock_verified_recruiter_id',
            email: 'recruiter.verified@acme.com',
            role: 'recruiter',
            firstName: 'Alice',
            lastName: 'Verified',
            label: 'Verified Recruiter (Acme Corp)',
            desc: 'Access to full Recruiter Dashboard & post jobs.'
        },
        {
            id: 'mock_pending_recruiter_id',
            email: 'recruiter.pending@gmail.com',
            role: 'recruiter',
            firstName: 'Bob',
            lastName: 'Pending',
            label: 'Pending Recruiter (Pending Ventures)',
            desc: 'Redirects to Verification Dashboard.'
        },
        {
            id: 'mock_admin_id',
            email: 'admin@recruitai.com',
            role: 'admin',
            firstName: 'Charlie',
            lastName: 'Admin',
            label: 'Platform Admin',
            desc: 'Review and approve company registrations.'
        },
        {
            id: 'mock_candidate_id',
            email: 'candidate@acme.com',
            role: 'candidate',
            firstName: 'John',
            lastName: 'Candidate',
            label: 'Mock Candidate',
            desc: 'Browse jobs & take AI interviews.'
        }
    ];

    return (
        <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen bg-black text-slate-100 p-6 gap-8">
            <div className="flex-1 max-w-md">
                <SignIn
                    routing="path"
                    path="/sign-in"
                    signUpUrl="/sign-up"
                    forceRedirectUrl={redirectUrl}
                />
            </div>

            {/* Sandbox mock console */}
            <Card className="max-w-md w-full p-6 border-slate-800 bg-slate-950/80 backdrop-blur text-slate-200 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Database size={120} />
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                    <h2 className="font-extrabold text-lg text-white">Developer Testing Console</h2>
                </div>
                
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    Test the new Company Verification Module without registering multiple actual Google accounts. Sync the sandbox database first, then select a mock profile below.
                </p>

                <div className="space-y-4">
                    <Button 
                        onClick={handleSeedData} 
                        disabled={seeding}
                        className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-200 text-xs font-semibold gap-1.5 h-10"
                    >
                        {seeding ? (
                            <><Loader2 size={14} className="animate-spin" /> Seeding...</>
                        ) : (
                            <><Database size={14} /> 1. Seed Sandbox Companies</>
                        )}
                    </Button>

                    <div className="border-t border-slate-900 my-4 pt-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-3">2. Choose a Dummy Company / User</span>
                        
                        <div className="space-y-2">
                            {mockAccounts.map((acc) => (
                                <button
                                    key={acc.id}
                                    onClick={() => handleMockLogin(acc)}
                                    disabled={mocking}
                                    className="w-full text-left p-3 rounded-lg border border-slate-900 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-indigo-950/10 transition-all flex items-start gap-2.5 group"
                                >
                                    {acc.role === 'admin' ? (
                                        <ShieldCheck className="h-5 w-5 text-rose-400 mt-0.5 shrink-0" />
                                    ) : acc.role === 'candidate' ? (
                                        <User className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                                    ) : (
                                        <Building2 className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
                                    )}
                                    <div>
                                        <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">{acc.label}</div>
                                        <div className="text-[10px] text-slate-450 mt-0.5">{acc.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
