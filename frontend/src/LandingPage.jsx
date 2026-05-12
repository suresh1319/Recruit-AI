import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Briefcase, Bot, Users, Sparkles, ArrowRight, 
    ShieldCheck, Zap, Globe, BarChart3, Clock,
    PhoneCall, CalendarCheck, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SERVICES = [
    {
        icon: <Bot className="h-6 w-6 text-indigo-400" />,
        title: 'AI Voice Screening',
        description: 'Humanoid AI agents conduct first-round interviews, assessing technical skills and culture fit autonomously.'
    },
    {
        icon: <Sparkles className="h-6 w-6 text-fuchsia-400" />,
        title: 'Smart Matching',
        description: 'Advanced algorithms rank candidates against job requirements with 98% accuracy based on multi-dimensional data.'
    },
    {
        icon: <Briefcase className="h-6 w-6 text-blue-400" />,
        title: 'Unified Recruiter CRM',
        description: 'Manage your entire pipeline from a single dashboard. Track status, AI scores, and candidate transcripts.'
    },
    {
        icon: <CalendarCheck className="h-6 w-6 text-emerald-400" />,
        title: 'Auto-Scheduling',
        description: 'Seamlessly schedule final rounds with top-tier talent. Our AI handles the back-and-forth for you.'
    },
    {
        icon: <ShieldCheck className="h-6 w-6 text-amber-400" />,
        title: 'Bias-Free Evaluation',
        description: 'Standardized AI assessments ensure every candidate is judged purely on their merit and potential.'
    },
    {
        icon: <BarChart3 className="h-6 w-6 text-rose-400" />,
        title: 'Real-time Analytics',
        description: 'Deep insights into your hiring funnel, screening efficiency, and candidate quality metrics.'
    }
];

