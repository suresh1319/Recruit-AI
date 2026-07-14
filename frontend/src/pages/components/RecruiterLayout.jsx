import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Briefcase, Users, CalendarClock, Settings,
    ChevronLeft, ChevronRight, LogOut, User as UserIcon, Sun, Moon, Sparkles,
    Bell, Loader2, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useClerk } from "@clerk/clerk-react";
import { useTheme } from '../../components/theme-provider';
import { motion, AnimatePresence } from 'framer-motion';

export default function RecruiterLayout({ children, activeTab = 'jobs' }) {
    const { user } = useUser();
    const { signOut } = useClerk();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

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
                                { id: 'home', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Home' },
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
                                        navigate(`/dashboard?tab=${item.id}`);
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
                            className={`flex items-center gap-3 px-2 py-2 rounded-xl border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-100 dark:hover:border-slate-700 cursor-pointer transition-all ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                        >
                            <div className="h-9 w-9 rounded-full bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white font-medium text-sm overflow-hidden shrink-0 border-2 border-slate-100 dark:border-slate-800">
                                {user?.imageUrl ? <img src={user.imageUrl} alt="Avatar" className="h-full w-full object-cover" /> : user?.firstName?.charAt(0) || 'U'}
                            </div>
                            {!isSidebarCollapsed && (
                                <div className="overflow-hidden flex-1">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.fullName || 'User'}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.primaryEmailAddress?.emailAddress || ''}</p>
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
                                    className={`absolute left-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 ${isSidebarCollapsed ? 'left-auto -right-2 w-40' : ''}`}
                                >
                                    <div className="p-2 border-b border-slate-50 dark:border-slate-800">
                                        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Account</div>
                                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                            <UserIcon size={16} /> Profile
                                        </button>
                                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                            <Settings size={16} /> Preferences
                                        </button>
                                    </div>
                                    <div className="p-2">
                                        <button
                                            onClick={() => signOut()}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors font-medium"
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

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full flex flex-col">
                {/* Mobile Topbar */}
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

                {/* Desktop Topbar */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 items-center justify-between px-8 hidden md:flex sticky top-0 z-10 w-full shrink-0">
                    <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-semibold text-lg capitalize">
                        <Briefcase className="h-5 w-5 text-slate-500" />
                        Jobs
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
                                    className={`p-1.5 rounded-md transition-all ${
                                        theme === t.id
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                                    title={t.label}
                                >
                                    {t.icon}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
