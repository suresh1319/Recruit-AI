import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BriefcaseBusiness, Plus, MoreVertical, Loader2, MapPin, Building2, Clock, Bot, Mail, X, Users, DollarSign, CheckCircle2, ExternalLink, UserCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { maskEmail } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';

export default function JobsTab() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [jobPrompt, setJobPrompt] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        department: '',
        workType: '',
        city: '',
        employmentType: 'Full-time',
        experienceLevel: 'Mid',
        salaryMin: '',
        salaryMax: '',
        currency: 'USD',
        period: 'year',
        description: '',
        responsibilities: '',
        requirements: '',
        benefits: '',
        status: 'draft'
    });
    const [selectedJob, setSelectedJob] = useState(null);
    const [candidateData, setCandidateData] = useState({ applied: [], matched: [] });
    const [showCandidatesModal, setShowCandidatesModal] = useState(false);
    const [matchingJobId, setMatchingJobId] = useState(null);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        if (!user) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs?clerkId=${user.id}`);
            const data = await response.json();
            setJobs(data);
        } catch (error) {
            console.error('Fetch jobs error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoFill = async () => {
        if (!jobPrompt.trim()) return;

        setIsGenerating(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: jobPrompt })
            });

            const data = await response.json();
            if (response.ok) {
                const workType = ['Work from Home', 'On-site', 'Hybrid'].includes(data.workType)
                    ? data.workType
                    : data.location?.toLowerCase?.().includes('remote')
                        ? 'Work from Home'
                        : formData.workType;

                setFormData(prev => ({
                    ...prev,
                    title: data.title || '',
                    department: data.department || '',
                    workType: workType || '',
                    city: workType === 'Work from Home' ? '' : (data.city || data.location || ''),
                    employmentType: data.employmentType || data.type || 'Full-time',
                    experienceLevel: data.experienceLevel || 'Mid',
                    salaryMin: data.salaryMin ? String(data.salaryMin) : '',
                    salaryMax: data.salaryMax ? String(data.salaryMax) : '',
                    currency: data.currency || 'USD',
                    period: data.period || 'year',
                    description: data.description || '',
                    responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities.join(', ') : (data.responsibilities || ''),
                    requirements: Array.isArray(data.requirements) ? data.requirements.join(', ') : (data.requirements || ''),
                    benefits: Array.isArray(data.benefits) ? data.benefits.join(', ') : (data.benefits || ''),
                    status: 'draft'
                }));
                toast.success('Job details generated. Review them before creating the job.');
            } else {
                toast.error(data.error || 'Failed to generate job details.');
            }
        } catch (error) {
            console.error('Auto-fill error:', error);
            toast.error('Failed to generate job details.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.workType) {
            toast.error('Please select a Work Type (Work from Home, On-site, or Hybrid).');
            return;
        }
        if ((formData.workType === 'On-site' || formData.workType === 'Hybrid') && !formData.city.trim()) {
            toast.error(`Please enter the city/location for ${formData.workType} work.`);
            return;
        }

        const locationValue = formData.workType === 'Work from Home'
            ? 'Remote'
            : `${formData.workType} · ${formData.city.trim()}`;

        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clerkId: user.id,
                    title: formData.title,
                    department: formData.department,
                    location: locationValue,
                    employmentType: formData.employmentType,
                    experienceLevel: formData.experienceLevel,
                    salaryRange: {
                        min: formData.salaryMin ? Number(formData.salaryMin) : undefined,
                        max: formData.salaryMax ? Number(formData.salaryMax) : undefined,
                        currency: formData.currency,
                        period: formData.period
                    },
                    description: formData.description,
                    responsibilities: formData.responsibilities.split(',').map(r => r.trim()).filter(r => r),
                    requirements: formData.requirements.split(',').map(r => r.trim()).filter(r => r),
                    benefits: formData.benefits.split(',').map(b => b.trim()).filter(b => b),
                    status: formData.status
                })
            });
            if (response.ok) {
                fetchJobs();
                setIsModalOpen(false);
                setFormData({
                    title: '',
                    department: '',
                    workType: '',
                    city: '',
                    employmentType: 'Full-time',
                    experienceLevel: 'Mid',
                    salaryMin: '',
                    salaryMax: '',
                    currency: 'USD',
                    period: 'year',
                    description: '',
                    responsibilities: '',
                    requirements: '',
                    benefits: '',
                    status: 'draft'
                });
            }
        } catch (error) {
            console.error('Create job error:', error);
        }
    };

    const handleStatusChange = async (jobId, newStatus) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                fetchJobs();
            }
        } catch (error) {
            console.error('Status update error:', error);
        }
    };

    const handleMatchCandidates = async (jobId) => {
        setMatchingJobId(jobId);
        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/match-candidates`, {
                method: 'POST'
            });
            if (response.ok) {
                const data = await response.json();
                const job = jobs.find(j => j._id === jobId);
                const appliedIds = job?.candidatesApplied || [];
                const newMatches = data.matches?.filter(m => 
                    m.matchScore > 75 && !appliedIds.includes(m.candidateId)
                ) || [];
                
                if (newMatches.length > 0) {
                    toast.success(`Found ${newMatches.length} new high-score suggestions!`);
                } else {
                    toast.info("No new high-score candidates found matching this role.");
                }
                fetchJobs();
            } else {
                const errorData = await response.json();
                toast.error(`Failed to match: ${errorData.error || 'Server error'}`);
            }
        } catch (error) {
            console.error('Match error:', error);
            toast.error('Failed to match candidates');
        } finally {
            setMatchingJobId(null);
        }
    };

    const handleViewCandidates = async (job) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs/${job._id}/matched-candidates`);
            if (response.ok) {
                const data = await response.json();
                // If it's the old array format (fallback), handle it gracefully
                if (Array.isArray(data)) {
                    setCandidateData({ applied: data, matched: [] });
                } else {
                    setCandidateData(data);
                }
                setSelectedJob(job);
                setShowCandidatesModal(true);
            }
        } catch (error) {
            console.error('Fetch matched candidates error:', error);
        }
    };

    const renderCandidateCard = (candidate) => (
        <div key={candidate._id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{candidate.name}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{maskEmail(candidate.email)}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                        <div className="text-lg font-bold text-indigo-600">
                            {candidate.jobMatchScores?.find(s => 
                                (s.jobId?._id || s.jobId)?.toString() === selectedJob?._id?.toString()
                            )?.score || candidate.matchScore || 0}%
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Match Score</div>
                    </div>
                    {['Screening Pending', 'pending', 'matched'].includes(candidate.status) && (
                        <div className="flex flex-col gap-2 mt-2">
                            <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-1.5 h-8 w-full"
                                onClick={async () => {
                                    try {
                                        const response = await fetch(`${API_BASE_URL}/api/candidates/${candidate._id}/send-invite`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ jobId: selectedJob._id })
                                        });
                                        if (response.ok) {
                                            const data = await response.json();
                                            toast.success(`Invite sent! Link: ${data.interviewLink}`);
                                            fetchJobs();
                                        }
                                    } catch (error) {
                                        console.error('Send invite error:', error);
                                    }
                                }}
                            >
                                <Mail size={14} /> Send Invite
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg gap-1.5 h-8 w-full transition-colors"
                                onClick={() => {
                                    setShowCandidatesModal(false);
                                    navigate(`/candidate/${candidate._id}`);
                                }}
                            >
                                <UserCircle size={14} /> View Profile
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                <BriefcaseBusiness size={14} className="text-slate-400" />
                {candidate.role}
            </div>
            {candidate.skills && candidate.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {candidate.skills.slice(0, 5).map((skill, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded">
                            {skill}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Jobs Management</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Create and manage your open roles and candidate pipelines.</p>
                </div>
                <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2"
                    onClick={() => setIsModalOpen(true)}
                >
                    <Plus size={18} />
                    Create New Job
                </Button>
            </div>

            {isLoading ? (
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {jobs.map((job) => (
                        <Card key={job._id} className="p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900/50">
                            {job.status === 'closed' && (
                                <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-950/50 z-10 pointer-events-none" />
                            )}
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:dark:bg-indigo-500 group-hover:text-white transition-colors">
                                        <BriefcaseBusiness size={20} />
                                    </div>
                                    <select
                                        value={job.status}
                                        onChange={(e) => handleStatusChange(job._id, e.target.value)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border-0 cursor-pointer ${job.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' :
                                            job.status === 'draft' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' :
                                                'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                                            }`}
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                    </select>
                                </div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-1">{job.title}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{job.description}</p>

                                <div className="space-y-2 mb-4">
                                    {job.location && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <MapPin size={14} className="text-slate-400" />
                                            {job.location}
                                        </div>
                                    )}
                                    {job.department && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Building2 size={14} className="text-slate-400" />
                                            {job.department}
                                        </div>
                                    )}
                                    {job.salaryRange?.min && job.salaryRange?.max && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <DollarSign size={14} className="text-slate-400" />
                                            {job.salaryRange.currency === 'INR' ? '₹' : '$'}{job.salaryRange.min.toLocaleString()} - {job.salaryRange.currency === 'INR' ? '₹' : '$'}{job.salaryRange.max.toLocaleString()} / {job.salaryRange.period || 'year'}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Users size={14} className="text-slate-400" />
                                        {job.candidatesApplied?.length || 0} Applied / {job.candidatesMatched?.length || 0} Matched
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 z-20">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-700 gap-2 min-w-[100px]"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMatchCandidates(job._id);
                                        }}
                                        disabled={matchingJobId === job._id}
                                    >
                                        {matchingJobId === job._id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Bot size={14} />
                                        )}
                                        {matchingJobId === job._id ? "Matching..." : "Match"}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/job/${job._id}`);
                                        }}
                                    >
                                        <ExternalLink size={14} /> Details
                                    </Button>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 transition-colors"
                                    onClick={() => handleViewCandidates(job)}
                                >
                                    <Users size={14} /> View Candidates ({(job.candidatesApplied?.length || 0) + (job.candidatesMatched?.filter(c => c.matchScore > 75).length || 0)})
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Job Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-3xl bg-white dark:bg-slate-900 shadow-xl border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add New Job</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Use AI to auto-fill details or enter them manually.</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </Button>
                        </div>
                        <form onSubmit={handleCreateJob} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-4 space-y-3 overflow-y-auto">
                                {/* AI Auto-fill Section */}
                                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bot className="text-indigo-600 dark:text-indigo-400" size={18} />
                                        <Label className="text-indigo-900 dark:text-indigo-200 text-sm font-bold">Auto-fill with AI</Label>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            value={jobPrompt}
                                            onChange={e => setJobPrompt(e.target.value)}
                                            placeholder="e.g. Full Stack Java Developer"
                                            className="flex-1 h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleAutoFill}
                                            disabled={isGenerating || !jobPrompt.trim()}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4"
                                        >
                                            {isGenerating ? (
                                                <><Loader2 size={14} className="animate-spin mr-1" /> Generating...</>
                                            ) : (
                                                'Generate'
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Label className="text-slate-700 dark:text-slate-200 text-sm font-bold mb-3 block">Job Details</Label>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Job Title *</Label>
                                        <Input
                                            required
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="e.g. Senior React Developer"
                                            className="h-9 dark:bg-slate-950 dark:border-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Department</Label>
                                        <Input
                                            value={formData.department}
                                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                                            placeholder="e.g. Engineering"
                                            className="h-9 dark:bg-slate-950 dark:border-slate-800"
                                        />
                                    </div>
                                </div>

                                {/* Location — mandatory */}
                                <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Work Type *</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['Work from Home', 'On-site', 'Hybrid'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, workType: type, city: type === 'Work from Home' ? '' : formData.city })}
                                                className={`h-9 rounded-md text-xs font-semibold border-2 transition-all ${formData.workType === type
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-indigo-400'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                    {(formData.workType === 'On-site' || formData.workType === 'Hybrid') && (
                                        <div className="mt-1">
                                            <Input
                                                required
                                                value={formData.city}
                                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                placeholder="Enter city / office location *"
                                                className="h-9 border-indigo-300 focus:border-indigo-500"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Type</Label>
                                        <select
                                            value={formData.employmentType}
                                            onChange={e => setFormData({ ...formData, employmentType: e.target.value })}
                                            className="w-full h-9 px-3 rounded-md border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                                        >
                                            <option>Full-time</option>
                                            <option>Part-time</option>
                                            <option>Contract</option>
                                            <option>Internship</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Level</Label>
                                        <select
                                            value={formData.experienceLevel}
                                            onChange={e => setFormData({ ...formData, experienceLevel: e.target.value })}
                                            className="w-full h-9 px-3 rounded-md border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                                        >
                                            <option>Entry</option>
                                            <option>Mid</option>
                                            <option>Senior</option>
                                            <option>Lead</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Min Salary</Label>
                                        <Input
                                            type="number"
                                            value={formData.salaryMin}
                                            onChange={e => setFormData({ ...formData, salaryMin: e.target.value })}
                                            placeholder="80000"
                                            className="h-9 dark:bg-slate-950 dark:border-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Max Salary</Label>
                                        <Input
                                            type="number"
                                            value={formData.salaryMax}
                                            onChange={e => setFormData({ ...formData, salaryMax: e.target.value })}
                                            placeholder="120000"
                                            className="h-9 dark:bg-slate-950 dark:border-slate-800"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Currency</Label>
                                        <select
                                            value={formData.currency}
                                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full h-9 px-3 rounded-md border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                                        >
                                            <option value="USD">Dollars (USD)</option>
                                            <option value="INR">Rupees (INR)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Period</Label>
                                        <select
                                            value={formData.period}
                                            onChange={e => setFormData({ ...formData, period: e.target.value })}
                                            className="w-full h-9 px-3 rounded-md border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                                        >
                                            <option value="year">Per Year</option>
                                            <option value="month">Per Month</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Job Status</Label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full h-9 px-3 rounded-md border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Description *</Label>
                                    <Textarea
                                        required
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Job description..."
                                        className="h-16 resize-none text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Responsibilities (comma separated)</Label>
                                    <Textarea
                                        value={formData.responsibilities}
                                        onChange={e => setFormData({ ...formData, responsibilities: e.target.value })}
                                        placeholder="Lead development, Code reviews, Mentor team"
                                        className="h-14 resize-none text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Requirements (comma separated)</Label>
                                    <Textarea
                                        value={formData.requirements}
                                        onChange={e => setFormData({ ...formData, requirements: e.target.value })}
                                        placeholder="React, Node.js, 5+ years experience"
                                        className="h-14 resize-none text-sm dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium">Benefits (comma separated)</Label>
                                    <Input
                                        value={formData.benefits}
                                        onChange={e => setFormData({ ...formData, benefits: e.target.value })}
                                        placeholder="Health insurance, 401k, Remote work"
                                        className="h-9 dark:bg-slate-950 dark:border-slate-800"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                                <Button type="button" variant="outline" className="dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Create Job</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Matched Candidates Modal */}
            {
                showCandidatesModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-3xl bg-white dark:bg-slate-900 shadow-xl border-slate-200 dark:border-slate-800 max-h-[80vh] flex flex-col">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Matched Candidates</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedJob?.title} - {(candidateData.applied?.length || 0) + (candidateData.matched?.length || 0)} candidates</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setShowCandidatesModal(false)}>
                                    <X size={20} />
                                </Button>
                            </div>
                            <div className="p-4 overflow-y-auto space-y-6">
                                {/* Applied Candidates Section */}
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <CheckCircle2 className="text-emerald-500" size={18} />
                                        <h4 className="font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider text-xs">Applied Candidates ({candidateData.applied.length})</h4>
                                    </div>
                                    {candidateData.applied.length > 0 ? (
                                        <div className="space-y-3">
                                            {candidateData.applied.map((candidate) => renderCandidateCard(candidate))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic py-2">No candidates have applied yet.</p>
                                    )}
                                </section>

                                <hr className="border-slate-100 dark:border-slate-800" />

                                {/* Potential Matches Section */}
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Bot className="text-indigo-500" size={18} />
                                        <h4 className="font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider text-xs">Potential Matches (AI Suggestions) ({
                                            candidateData.matched.filter(c => {
                                                const scoreObj = c.jobMatchScores?.find(s => 
                                                    (s.jobId?._id || s.jobId)?.toString() === selectedJob?._id?.toString()
                                                );
                                                const score = scoreObj ? scoreObj.score : (c.matchScore || 0);
                                                return score > 75;
                                            }).length
                                        })</h4>
                                    </div>
                                    {candidateData.matched.filter(c => {
                                        const scoreObj = c.jobMatchScores?.find(s => 
                                            (s.jobId?._id || s.jobId)?.toString() === selectedJob?._id?.toString()
                                        );
                                        const score = scoreObj ? scoreObj.score : (c.matchScore || 0);
                                        return score > 75 && !candidateData.applied.some(a => a._id === c._id);
                                    }).length > 0 ? (
                                        <div className="space-y-3">
                                            {candidateData.matched
                                                .filter(c => {
                                                    const scoreObj = c.jobMatchScores?.find(s => 
                                                        (s.jobId?._id || s.jobId)?.toString() === selectedJob?._id?.toString()
                                                    );
                                                    const score = scoreObj ? scoreObj.score : (c.matchScore || 0);
                                                    return score > 75 && !candidateData.applied.some(a => a._id === c._id);
                                                })
                                                .map((candidate) => renderCandidateCard(candidate))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic py-2">No high-matching potential candidates found.</p>
                                    )}
                                </section>
                            </div>
                        </Card >
                    </div >
                )
            }
        </div >
    );
}