const LandingPage = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleRoleSelection = (role) => {
        localStorage.setItem('preferred_role', role);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-black text-slate-50 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Background Gradient Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/10 blur-[120px]" />
            </div>

            {/* Navigation */}
            <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-white/5 sticky top-0 bg-black/50 backdrop-blur-lg z-50">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                        <Bot className="h-6 w-6 text-indigo-400" />
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        RecruitAI
                    </span>
                </div>
                <div className="hidden md:flex items-center gap-10 text-sm font-medium text-slate-400">
                    <a href="#services" className="hover:text-white transition-colors">Services</a>
                    <a href="#platform" className="hover:text-white transition-colors">Platform</a>
                    <a href="#about" className="hover:text-white transition-colors">About</a>
                </div>
                
                {/* Desktop Auth */}
                <div className="hidden md:flex items-center gap-2">
                    <Link to="/sign-in" onClick={() => handleRoleSelection('candidate')}>
                        <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 font-medium text-sm">
                            Candidate Login
                        </Button>
                    </Link>
                    <div className="w-px h-4 bg-white/20 mx-2"></div>
                    <Link to="/sign-in" onClick={() => handleRoleSelection('recruiter')}>
                        <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 font-medium text-sm">
                            Recruiter Login
                        </Button>
                    </Link>
                    <Link to="/sign-up" onClick={() => handleRoleSelection('recruiter')}>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-[0_0_25px_rgba(79,70,229,0.4)] px-6 font-bold ml-2">
                            Get Started
                        </Button>
                    </Link>
                </div>

                {/* Mobile Toggle Button */}
                <div className="flex md:hidden items-center">
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300 hover:text-white p-2">
                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-xl border-b border-white/10 p-6 flex flex-col gap-6 shadow-2xl">
                        <div className="flex flex-col gap-4 text-sm font-medium text-slate-300">
                            <a href="#services" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white">Services</a>
                            <a href="#platform" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white">Platform</a>
                            <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-white">About</a>
                        </div>
                        <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
                            <Link to="/sign-in" onClick={() => handleRoleSelection('candidate')}>
                                <Button variant="ghost" className="w-full text-left justify-start text-white border border-white/20 bg-white/5 hover:bg-white/10">Candidate Login</Button>
                            </Link>
                            <Link to="/sign-in" onClick={() => handleRoleSelection('recruiter')}>
                                <Button variant="ghost" className="w-full text-left justify-start text-white border border-white/20 bg-white/5 hover:bg-white/10">Recruiter Login</Button>
                            </Link>
                            <Link to="/sign-up" onClick={() => handleRoleSelection('recruiter')}>
                                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Get Started</Button>
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-8 pt-20 pb-32">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    {/* Left Column: Copy & CTAs */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col gap-8"
                    >
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-fit bg-indigo-500/10 text-indigo-300 border-indigo-500/20 py-1.5 px-4 rounded-full font-bold uppercase tracking-widest text-[10px]">
                                <Sparkles className="h-3 w-3 mr-2 inline" />
                                Revolutionizing Global Hiring
                            </Badge>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-black leading-[1.0] tracking-tighter">
                            The AI Force for <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400">Next-Gen Teams.</span>
                        </h1>

                        <p className="text-xl text-slate-400 leading-relaxed max-w-xl">
                            RecruitAI automates the entire sourcing-to-hiring cycle. 
                            From autonomous voice screening to smart ranking, we help you build high-performance teams at 10x speed.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            {/* Recruiter Path */}
                            <div className="flex-1 p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-indigo-900/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors">
                                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-400"/> For Recruiters</h3>
                                <p className="text-sm text-slate-400 mb-6">Hire 10x faster with AI screening.</p>
                                <div className="flex gap-3">
                                    <Link className="flex-1" to="/sign-up" onClick={() => handleRoleSelection('recruiter')}>
                                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                                            Sign Up
                                        </Button>
                                    </Link>
                                    <Link className="flex-1" to="/sign-in" onClick={() => handleRoleSelection('recruiter')}>
                                        <Button variant="ghost" className="w-full border border-white/20 bg-transparent hover:bg-white/10 text-white">
                                            Log In
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Candidate Path */}
                            <div className="flex-1 p-6 rounded-3xl bg-gradient-to-br from-fuchsia-500/10 to-fuchsia-900/10 border border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-colors">
                                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Users className="w-5 h-5 text-fuchsia-400"/> For Candidates</h3>
                                <p className="text-sm text-slate-400 mb-6">Take interviews & track applications.</p>
                                <div className="flex gap-3">
                                    <Link className="flex-1" to="/sign-up" onClick={() => handleRoleSelection('candidate')}>
                                        <Button className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold">
                                            Sign Up
                                        </Button>
                                    </Link>
                                    <Link className="flex-1" to="/sign-in" onClick={() => handleRoleSelection('candidate')}>
                                        <Button variant="ghost" className="w-full border border-white/20 bg-transparent hover:bg-white/10 text-white">
                                            Log In
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pt-10 border-t border-white/5">
                            <div className="flex -space-x-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-slate-800 shadow-xl overflow-hidden">
                                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-200">Join 2,000+ forward-thinking companies</p>
                                <div className="flex items-center gap-1 text-xs text-indigo-400 mt-0.5">
                                    <Zap size={10} className="fill-current" />
                                    <span>Trusted by Global 500 Leaders</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Premium Visual */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative group"
                    >
                        {/* Glow effect behind visual */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-fuchsia-500/30 blur-[80px] rounded-full group-hover:opacity-100 transition-opacity duration-700" />
                        
                        <div className="relative rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-3xl overflow-hidden shadow-2xl p-4">
                            <img 
                                src="/recruit_ai_hero_visual_1773600442988.png" 
                                alt="AI Recruitment Interface" 
                                className="w-full h-auto rounded-[2rem] shadow-2xl transition-transform duration-700 hover:scale-105"
                            />
                            
                            <div className="absolute bottom-10 left-10 p-5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-[200px] animate-bounce-slow">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">AI Agent Active</span>
                                </div>
                                <p className="text-xs text-slate-200 font-medium leading-tight">Screening 142 candidates for Senior Frontend Eng...</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* Services Grid */}
            <section id="services" className="py-32 bg-slate-950/40 relative">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="flex flex-col items-center text-center mb-24">
                        <Badge variant="outline" className="mb-6 bg-white/5 text-slate-400 border-white/10 py-1 px-4 rounded-full font-medium">All-in-one Platform</Badge>
                        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">Recruitment, <span className="text-indigo-400">Reimagined.</span></h2>
                        <p className="text-slate-400 max-w-2xl text-lg">
                            Ditch the fragmented tools. RecruitAI provides a cohesive ecosystem for the modern recruiter.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {SERVICES.map((service, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="group p-10 rounded-[2rem] bg-black/40 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />
                                
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 border border-white/5 group-hover:border-indigo-500/20 transition-all">
                                    {service.icon}
                                </div>
                                <h3 className="text-2xl font-bold mb-4 group-hover:text-indigo-300 transition-colors">{service.title}</h3>
                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                                    {service.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-32 relative overflow-hidden">
                <div className="max-w-5xl mx-auto px-8 text-center bg-gradient-to-b from-indigo-500/10 to-transparent p-20 rounded-[3rem] border border-indigo-500/10 backdrop-blur-sm">
                    <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tight">Ready to hire your <br /> next <span className="text-indigo-400 italic">top performer?</span></h2>
                    <p className="text-slate-400 text-lg mb-12 max-w-xl mx-auto">
                        Join the world's most innovative recruitment teams. Get started with RecruitAI today.
                    </p>
                    <div className="flex flex-wrap justify-center gap-6">
                         <Link to="/sign-up" onClick={() => handleRoleSelection('recruiter')}>
                            <Button size="lg" className="h-16 px-12 bg-white text-black hover:bg-slate-200 font-black rounded-2xl text-lg shadow-2xl">
                                Start Your Free Trial
                            </Button>
                        </Link>
                    </div>
                    <p className="mt-8 text-slate-500 text-xs uppercase font-bold tracking-[0.2em]">No credit card required. Cancel anytime.</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/5 max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2 opacity-50">
                    <Bot className="h-4 w-4" />
                    <span className="text-sm font-bold tracking-tight">RecruitAI</span>
                </div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">© 2026 RecruitAI Technologies Inc. All Rights Reserved.</p>
                <div className="flex gap-8 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                    <a href="#" className="hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms</a>
                    <a href="#" className="hover:text-white transition-colors">Contact</a>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
