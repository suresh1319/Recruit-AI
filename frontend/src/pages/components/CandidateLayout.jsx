import React, { useState } from 'react';
import { useUser, useClerk } from '@/hooks/useUser';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase, LogOut, UserCircle, BriefcaseBusiness, X,
    ClipboardList, Sun, Moon, Sparkles, Menu
} from 'lucide-react';
import { useTheme } from '../../components/theme-provider';

export default function CandidateLayout({ children }) {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (!isLoaded) {
        return null;
    }

    const handleTabClick = (tabId) => {
        navigate('/candidate-dashboard', { state: { activeTab: tabId } });
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            {/* Top Nav */}
            <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div 
                        className="flex items-center gap-2.5 cursor-pointer"
                        onClick={() => navigate('/candidate-dashboard')}
                    >
                        <div className="bg-indigo-600 p-1.5 rounded-lg">
                            <BriefcaseBusiness className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Recruit<span className="text-indigo-600 dark:text-indigo-400">AI</span>
                        </span>
                    </div>

                    {/* Desktop Tabs */}
                    <div className="hidden md:flex items-center gap-1">
                        {[
                            { id: 'jobs', label: 'Browse Jobs', icon: <Briefcase size={15} /> },
                            { id: 'applications', label: 'My Applications', icon: <ClipboardList size={15} /> },
                            { id: 'profile', label: 'Profile', icon: <UserCircle size={15} /> },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab.id)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Desktop Right: Avatar + Logout */}
                    <div className="hidden md:flex items-center gap-3">
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

                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5">
                            <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold font-sans">
                                {(user?.fullName || user?.firstName || 'U')[0].toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-200 font-medium max-w-[120px] truncate">
                                {user?.fullName || user?.firstName || 'User'}
                            </span>
                        </div>
                        <button 
                            onClick={() => signOut(() => navigate('/sign-in'))}
                            className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Log Out"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                    
                    {/* Mobile Toggle Button */}
                    <div className="flex md:hidden items-center">
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-500 dark:text-slate-400">
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shadow-xl flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            {[
                                { id: 'jobs', label: 'Browse Jobs', icon: <Briefcase size={15} /> },
                                { id: 'applications', label: 'My Applications', icon: <ClipboardList size={15} /> },
                                { id: 'profile', label: 'Profile', icon: <UserCircle size={15} /> },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabClick(tab.id)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-sm font-semibold text-slate-500">Theme</span>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                    {[
                                        { id: 'light', icon: <Sun size={14} /> },
                                        { id: 'dark', icon: <Moon size={14} /> },
                                        { id: 'black', icon: <Sparkles size={14} /> },
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTheme(t.id)}
                                            className={`p-2 rounded-md transition-all ${theme === t.id
                                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                : 'text-slate-400'
                                                }`}
                                        >
                                            {t.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                        {(user?.fullName || user?.firstName || 'U')[0].toUpperCase()}
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {user?.fullName || user?.firstName || 'User'}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => signOut(() => navigate('/sign-in'))}
                                    className="flex items-center gap-2 text-sm text-red-500 font-semibold px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                    <LogOut size={16} /> Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {children}
            </main>
        </div>
    );
}
