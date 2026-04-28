import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, SignOutButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
    Briefcase, MapPin, DollarSign, LogOut, Upload, CheckCircle2,
    UserCircle, BriefcaseBusiness, Bot, Loader2, Trash2, X,
    Search, Filter, ChevronRight, Building2, Timer, Home, Calendar,
    ExternalLink, MapPinned, Info, ClipboardList, Clock, CheckCheck,
    XCircle, AlertCircle, Sun, Moon, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../components/theme-provider';

export default function CandidateDashboard() {
    const { user, isLoaded } = useUser();
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const [activeJobs, setActiveJobs] = useState([]);
    const [profile, setProfile] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [applyingTo, setApplyingTo] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [activeTab, setActiveTab] = useState('jobs'); // 'jobs', 'applications', or 'profile'
    const [applications, setApplications] = useState([]);
    const [isLoadingApps, setIsLoadingApps] = useState(false);
    const fileInputRef = useRef(null);

    // Filters State
    const [filters, setFilters] = useState({
        search: '',
        profileSearch: '',
        locationSearch: '',
        wfh: false,
        internshipsOnly: false,
        partTime: false,
        minStipend: [0],
        asPerPreferences: false
    });

    useEffect(() => {
        if (isLoaded && user) {
            fetchData();
        }
    }, [isLoaded, user]);

    useEffect(() => {
        if (activeTab === 'applications' && user?.id) {
            fetchApplications();
        }
    }, [activeTab, user]);

    const fetchApplications = async () => {
        setIsLoadingApps(true);
        try {
            const res = await fetch(`http://localhost:5001/api/candidates/my-applications?clerkId=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setApplications(data.applications || []);
            }
        } catch (err) {
            console.error('Error fetching applications:', err);
        } finally {
            setIsLoadingApps(false);
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const jobsRes = await fetch('http://localhost:5001/api/public-jobs');
            const jobsData = await jobsRes.json();
            setActiveJobs(Array.isArray(jobsData) ? jobsData : []);

            const profileRes = await fetch(`http://localhost:5001/api/candidates/me?clerkId=${user.id}`);
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                setProfile(profileData);
            } else {
                setProfile({
                    clerkId: user.id,
                    name: user.fullName || '',
                    email: user.primaryEmailAddress?.emailAddress || '',
                    status: 'pending'
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const saveProfile = async () => {
        if (!profile.phone || !profile.resumeUrl) {
            toast.error("Phone and Resume Link are required.");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`http://localhost:5001/api/candidates/me?clerkId=${user.id || profile.clerkId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...profile, clerkId: user.id || profile.clerkId })
            });

            if (res.ok) {
                toast.success('Profile saved successfully!');
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to save profile');
            }
        } catch (error) {
            console.error('Save profile error:', error);
            toast.error('Network error saving profile');
        } finally {
            setIsSaving(false);
        }
    };

    const easyApply = async (jobId) => {
        if (!profile.phone || !profile.resumeUrl) {
            toast.error("Please ensure your profile has a phone number and resume link before applying.");
            setActiveTab('profile'); // Guide them to profile
            return;
        }

        setApplyingTo(jobId);
        try {
            const res = await fetch(`http://localhost:5001/api/jobs/${jobId}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clerkId: user.id })
            });

            if (res.ok) {
                toast.success('Successfully applied to the role!');
                fetchData();
                fetchApplications();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to apply');
            }
        } catch (error) {
            console.error('Apply error:', error);
            toast.error('Network error during application calculation');
        } finally {
            setApplyingTo(null);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsExtracting(true);
        const uploadData = new FormData();
        uploadData.append('resume', file);

        try {
            const response = await fetch('http://localhost:5001/api/candidates/parse-resume', {
                method: 'POST',
                body: uploadData,
            });

            if (response.ok) {
                const parsedData = await response.json();
                setProfile(prev => ({
                    ...prev,
                    name: parsedData.name || prev.name || '',
                    email: parsedData.email || prev.email || '',
                    phone: parsedData.phone || prev.phone || '',
                    role: parsedData.role || prev.role || '',
                    skills: parsedData.skills || prev.skills || [],
                    experienceSummary: parsedData.experienceSummary || prev.experienceSummary || '',
                    resumeUrl: parsedData.resumeUrl || prev.resumeUrl || '',
                    projects: parsedData.projects || prev.projects || []
                }));
                toast.success("Resume parsed successfully! Review and save your profile.");
            } else {
                toast.error("Failed to parse the resume. Please fill out manually.");
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error("Error connecting to server.");
        } finally {
            setIsExtracting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Filter Logic
    const filteredJobs = useMemo(() => {
        return activeJobs.filter(job => {
            // General Keyword Search (Bottom bar)
            const matchesKeyword = !filters.search ||
                job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                job.department?.toLowerCase().includes(filters.search.toLowerCase()) ||
                job.description?.toLowerCase().includes(filters.search.toLowerCase());

            // Sidebar Profile Search
            const matchesProfile = !filters.profileSearch ||
                job.title.toLowerCase().includes(filters.profileSearch.toLowerCase()) ||
                job.department?.toLowerCase().includes(filters.profileSearch.toLowerCase());

            // Sidebar Location Search
            const matchesLocation = !filters.locationSearch ||
                job.location?.toLowerCase().includes(filters.locationSearch.toLowerCase());

            // Work from home filter
            const matchesWFH = !filters.wfh || job.location?.toLowerCase().includes('remote');

            // Internship filter (Assuming entry level is internship for now or check title)
            const matchesInternships = !filters.internshipsOnly || job.experienceLevel === 'Entry' || job.title.toLowerCase().includes('intern');

            // Part-time filter
            const matchesPartTime = !filters.partTime || job.employmentType === 'Part-time';

            // Min Stipend / Salary
            const matchesStipend = job.salaryRange?.min >= (filters.minStipend[0] * 100); // UI Example Scaling

            // As per my preferences (Basic implementation using profile skills/role)
            if (filters.asPerPreferences) {
                const profileRole = profile.role?.toLowerCase() || '';
                if (profileRole && !job.title.toLowerCase().includes(profileRole)) return false;
            }

            return matchesKeyword && matchesProfile && matchesLocation && matchesWFH && matchesInternships && matchesPartTime && matchesStipend;
        });
    }, [activeJobs, filters, profile]);

    const resetFilters = () => {
        setFilters({
            search: '',
            profileSearch: '',
            locationSearch: '',
            wfh: false,
            internshipsOnly: false,
            partTime: false,
            minStipend: [0],
            asPerPreferences: false
        });
    };

    if (!isLoaded || isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-600 font-medium animate-pulse">Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            {/* Top Nav */}
            <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="bg-indigo-600 p-1.5 rounded-lg">
                            <BriefcaseBusiness className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            Recruit<span className="text-indigo-600 dark:text-indigo-400">AI</span>
                        </span>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1">
                        {[
                            { id: 'jobs', label: 'Browse Jobs', icon: <Briefcase size={15} /> },
                            { id: 'applications', label: 'My Applications', icon: <ClipboardList size={15} /> },
                            { id: 'profile', label: 'Profile', icon: <UserCircle size={15} /> },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id
                                        ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Right: Avatar + Logout */}
                    <div className="flex items-center gap-3">
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
                            <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                                {(user?.fullName || user?.firstName || 'U')[0].toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-200 font-medium max-w-[120px] truncate">
                                {user?.fullName || user?.firstName || 'User'}
                            </span>
                        </div>
                        <SignOutButton>
                            <button className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30">
                                <LogOut size={18} />
                            </button>
                        </SignOutButton>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <AnimatePresence mode="wait">

                    {/* ─── JOBS TAB ─── */}
                    {activeTab === 'jobs' && (
                        <motion.div key="jobs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

                            {/* Search bar */}
                            <div className="flex gap-3 mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search by role, skills, or keywords..."
                                        value={filters.search}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                        className="w-full pl-10 pr-4 h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                    />
                                </div>
                                <div className="relative">
                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Location"
                                        value={filters.locationSearch}
                                        onChange={(e) => setFilters({ ...filters, locationSearch: e.target.value })}
                                        className="pl-10 pr-4 h-11 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                                    />
                                </div>
                                {(filters.search || filters.locationSearch || filters.wfh || filters.internshipsOnly || filters.partTime) && (
                                    <button onClick={resetFilters} className="px-4 h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 transition-colors font-medium">
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-6">
                                {/* Sidebar */}
                                <aside className="w-56 shrink-0 space-y-4">
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Filter by</p>
                                        <div className="space-y-3">
                                            {[
                                                { id: 'wfh', label: 'Remote / WFH' },
                                                { id: 'internshipsOnly', label: 'Internships' },
                                                { id: 'partTime', label: 'Part-time' },
                                                { id: 'asPerPreferences', label: 'Match my profile' },
                                            ].map(f => (
                                                <label key={f.id} className="flex items-center gap-2.5 cursor-pointer group">
                                                    <div
                                                        onClick={() => setFilters({ ...filters, [f.id]: !filters[f.id] })}
                                                        className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${filters[f.id]
                                                                ? 'bg-indigo-600 border-indigo-600'
                                                                : 'border-slate-300 group-hover:border-indigo-400'
                                                            }`}
                                                    >
                                                        {filters[f.id] && <CheckCircle2 size={10} className="text-white" />}
                                                    </div>
                                                    <span
                                                        onClick={() => setFilters({ ...filters, [f.id]: !filters[f.id] })}
                                                        className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 cursor-pointer"
                                                    >
                                                        {f.label}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Experience filter */}
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Experience</p>
                                        <div className="space-y-2">
                                            {['Entry', 'Mid', 'Senior', 'Lead'].map(level => (
                                                <label key={level} className="flex items-center gap-2.5 cursor-pointer group">
                                                    <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">{level} Level</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </aside>

                                {/* Job Cards */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            <span className="font-bold text-slate-900 dark:text-slate-100">{filteredJobs.length}</span> {filteredJobs.length === 1 ? 'role' : 'roles'} found
                                        </p>
                                    </div>

                                    {filteredJobs.length === 0 ? (
                                        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                                            <Search className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
                                            <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">No jobs match your filters</h3>
                                            <p className="text-slate-400 dark:text-slate-500 text-sm">Try adjusting or <button onClick={resetFilters} className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">clearing</button> your filters.</p>
                                        </div>
                                    ) : (
                                        filteredJobs.map(job => {
                                            const hasApplied = job.candidatesApplied?.includes(profile._id);
                                            return (
                                                <motion.div key={job._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition-all group">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/30">
                                                                        Actively Hiring
                                                                    </span>
                                                                    {job.experienceLevel && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                                                                            {job.experienceLevel}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors leading-snug mb-3">
                                                                    {job.title}
                                                                </h3>

                                                                {/* Meta tags */}
                                                                <div className="flex flex-wrap gap-2 mb-3">
                                                                    {job.location && (
                                                                        <span className="flex items-center gap-1 text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                                                                            <MapPin size={11} /> {job.location}
                                                                        </span>
                                                                    )}
                                                                    {job.employmentType && (
                                                                        <span className="flex items-center gap-1 text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                                                                            <Timer size={11} /> {job.employmentType}
                                                                        </span>
                                                                    )}
                                                                    {job.salaryRange?.min && (
                                                                        <span className="flex items-center gap-1 text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                                                                            <DollarSign size={11} /> {job.salaryRange.min.toLocaleString()} – {job.salaryRange.max?.toLocaleString() || '?'} / yr
                                                                        </span>
                                                                    )}
                                                                    {job.department && (
                                                                        <span className="flex items-center gap-1 text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                                                                            <Building2 size={11} /> {job.department}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {job.description && (
                                                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                                                                        {job.description}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Right actions */}
                                                            <div className="shrink-0 flex flex-col items-end gap-2">
                                                                {hasApplied ? (
                                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 px-3 py-1.5 rounded-full">
                                                                        <CheckCircle2 size={13} /> Applied
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => easyApply(job._id)}
                                                                        disabled={applyingTo === job._id}
                                                                        className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                                    >
                                                                        {applyingTo === job._id ? 'Applying...' : 'Easy Apply'}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => navigate(`/job/${job._id}`)}
                                                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                                                                >
                                                                    <ExternalLink size={11} /> View Details
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── APPLICATIONS TAB ─── */}
                    {activeTab === 'applications' && (
                        <motion.div key="applications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Applications</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track the status of every role you have applied to.</p>
                            </div>

                            {isLoadingApps ? (
                                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500 dark:text-indigo-400 mb-3" />
                                    <p className="text-slate-400 dark:text-slate-500 text-sm">Fetching your applications...</p>
                                </div>
                            ) : applications.length === 0 ? (
                                <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                                    <ClipboardList className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg">No applications yet</h3>
                                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                                        Head to <button onClick={() => setActiveTab('jobs')} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Browse Jobs</button> to apply to your first role.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-w-4xl">
                                    {applications.map((app, idx) => {
                                        const statusConfig = {
                                            pending: { label: 'Under Review', color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30', icon: <Clock size={13} /> },
                                            matched: { label: 'Shortlisted', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30', icon: <CheckCircle2 size={13} /> },
                                            invited: { label: 'Interview Invited', color: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/30', icon: <Calendar size={13} /> },
                                            called: { label: 'Interview Done', color: 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-900/30', icon: <CheckCheck size={13} /> },
                                            scheduled: { label: 'Interview Scheduled', color: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900/30', icon: <Calendar size={13} /> },
                                            selected: { label: 'Selected 🎉', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30', icon: <CheckCheck size={13} /> },
                                            rejected: { label: 'Not Selected', color: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30', icon: <XCircle size={13} /> },
                                        };
                                        const status = statusConfig[app.applicationStatus] || statusConfig.pending;
                                        return (
                                            <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between gap-4 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm transition-all">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base truncate">{app.jobTitle}</h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                        {app.department && <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Building2 size={11} /> {app.department}</span>}
                                                        {app.location && <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin size={11} /> {app.location}</span>}
                                                        {app.employmentType && <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Timer size={11} /> {app.employmentType}</span>}
                                                        <span className="text-xs text-slate-400 dark:text-slate-500">Applied {new Date(app.appliedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${status.color}`}>
                                                        {status.icon} {status.label}
                                                    </span>
                                                    <button
                                                        onClick={() => navigate(`/job/${app.jobId}`)}
                                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 whitespace-nowrap"
                                                    >
                                                        <ExternalLink size={11} /> See Job Details
                                                    </button>
                                                    {app.applicationStatus === 'invited' && app.interviewLink && (
                                                        <a href={app.interviewLink} target="_blank" rel="noopener noreferrer"
                                                            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors">
                                                            <Calendar size={12} /> Join Interview
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ─── PROFILE TAB ─── */}
                    {activeTab === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Profile</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Keep your profile updated to get better job matches.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isExtracting}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                                    >
                                        {isExtracting ? <Loader2 size={15} className="animate-spin text-indigo-600 dark:text-indigo-400" /> : <Bot size={15} className="text-indigo-600 dark:text-indigo-400" />}
                                        {isExtracting ? 'Parsing...' : 'AI Resume Parser'}
                                    </button>
                                    <button
                                        onClick={saveProfile}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Basic Info */}
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">Basic Information</h3>
                                        <div className="grid sm:grid-cols-2 gap-5">
                                            {[
                                                { label: 'Full Name', name: 'name', placeholder: 'Jane Doe' },
                                                { label: 'Email Address', name: 'email', placeholder: 'jane@example.com' },
                                                { label: 'Phone Number *', name: 'phone', placeholder: '+91 98765 43210' },
                                                { label: 'Target Role', name: 'role', placeholder: 'e.g. Frontend Engineer' },
                                            ].map(field => (
                                                <div key={field.name} className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{field.label}</label>
                                                    <input
                                                        name={field.name}
                                                        value={profile[field.name] || ''}
                                                        onChange={handleProfileChange}
                                                        placeholder={field.placeholder}
                                                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                                                    />
                                                </div>
                                            ))}
                                            <div className="sm:col-span-2 space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Skills <span className="font-normal normal-case">(comma separated)</span></label>
                                                <input
                                                    value={Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills || ''}
                                                    onChange={(e) => setProfile({ ...profile, skills: e.target.value.split(',').map(s => s.trim()) })}
                                                    placeholder="React, Node.js, Python, AWS..."
                                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                                                />
                                            </div>
                                            <div className="sm:col-span-2 space-y-1.5">
                                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Experience Summary</label>
                                                <textarea
                                                    name="experienceSummary"
                                                    value={profile.experienceSummary || ''}
                                                    onChange={handleProfileChange}
                                                    rows={4}
                                                    placeholder="Brief overview of your background and experience..."
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Projects */}
                                    {Array.isArray(profile.projects) && profile.projects.length > 0 && (
                                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100">Projects</h3>
                                                <button
                                                    onClick={() => setProfile({ ...profile, projects: [...(profile.projects || []), { name: '', points: [''] }] })}
                                                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                                                >
                                                    + Add Project
                                                </button>
                                            </div>
                                            <div className="space-y-5">
                                                {profile.projects.map((project, pIdx) => (
                                                    <div key={pIdx} className="border border-slate-100 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                value={project.name || ''}
                                                                onChange={(e) => { const p = [...profile.projects]; p[pIdx].name = e.target.value; setProfile({ ...profile, projects: p }); }}
                                                                placeholder="Project name"
                                                                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                                                            />
                                                            <button onClick={() => { const p = [...profile.projects]; p.splice(pIdx, 1); setProfile({ ...profile, projects: p }); }} className="text-slate-300 hover:text-red-500 p-1">
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                        {(project.points || []).map((point, ptIdx) => (
                                                            <div key={ptIdx} className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                                <input
                                                                    value={point}
                                                                    onChange={(e) => { const p = [...profile.projects]; p[pIdx].points[ptIdx] = e.target.value; setProfile({ ...profile, projects: p }); }}
                                                                    placeholder="Key achievement or description"
                                                                    className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                                                                />
                                                                <button onClick={() => { const p = [...profile.projects]; p[pIdx].points.splice(ptIdx, 1); setProfile({ ...profile, projects: p }); }} className="text-slate-300 hover:text-slate-500 p-1">
                                                                    <X size={13} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => { const p = [...profile.projects]; p[pIdx].points.push(''); setProfile({ ...profile, projects: p }); }}
                                                            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                                                        >+ Add point</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(!Array.isArray(profile.projects) || profile.projects.length === 0) && (
                                        <button
                                            onClick={() => setProfile({ ...profile, projects: [{ name: '', points: [''] }] })}
                                            className="w-full py-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors font-semibold"
                                        >
                                            + Add Projects
                                        </button>
                                    )}
                                </div>

                                {/* Sidebar Cards */}
                                <div className="space-y-4">
                                    {/* Resume */}
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2"><ExternalLink size={15} className="text-indigo-500" /> Resume</h3>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Resume URL *</label>
                                            <input
                                                name="resumeUrl"
                                                value={profile.resumeUrl || ''}
                                                onChange={handleProfileChange}
                                                placeholder="https://drive.google.com/..."
                                                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                                            />
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                                                Link your resume so AI can better rank your profile for relevant jobs.
                                            </p>
                                        </div>
                                    </div>
                                    {/* Status card */}
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2"><UserCircle size={15} className="text-indigo-500" /> Status</h3>
                                        {profile.status && (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${profile.status === 'selected' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                                                    : profile.status === 'invited' ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/30'
                                                        : profile.status === 'rejected' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30'
                                                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
                                                }`}>
                                                {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Interview card */}
                                    {profile.interviewLink && profile.status === 'invited' && (
                                        <div className="bg-indigo-600 rounded-xl p-5 text-white relative overflow-hidden">
                                            <div className="absolute -right-4 -bottom-4 opacity-10"><BriefcaseBusiness size={80} /></div>
                                            <div className="relative">
                                                <div className="bg-white/20 w-9 h-9 rounded-lg flex items-center justify-center mb-3">
                                                    <Calendar size={18} />
                                                </div>
                                                <h3 className="font-bold mb-1">Interview Ready</h3>
                                                <p className="text-white/75 text-xs mb-4">You have an active interview session waiting.</p>
                                                <a href={profile.interviewLink} target="_blank" rel="noopener noreferrer"
                                                    className="block w-full py-2 rounded-lg bg-white text-indigo-600 text-sm font-bold text-center hover:bg-indigo-50 transition-colors">
                                                    Enter Interview Room
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 p-4">
                                        <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
                                            <span className="font-bold">💡 Tip:</span> A complete profile with skills, experience, and a resume link helps our AI rank you higher for matching jobs.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>
        </div>
    );
}