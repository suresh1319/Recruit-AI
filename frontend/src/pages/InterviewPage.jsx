import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, User, ArrowRight, Calendar, Clock,
    ShieldCheck, Info, Sparkles, AlertCircle, Loader2,
    Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/api';

const InterviewPage = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [status, setStatus] = useState('loading'); // loading, available, error
    const [error, setError] = useState(null);
    const [interviewData, setInterviewData] = useState(null);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        validateLink();
    }, [interviewId]);

    const validateLink = async () => {
        try {
            setStatus('loading');
            const response = await fetch(`${API_BASE_URL}/api/interviews/${interviewId}`);
            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'This interview link is invalid.');
                setStatus('error');
                return;
            }

            setInterviewData(data);
            setStatus('available');
        } catch (err) {
            console.error('Validation error:', err);
            setError('Could not connect to the server. Please check your connection.');
            setStatus('error');
        }
    };

    const handleStart = async () => {
        if (!fullName.trim() || isStarting) return;

        try {
            setIsStarting(true);
            const response = await fetch(`${API_BASE_URL}/api/interviews/${interviewId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName })
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error || 'Failed to start interview.');
                setStatus('error');
                return;
            }

            // Successfully started - store name and redirect to room
            localStorage.setItem(`candidateName_${interviewId}`, fullName);
            navigate(`/interview/${interviewId}/room`);
        } catch (err) {
            console.error('Start error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-slate-50 font-sans selection:bg-indigo-500/30 flex flex-col">
            {/* Background Gradient Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-600/10 blur-[120px]" />
            </div>

            {/* Application Header (Consistent with Landing Page) */}
            <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                        <Bot className="h-6 w-6 text-indigo-400" />
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        RecruitAI
                    </span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
                    <ShieldCheck className="h-4 w-4 text-emerald-500/50" />
                    Secure Interview Portal
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
                <AnimatePresence mode="wait">
                    {status === 'loading' && (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-4 text-slate-400"
                        >
                            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                            <p className="font-medium tracking-wide">Validating your interview link...</p>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-md w-full"
                        >
                            <Card className="bg-red-500/5 border-red-500/20 backdrop-blur-xl p-8 text-center space-y-6">
                                <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                    <AlertCircle className="h-8 w-8 text-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-white">Access Restricted</h2>
                                    <p className="text-slate-400 leading-relaxed">
                                        {error || "This interview link is no longer valid or has already been completed."}
                                    </p>
                                </div>
                                <div className="pt-4">
                                    <Button
                                        onClick={() => window.location.reload()}
                                        variant="outline"
                                        className="border-white/10 text-white hover:bg-white/5"
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {status === 'available' && (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-4xl w-full grid lg:grid-cols-5 gap-8 items-start"
                        >
                            {/* Left Side: Interview Info */}
                            <div className="lg:col-span-3 space-y-8">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                                        <Sparkles size={14} />
                                        {interviewData?.companyName || 'RecruitAI'} Hiring
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                                        Interview for <br />
                                        <span className="text-indigo-400">{interviewData?.jobTitle || 'Role'}</span>
                                    </h1>
                                    <p className="text-slate-400 text-lg leading-relaxed max-w-md">
                                        You've been invited by <strong>{interviewData?.companyName}</strong> to complete an automated voice screening.
                                    </p>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                        <div className="flex items-center gap-2 text-slate-300 font-medium">
                                            <Clock size={16} className="text-indigo-400" />
                                            Duration
                                        </div>
                                        <p className="text-sm text-slate-500">Approximately 5-10 minutes</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                        <div className="flex items-center gap-2 text-slate-300 font-medium">
                                            <Lock size={16} className="text-indigo-400" />
                                            Link Policy
                                        </div>
                                        <p className="text-sm text-slate-500">Single-use secure link</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                                    <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                                    <div className="text-sm text-indigo-300/80 leading-relaxed">
                                        <strong className="text-indigo-300">Important:</strong> Once you start, this link will expire. Please ensure your microphone is working and you are in a quiet room.
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Joining Form */}
                            <div className="lg:col-span-2">
                                <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden">
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-xl text-white">Join Interview</CardTitle>
                                        <CardDescription className="text-slate-400">
                                            Please confirm your details to begin.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-8 pt-4 space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <User className="h-4 w-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter your full name"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-medium"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleStart}
                                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-[0_0_30px_rgba(79,70,229,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] gap-3"
                                            disabled={!fullName.trim() || isStarting}
                                        >
                                            {isStarting ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    Start Interview
                                                    <ArrowRight size={20} />
                                                </>
                                            )}
                                        </Button>

                                        <p className="text-[10px] text-center text-slate-600 px-4">
                                            By clicking "Start Interview", you agree to our terms and consent to being contacted via AI voice.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="py-8 text-center border-t border-white/5">
                <p className="text-xs text-slate-600">
                    &copy; 2026 RecruitAI • Powered by Advanced Voice AI
                </p>
            </footer>
        </div>
    );
};

export default InterviewPage;
