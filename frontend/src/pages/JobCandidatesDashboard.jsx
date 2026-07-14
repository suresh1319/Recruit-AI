import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Search, Mail, UserCircle, CheckCircle2,
    Loader2, Bot, ThumbsDown, ArrowUpDown, Filter, Sparkles,
    SlidersHorizontal, Check, X, ShieldAlert, GraduationCap, Clock, Award,
    Download
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/lib/api';
import RecruiterLayout from './components/RecruiterLayout';

export default function JobCandidatesDashboard({ jobId: propJobId, onBack }) {
    const { id: paramId } = useParams();
    const id = propJobId || paramId;
    const navigate = useNavigate();

    const [job, setJob] = useState(null);
    const [appliedCandidates, setAppliedCandidates] = useState([]);
    const [recommendedCandidates, setRecommendedCandidates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter, Search and Sort States
    const [activeTab, setActiveTab] = useState('applied'); // 'applied' or 'recommended'
    const [searchQuery, setSearchQuery] = useState('');
    const [skillQuery, setSkillQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, shortlisted, pending, invited, rejected
    const [sortBy, setSortBy] = useState('score-desc'); // score-desc, score-asc, name-asc, date-desc

    // Actions loading state
    const [matchingJobId, setMatchingJobId] = useState(null);
    const [sendingInviteId, setSendingInviteId] = useState(null);

    const maskEmail = (email) => {
        if (!email) return 'N/A';
        const parts = email.split('@');
        if (parts.length !== 2) return email;
        const name = parts[0];
        const domain = parts[1];
        if (name.length <= 2) return `${name.charAt(0)}***@${domain}`;
        return `${name.substring(0, 1)}***${name.substring(name.length - 1)}@${domain}`;
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs/${id}/matched-candidates`);
            if (response.ok) {
                const data = await response.json();
                setJob(data.job || null);
                setAppliedCandidates(data.applied || []);
                setRecommendedCandidates(data.recommended || []);
            } else {
                toast.error("Failed to load candidates data.");
                navigate(-1);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error("Network error while fetching candidates.");
            navigate(-1);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    // Match algorithm execution
    const handleMatchCandidates = async () => {
        setMatchingJobId(id);
        const toastId = toast.loading('Running AI candidate matching...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs/${id}/match-candidates`, {
                method: 'POST'
            });
            if (response.ok) {
                toast.success('AI matching process completed!', { id: toastId });
                fetchData();
            } else {
                const err = await response.json();
                toast.error(err.error || 'Failed to match candidates.', { id: toastId });
            }
        } catch (error) {
            console.error('Match error:', error);
            toast.error('Network error during matching.', { id: toastId });
        } finally {
            setMatchingJobId(null);
        }
    };

    const handleExportExcel = () => {
        if (!processedCandidates.length) {
            toast.error('No candidates to export');
            return;
        }

        // CSV Header
        const headers = ['Name', 'Email', 'Phone', 'Match Score %', 'Status', 'Applied Date', 'Skills', 'Experience Summary'];
        
        // CSV Rows
        const rows = processedCandidates.map(c => [
            c.name || '',
            c.email || '',
            c.phone || '',
            c.matchScore ? `${c.matchScore}%` : 'N/A',
            c.status || 'pending',
            c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A',
            (c.skills || []).join('; '),
            (c.experienceSummary || '').replace(/"/g, '""')
        ]);

        // Construct CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${val}"`).join(','))
        ].join('\n');

        // Trigger file download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${job?.title || 'candidates'}_pipeline_${new Date().toLocaleDateString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Candidates pipeline exported to Excel/CSV successfully!');
    };

    // Invite candidate trigger
    const handleSendInvite = async (candidateId) => {
        setSendingInviteId(candidateId);
        const toastId = toast.loading('Sending interview invite...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/candidates/${candidateId}/send-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: id })
            });
            if (response.ok) {
                toast.success('Invite sent successfully!', { id: toastId });
                fetchData();
            } else {
                const err = await response.json();
                toast.error(err.error || 'Failed to send invite.', { id: toastId });
            }
        } catch (error) {
            console.error('Invite error:', error);
            toast.error('Network error while inviting.', { id: toastId });
        } finally {
            setSendingInviteId(null);
        }
    };

    // Reject candidate trigger
    const handleRejectCandidate = async (candidateId) => {
        const toastId = toast.loading('Rejecting candidate...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/candidates/${candidateId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected', jobId: id })
            });
            if (response.ok) {
                toast.success('Candidate status updated to rejected', { id: toastId });
                fetchData();
            } else {
                toast.error('Failed to update candidate status.', { id: toastId });
            }
        } catch (error) {
            console.error('Reject error:', error);
            toast.error('Network error.', { id: toastId });
        }
    };

    // Reconsider candidate trigger
    const handleReconsiderCandidate = async (candidateId) => {
        const toastId = toast.loading('Updating candidate status...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/candidates/${candidateId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'pending', jobId: id })
            });
            if (response.ok) {
                toast.success('Candidate status reset to applied', { id: toastId });
                fetchData();
            } else {
                toast.error('Failed to update candidate status.', { id: toastId });
            }
        } catch (error) {
            console.error('Reconsider error:', error);
            toast.error('Network error.', { id: toastId });
        }
    };

    // Skill Gap Comparison Helper
    const renderSkillGap = (candidateSkills, jobRequirements) => {
        if (!jobRequirements || jobRequirements.length === 0) return null;

        return (
            <div className="mt-3">
                <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Requirement Fit</h5>
                <div className="flex flex-wrap gap-1.5">
                    {jobRequirements.map((reqSkill, idx) => {
                        const hasSkill = candidateSkills?.some(s =>
                            s.toLowerCase().includes(reqSkill.toLowerCase()) ||
                            reqSkill.toLowerCase().includes(s.toLowerCase())
                        );

                        return (
                            <span
                                key={idx}
                                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all flex items-center gap-1 ${
                                    hasSkill
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800 border-dashed'
                                }`}
                            >
                                <span className={hasSkill ? 'text-emerald-500' : 'text-rose-500'}>
                                    {hasSkill ? '✓' : '✗'}
                                </span>
                                {reqSkill}
                            </span>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Filter, Search, and Sort Logic
    const currentList = activeTab === 'applied' ? appliedCandidates : recommendedCandidates;

    const processedCandidates = currentList
        .filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesSkills = skillQuery === '' || c.skills?.some(s =>
                s.toLowerCase().includes(skillQuery.toLowerCase())
            );

            if (!matchesSearch || !matchesSkills) return false;

            if (activeTab === 'applied') {
                if (statusFilter === 'all') return true;
                if (statusFilter === 'shortlisted') return c.matchScore > 75;
                if (statusFilter === 'pending') return c.status === 'pending';
                if (statusFilter === 'invited') return ['invited', 'sending', 'Invited'].includes(c.status);
                if (statusFilter === 'rejected') return c.status === 'rejected';
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'score-desc') return (b.matchScore || 0) - (a.matchScore || 0);
            if (sortBy === 'score-asc') return (a.matchScore || 0) - (b.matchScore || 0);
            if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
            if (sortBy === 'date-desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            return 0;
        });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                <p className="text-slate-500 text-xs font-medium">Fetching candidates dashboard...</p>
            </div>
        );
    }

    const content = (
            <div className="py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
                <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Back Link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {onBack ? (
                            <Button
                                variant="ghost"
                                className="hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors gap-2 w-fit dark:text-slate-300"
                                onClick={onBack}
                            >
                                <ChevronLeft size={16} />
                                Back to Jobs
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    className="hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors gap-2 w-fit dark:text-slate-300"
                                    onClick={() => navigate(`/job/${id}`)}
                                >
                                    <ChevronLeft size={16} />
                                    Job Details
                                </Button>
                                <span className="text-slate-300 dark:text-slate-700">/</span>
                                <Button
                                    variant="ghost"
                                    className="hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors gap-2 w-fit dark:text-slate-300"
                                    onClick={() => navigate('/dashboard?tab=jobs')}
                                >
                                    Back to Jobs
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleExportExcel}
                            variant="outline"
                            className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 font-bold shadow-sm"
                        >
                            <Download size={16} />
                            Export Excel
                        </Button>
                        <Button
                            disabled={matchingJobId !== null}
                            onClick={handleMatchCandidates}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-sm"
                        >
                            {matchingJobId !== null ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Bot className="h-4 w-4" />
                            )}
                            {matchingJobId !== null ? 'Matching AI...' : 'Recalculate AI Match Scores'}
                        </Button>
                    </div>
                </div>

                {/* Job Title and stats summary */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">Candidate Sourcing</span>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-950 dark:text-white mt-1 pr-4">{job?.title}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage pipeline, send invites, and view potential AI suggestions.</p>
                    </div>
                    
                    <div className="flex gap-4 shrink-0">
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 px-4 py-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-center">
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{appliedCandidates.length}</div>
                            <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Total Applied</div>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 text-center">
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {appliedCandidates.filter(c => c.matchScore > 75).length + recommendedCandidates.length}
                            </div>
                            <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">Strong Matches</div>
                        </div>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-1.5 shadow-sm">
                    <button
                        onClick={() => {
                            setActiveTab('applied');
                            setStatusFilter('all');
                        }}
                        className={`flex-1 px-6 py-3 font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'applied'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <GraduationCap size={16} />
                        Applied Candidates
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'applied' ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                            {appliedCandidates.length}
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('recommended');
                            setStatusFilter('all');
                        }}
                        className={`flex-1 px-6 py-3 font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'recommended'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <Bot size={16} />
                        Recommended matches (AI Suggestions)
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'recommended' ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                            {recommendedCandidates.length}
                        </span>
                    </button>
                </div>

                {/* Filter and Sorting Options toolbar */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search Name */}
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name or email..."
                                className="pl-9 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                            />
                        </div>

                        {/* Search Skill */}
                        <div className="relative">
                            <SlidersHorizontal className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                value={skillQuery}
                                onChange={e => setSkillQuery(e.target.value)}
                                placeholder="Search by skill (e.g. React)..."
                                className="pl-9 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                            />
                        </div>

                        {/* Sort options */}
                        <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg px-3 dark:bg-slate-950">
                            <ArrowUpDown size={16} className="text-slate-400" />
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-300 focus:outline-none border-0 h-10 cursor-pointer"
                            >
                                <option value="score-desc">Score: High to Low</option>
                                <option value="score-asc">Score: Low to High</option>
                                <option value="name-asc">Name: A to Z</option>
                                <option value="date-desc">Date Applied: Newest</option>
                            </select>
                        </div>
                    </div>

                    {/* Status filter bar (Only for applied candidates) */}
                    {activeTab === 'applied' && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
                                <Filter size={12} /> Filter:
                            </span>
                            {[
                                { id: 'all', label: 'All Candidates' },
                                { id: 'shortlisted', label: 'Shortlisted (>75%)' },
                                { id: 'pending', label: 'Pending review' },
                                { id: 'invited', label: 'Invited for interview' },
                                { id: 'rejected', label: 'Rejected applications' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setStatusFilter(f.id)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                        statusFilter === f.id
                                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Candidate list rendering */}
                {processedCandidates.length === 0 ? (
                    <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-sm">
                        <ShieldAlert className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-slate-700 dark:text-slate-300 font-bold text-base">No candidates found in this list</p>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 max-w-sm">No profiles matched your filter, search, or status conditions.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {processedCandidates.map(candidate => (
                            <Card key={candidate._id} className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden bg-white dark:bg-slate-900/50">
                                <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
                                    {/* Left Panel: Profile Detail */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight">{candidate.name}</h4>
                                            
                                            {/* Status Badge */}
                                            {activeTab === 'applied' && (() => {
                                                const s = candidate.status?.toLowerCase();
                                                if (s === 'rejected') {
                                                    return (
                                                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[10px] font-bold uppercase rounded-full">
                                                            Rejected
                                                        </span>
                                                    );
                                                }
                                                if (['invited', 'sending', 'Invited'].includes(candidate.status)) {
                                                    return (
                                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                                                            <CheckCircle2 size={10} /> Invited for Interview
                                                        </span>
                                                    );
                                                }
                                                if (s === 'called') {
                                                    return (
                                                        <span className="px-2 py-0.5 bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 border border-teal-200 dark:border-teal-800 text-[10px] font-bold uppercase rounded-full">
                                                            Interview Done
                                                        </span>
                                                    );
                                                }
                                                if (s === 'scheduled') {
                                                    return (
                                                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-[10px] font-bold uppercase rounded-full">
                                                            Interview Scheduled
                                                        </span>
                                                    );
                                                }
                                                if (s === 'selected') {
                                                    return (
                                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase rounded-full">
                                                            Selected 🎉
                                                        </span>
                                                    );
                                                }
                                                if (s === 'matched') {
                                                    return (
                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold uppercase rounded-full">
                                                            Shortlisted
                                                        </span>
                                                    );
                                                }
                                                if (candidate.matchScore > 75) {
                                                    return (
                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold uppercase rounded-full">
                                                            Shortlisted
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase rounded">
                                                        Applied
                                                    </span>
                                                );
                                            })()}

                                            {activeTab === 'recommended' && (
                                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[10px] font-bold uppercase rounded-full flex items-center gap-0.5">
                                                    <Sparkles size={10} /> AI Recommendation
                                                </span>
                                            )}

                                            {candidate.interview && (
                                                <>
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full flex items-center gap-1.5 ${
                                                        candidate.interview.status === 'Completed' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' :
                                                        candidate.interview.status === 'Ongoing' ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
                                                        'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                                                    }`}>
                                                        <Bot size={11} /> Interview: {candidate.interview.status}
                                                    </span>
                                                    {candidate.interview.status === 'Completed' && candidate.interview.recommendation && (
                                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                                                            candidate.interview.recommendation === 'Recommended' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                                                            candidate.interview.recommendation === 'Not Recommended' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' :
                                                            'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                                        }`}>
                                                            AI Verdict: {candidate.interview.recommendation}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {maskEmail(candidate.email)} • {candidate.phone || 'No phone number provided'}
                                        </p>

                                        {candidate.experienceSummary && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                                                "{candidate.experienceSummary}"
                                            </p>
                                        )}

                                        {/* Skill Gap Matrix */}
                                        {renderSkillGap(candidate.skills, job?.requirements)}
                                    </div>

                                    {/* Right Panel: AI Match score, Action Buttons */}
                                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                                        <div className="text-right">
                                            <div className={`text-3xl font-extrabold tracking-tight ${
                                                candidate.matchScore > 85 ? 'text-emerald-600 dark:text-emerald-400' :
                                                candidate.matchScore > 70 ? 'text-amber-500' :
                                                                            'text-slate-400'
                                            }`}>
                                                {candidate.matchScore ? `${candidate.matchScore}%` : 'N/A'}
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">AI Match Score</div>
                                        </div>

                                        {/* Actions row */}
                                        <div className="flex items-center gap-2 flex-wrap md:justify-end">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs rounded-lg flex items-center gap-1.5 transition-all"
                                                onClick={() => navigate(`/candidate/${candidate._id}`)}
                                            >
                                                <UserCircle size={14} /> Profile
                                            </Button>

                                            {candidate.interview?.status === 'Completed' && candidate.interview?.interviewId && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs rounded-lg flex items-center gap-1.5 font-bold shadow-sm transition-all"
                                                    onClick={() => navigate(`/report/${candidate.interview.interviewId}`)}
                                                >
                                                    <Bot size={14} /> View AI Report
                                                </Button>
                                            )}

                                            {/* Invite button */}
                                            {activeTab === 'applied' && ['Screening Pending', 'pending', 'matched', 'invited', 'called', 'scheduled'].includes(candidate.status) && (
                                                <Button
                                                    size="sm"
                                                    disabled={sendingInviteId === candidate._id}
                                                    onClick={() => handleSendInvite(candidate._id)}
                                                    className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
                                                >
                                                    {sendingInviteId === candidate._id ? (
                                                        <Loader2 size={13} className="animate-spin" />
                                                    ) : (
                                                        <Mail size={13} />
                                                    )}
                                                    {candidate.interviewLink || ['invited', 'called', 'scheduled'].includes(candidate.status) ? 'Invite Again' : 'Send Invite'}
                                                </Button>
                                            )}

                                            {/* Potential Candidate Actions */}
                                            {activeTab === 'recommended' && (
                                                <Button
                                                    size="sm"
                                                    disabled={sendingInviteId === candidate._id}
                                                    onClick={() => handleSendInvite(candidate._id)}
                                                    className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <Mail size={13} /> Direct Sourcing Invite
                                                </Button>
                                            )}

                                            {/* Reconsider rejected candidate */}
                                            {activeTab === 'applied' && candidate.status === 'rejected' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleReconsiderCandidate(candidate._id)}
                                                    className="h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-950/20 text-xs rounded-lg"
                                                >
                                                    Reconsider
                                                </Button>
                                            )}

                                            {/* Reject active/applied candidate */}
                                            {activeTab === 'applied' && candidate.status !== 'rejected' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleRejectCandidate(candidate._id)}
                                                    className="h-8 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/20 text-xs rounded-lg flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <ThumbsDown size={13} /> Reject
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
                </div>
            </div>
    );

    if (propJobId) {
        return content;
    }

    return (
        <RecruiterLayout activeTab="jobs">
            {content}
        </RecruiterLayout>
    );
}
