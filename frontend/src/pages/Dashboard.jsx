import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Briefcase, Users, CalendarClock, Settings,
    Zap, CheckCircle2, Calendar, Clock, ArrowUpRight, Bell, Loader2,
    ChevronLeft, ChevronRight, LogOut, User as UserIcon, Sun, Moon, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useClerk } from "@clerk/clerk-react";
import { useTheme } from '../components/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';
import JobsTab from './components/JobsTab';
import CandidatesTab from './components/CandidatesTab';
import SchedulesTab from './components/SchedulesTab';
import SettingsTab from './components/SettingsTab';
import WorkflowVisualization from './components/WorkflowVisualization';
import { API_BASE_URL } from '@/lib/api';

export default function Dashboard() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const { theme, setTheme } = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isActivityOpen, setIsActivityOpen] = useState(false);
    const [isRoleChecking, setIsRoleChecking] = useState(true);
    const [metrics, setMetrics] = useState({
        activeJobs: 0,
        totalCandidates: 0,
        scheduledInterviews: 0,
        screeningRate: 0,
        recentActivity: []
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/dashboard/metrics`)
            .then(res => res.json())
            .then(data => {
                setMetrics(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch metrics:", err);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!isLoaded) return;
        if (!user) {
            navigate('/sign-in', { replace: true });
            return;
        }

        fetch(`${API_BASE_URL}/api/users/me?clerkId=${user.id}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch user profile');
                return res.json();
            })
            .then(userData => {
                if (userData.role !== 'recruiter') {
                    navigate('/candidate-dashboard', { replace: true });
                } else {
                    setIsRoleChecking(false);
                }
            })
            .catch(err => {
                console.error('Error verifying user role:', err);
                setIsRoleChecking(false);
            });
    }, [user, isLoaded, navigate]);

    const getRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
        return date.toLocaleDateString();
    };

    const ActivityIcon = ({ type }) => {
        switch (type) {
            case 'Calendar': return <Calendar className="h-5 w-5" />;
            case 'Users': return <Users className="h-5 w-5" />;
            case 'Clock': return <Clock className="h-5 w-5" />;
            default: return <CheckCircle2 className="h-5 w-5" />;
        }
    };

    if (!isLoaded || isRoleChecking) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-slate-500 text-sm font-medium animate-pulse">Checking permissions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#f4f7fb] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300">
            {/* Mobile Overlay */}
            {isMobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarCollapsed && !isMobileSidebarOpen ? 80 : 256 }}
                className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out fixed md:relative z-50 h-full shadow-2xl md:shadow-none ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
            >
                {/* Toggle Button */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-1 text-slate-400 hover:text-indigo-600 shadow-sm z-20"
                >
                    {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <div>
                    {/* Logo */}
                    <div className={`p-6 flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                        <div className="p-2 bg-indigo-600 rounded-lg shadow-sm shrink-0">
                            <Briefcase className="h-5 w-5 text-white" />
                        </div>
                        {!isSidebarCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="overflow-hidden whitespace-nowrap"
                            >
                                <h1 className="font-bold text-lg text-slate-900 dark:text-slate-100 tracking-tight">RecruitAI</h1>
                                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">AI Voice Screening</p>
                            </motion.div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="px-4 pb-2">
                        {!isSidebarCollapsed && <p className="text-xs font-semibold text-slate-400 mb-3 px-3 uppercase tracking-wider">Navigation</p>}
                        <nav className="space-y-1">
                            {[
                                { id: 'home', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Home', active: true },
                                { id: 'jobs', icon: <Briefcase className="h-5 w-5" />, label: 'Jobs' },
                                { id: 'candidates', icon: <Users className="h-5 w-5" />, label: 'Candidates' },
                                { id: 'schedules', icon: <CalendarClock className="h-5 w-5" />, label: 'Schedules / Interview' },
                                { id: 'settings', icon: <Settings className="h-5 w-5" />, label: 'Settings' },
                            ].map((item) => (
                                <a
                                    key={item.id}
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setSearchParams({ tab: item.id });
                                        setActiveTab(item.id);
                                        setIsMobileSidebarOpen(false);
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all group ${activeTab === item.id
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                                        } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                                    title={isSidebarCollapsed ? item.label : ''}
                                >
                                    <div className="shrink-0">{item.icon}</div>
                                    {!isSidebarCollapsed && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="whitespace-nowrap overflow-hidden"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </a>
                            ))}
                        </nav>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    <Button
                        className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm font-medium ${isSidebarCollapsed ? 'p-0 h-10 w-10 mx-auto rounded-xl flex items-center justify-center' : ''}`}
                    >
                        <Zap className="h-4 w-4" />
                        {!isSidebarCollapsed && <span>Upgrade Plan</span>}
                    </Button>

                    <div className="relative">
                        <div
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-100 dark:hover:border-slate-700 cursor-pointer transition-all ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                        >
                            <div className="h-8 w-8 rounded-full bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white font-medium text-xs overflow-hidden shrink-0 border-2 border-slate-100 dark:border-slate-800">
                                {user?.imageUrl ? <img src={user.imageUrl} alt="Avatar" className="h-full w-full object-cover" /> : user?.firstName?.charAt(0) || 'U'}
                            </div>
                            {!isSidebarCollapsed && (
                                <div className="overflow-hidden flex-1">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.fullName || 'User'}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.primaryEmailAddress?.emailAddress || ''}</p>
                                </div>
                            )}
                        </div>

                        {/* Profile Dropdown */}
                        <AnimatePresence>
                            {isProfileOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className={`absolute left-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 ${isSidebarCollapsed ? 'left-auto -right-2 w-40' : ''}`}
                                >
                                    <div className="p-2 border-b border-slate-50">
                                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Account</div>
                                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                            <UserIcon size={16} /> Profile
                                        </button>
                                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                            <Settings size={16} /> Preferences
                                        </button>
                                    </div>
                                    <div className="p-2">
                                        <button
                                            onClick={() => signOut()}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                                        >
                                            <LogOut size={16} /> Log out
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full">
                <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-600 rounded-md">
                            <Briefcase className="h-4 w-4 text-white" />
                        </div>
                        <h1 className="font-bold text-slate-900 dark:text-slate-100">RecruitAI</h1>
                    </div>
                    <Button variant="ghost" size="icon" className="dark:text-slate-400" onClick={() => setIsMobileSidebarOpen(true)}>
                        <LayoutDashboard className="h-5 w-5" />
                    </Button>
                </div>

                {/* Topbar */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 items-center justify-between px-8 hidden md:flex sticky top-0 z-10 w-full">
                    <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-semibold text-lg capitalize">
                        {activeTab === 'home' && <LayoutDashboard className="h-5 w-5 text-slate-500" />}
                        {activeTab === 'jobs' && <Briefcase className="h-5 w-5 text-slate-500" />}
                        {activeTab === 'candidates' && <Users className="h-5 w-5 text-slate-500" />}
                        {activeTab === 'schedules' && <CalendarClock className="h-5 w-5 text-slate-500" />}
                        {activeTab === 'settings' && <Settings className="h-5 w-5 text-slate-500" />}
                        {activeTab}
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Theme Switcher */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mr-2">
                            {[
                                { id: 'light', icon: <Sun size={14} />, label: 'Light' },
                                { id: 'dark', icon: <Moon size={14} />, label: 'Dark' },
                                { id: 'black', icon: <Sparkles size={14} />, label: 'Black' },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={`p-1.5 rounded-md transition-all ${theme === t.id
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                        }`}
                                    title={t.label}
                                >
                                    {t.icon}
                                </button>
                            ))}
                        </div>

                        {/* Activity Button */}
                        <button
                            onClick={() => setIsActivityOpen(true)}
                            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all"
                        >
                            <Bell className="h-4 w-4" />
                            <span className="hidden sm:inline">Activity</span>
                            {metrics.recentActivity.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                    {metrics.recentActivity.length > 9 ? '9+' : metrics.recentActivity.length}
                                </span>
                            )}
                        </button>
                        <div className="h-8 w-8 rounded-full bg-teal-800 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                            {(user?.fullName || user?.firstName || 'U')[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
                    {/* Tab Routing */}
                    {activeTab === 'home' && (
                        <>
                            {/* Welcome Banner */}
                            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 md:py-5 md:px-6 text-white shadow-sm relative overflow-hidden">
                                <div className="relative z-10">
                                    <h2 className="text-lg md:text-xl font-bold mb-1 tracking-tight">Welcome back! 👋</h2>
                                    <p className="text-indigo-100 max-w-xl text-xs md:text-sm">
                                        Your AI voice agent is active and screening candidates 24/7. Here's your overview.
                                    </p>
                                </div>
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                                <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2" />
                            </div>

                            {/* Stat Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {/* Card 1 */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-36">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-sm font-medium transition-colors ${metrics.activeJobs === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>Active Jobs</p>
                                        <div className={`p-2 rounded-lg transition-colors ${metrics.activeJobs === 0 ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'}`}>
                                            <Briefcase className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <h3 className={`text-3xl font-bold transition-colors ${metrics.activeJobs === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'} mb-1`}>
                                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : metrics.activeJobs}
                                        </h3>
                                        <p className="text-xs text-slate-500">+{metrics.activeJobs > 0 ? '2' : '0'} from last month</p>
                                    </div>
                                </div>

                                {/* Card 2 */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-36">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-sm font-medium transition-colors ${metrics.totalCandidates === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>Total Candidates</p>
                                        <div className={`p-2 rounded-lg transition-colors ${metrics.totalCandidates === 0 ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500' : 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400'}`}>
                                            <Users className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <h3 className={`text-3xl font-bold transition-colors ${metrics.totalCandidates === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'} mb-1`}>
                                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : metrics.totalCandidates}
                                        </h3>
                                        <p className="text-xs text-slate-500">+{metrics.totalCandidates > 0 ? '34' : '0'} this week</p>
                                    </div>
                                </div>

                                {/* Card 3 */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-36">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-sm font-medium transition-colors ${metrics.scheduledInterviews === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>Interviews Scheduled</p>
                                        <div className={`p-2 rounded-lg transition-colors ${metrics.scheduledInterviews === 0 ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'}`}>
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <h3 className={`text-3xl font-bold transition-colors ${metrics.scheduledInterviews === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'} mb-1`}>
                                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : metrics.scheduledInterviews}
                                        </h3>
                                        <p className="text-xs text-slate-500">Next 7 days</p>
                                    </div>
                                </div>

                                {/* Card 4 */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-36">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-sm font-medium transition-colors ${metrics.screeningRate === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>Screening Rate</p>
                                        <div className={`p-2 rounded-lg transition-colors ${metrics.screeningRate === 0 ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500' : 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'}`}>
                                            <ArrowUpRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <h3 className={`text-3xl font-bold transition-colors ${metrics.screeningRate === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'} mb-1`}>
                                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : `${metrics.screeningRate}%`}
                                        </h3>
                                        <p className="text-xs text-slate-500">+5% vs last month</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity — moved to slide-in drawer (Activity button in topbar) */}
                            <WorkflowVisualization setActiveTab={setActiveTab} setSearchParams={setSearchParams} />
                        </>
                    )}

                     {activeTab === 'jobs' && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-8">
                            <JobsTab />
                        </div>
                    )}
                    {activeTab === 'candidates' && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-8">
                            <CandidatesTab />
                        </div>
                    )}
                    {activeTab === 'schedules' && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-8">
                            <SchedulesTab />
                        </div>
                    )}
                    {activeTab === 'settings' && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-8">
                            <SettingsTab />
                        </div>
                    )}
                </div>
            </main>

            {/* Activity Drawer */}
            <AnimatePresence>
                {isActivityOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="activity-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40"
                            onClick={() => setIsActivityOpen(false)}
                        />
                        {/* Drawer */}
                        <motion.div
                            key="activity-drawer"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col"
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">Recent Activity</h2>
                                    {metrics.recentActivity.length > 0 && (
                                        <span className="ml-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full">
                                            {metrics.recentActivity.length}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsActivityOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Drawer Body */}
                            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoading ? (
                                    <div className="p-12 flex justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                                    </div>
                                ) : metrics.recentActivity.length > 0 ? (
                                    metrics.recentActivity.map((item, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: 16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.04 }}
                                            className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <div className={`mt-0.5 flex-shrink-0 p-2 rounded-lg ${
                                                item.icon === 'Calendar' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' :
                                                item.icon === 'Users'    ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400' :
                                                item.icon === 'Clock'    ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400' :
                                                                           'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                                <ActivityIcon type={item.icon} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">{item.message}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{getRelativeTime(item.time)}</p>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                                            <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">No activity yet</p>
                                        <p className="text-xs text-slate-300 dark:text-slate-600">Activity will appear here as candidates are screened.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
