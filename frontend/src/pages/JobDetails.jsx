import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    BriefcaseBusiness, MapPin, Building2, Clock, DollarSign,
    ChevronLeft, Share2, Bookmark, CheckCircle2,
    Users, Calendar, GraduationCap, Edit, X,
    Mail, UserCircle, AlertCircle, Search, Loader2, Bot, ThumbsDown, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import RecruiterLayout from './components/RecruiterLayout';
import CandidateLayout from './components/CandidateLayout';

export default function JobDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [job, setJob] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { user, isLoaded: isUserLoaded } = useUser();
    const [userRole, setUserRole] = useState(null);
    const [isRoleLoading, setIsRoleLoading] = useState(true);
    const [candidateProfile, setCandidateProfile] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [formData, setFormData] = useState(null);
    const [isApplying, setIsApplying] = useState(false);

    // Candidates pipeline states
    const [candidates, setCandidates] = useState([]);
    const [isCandidatesLoading, setIsCandidatesLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
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

    const fetchCandidates = async () => {
        setIsCandidatesLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs/${id}/matched-candidates`);
            if (response.ok) {
                const data = await response.json();
                setCandidates(data.candidates || []);
            }
        } catch (error) {
            console.error('Fetch matched candidates error:', error);
        } finally {
            setIsCandidatesLoading(false);
        }
    };

    // Auto-match trigger
    const [matchingJobId, setMatchingJobId] = useState(null);
    const handleMatchCandidates = async () => {
        setMatchingJobId(id);
        const toastId = toast.loading('Running AI candidate matching...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs/${id}/match-candidates`, {
                method: 'POST'
            });
            if (response.ok) {
                toast.success('AI matching process complete!', { id: toastId });
                fetchJobDetails();
                fetchCandidates();
            } else {
                const err = await response.json();
                toast.error(err.error || 'Failed to match candidates.', { id: toastId });
            }
        } catch (error) {
            console.error('Match error:', error);
            toast.error('Network error while matching.', { id: toastId });
        } finally {
            setMatchingJobId(null);
        }
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
                fetchCandidates();
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
            // We can call candidate status update endpoint or candidates endpoint
            const response = await fetch(`${API_BASE_URL}/api/candidates/${candidateId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' })
            });
            if (response.ok) {
                toast.success('Candidate status updated to rejected', { id: toastId });
                fetchCandidates();
            } else {
                toast.error('Failed to update candidate status.', { id: toastId });
            }
        } catch (error) {
            console.error('Reject error:', error);
            toast.error('Network error.', { id: toastId });
        }
    };

    useEffect(() => {
        if (isUserLoaded) {
            fetchJobDetails();
            if (user) {
                fetchUserRole();
            } else {
                setIsRoleLoading(false);
            }
        }
    }, [id, user, isUserLoaded]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'candidates') {
            navigate(`/job/${id}/candidates`, { replace: true });
        } else if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams, id]);

    useEffect(() => {
        if (userRole === 'recruiter') {
            fetchCandidates();
        }
    }, [userRole, id]);

    const fetchUserRole = async () => {
        setIsRoleLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me?clerkId=${user.id}`);
            if (response.ok) {
                const data = await response.json();
                setUserRole(data.role);
                
                if (data.role === 'candidate') {
                    const candRes = await fetch(`${API_BASE_URL}/api/candidates/me?clerkId=${user.id}`);
                    if (candRes.ok) {
                        const candData = await candRes.json();
                        setCandidateProfile(candData);
                    }
                }
            }
        } catch (error) {
            console.error('Fetch user role error:', error);
        } finally {
            setIsRoleLoading(false);
        }
    };

    const handleApply = async () => {
        if (!user) {
            toast.error("Please sign in to apply.");
            return;
        }

        setIsApplying(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/jobs/${id}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clerkId: user.id })
            });

            if (res.ok) {
                toast.success('Successfully applied!');
                fetchJobDetails();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to apply');
            }
        } catch (error) {
            console.error('Apply error:', error);
            toast.error('Network error during application');
        } finally {
            setIsApplying(false);
        }
    };

    const fetchJobDetails = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`);
            if (response.ok) {
                const data = await response.json();
                setJob(data);
            } else {
                toast.error('Failed to fetch job details');
                navigate(-1);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Network error. Please try again.');
            navigate(-1);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenEdit = () => {
        let workType = '';
        let city = '';
        if (job.location === 'Remote') {
            workType = 'Work from Home';
            city = '';
        } else if (job.location) {
            const parts = job.location.split(' · ');
            if (parts.length > 1) {
                workType = parts[0];
                city = parts[1];
            } else {
                city = job.location;
                workType = 'On-site';
            }
        }

        setFormData({
            title: job.title || '',
            department: job.department || '',
            workType: workType || 'On-site',
            city: city || '',
            employmentType: job.employmentType || 'Full-time',
            experienceLevel: job.experienceLevel || 'Mid',
            salaryMin: job.salaryRange?.min || '',
            salaryMax: job.salaryRange?.max || '',
            currency: job.salaryRange?.currency || 'USD',
            period: job.salaryRange?.period || 'year',
            description: job.description || '',
            responsibilities: job.responsibilities?.join(', ') || '',
            requirements: job.requirements?.join(', ') || '',
            benefits: job.benefits?.join(', ') || '',
            status: job.status || 'draft'
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateJob = async (e) => {
        e.preventDefault();

        if (!formData.workType) {
            toast.error('Please select a Work Type.');
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
            const response = await fetch(`${API_BASE_URL}/api/jobs/${job._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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
                toast.success('Job updated successfully');
                setIsEditModalOpen(false);
                fetchJobDetails(); // Refresh job data
            } else {
                toast.error('Failed to update job');
            }
        } catch (error) {
            console.error('Update job error:', error);
            toast.error('Network error while updating.');
        }
    };

    if (isLoading || isRoleLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="text-slate-400 mb-4">
                    <Briefcase size={48} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Job Not Found</h2>
                <p className="text-slate-500 mb-6 text-center max-w-md">
                    We couldn't find the job details you're looking for. It might have been removed or the link is incorrect.
                </p>
                <Button onClick={() => navigate(-1)} className="bg-indigo-600">
                    Go Back
                </Button>
            </div>
        );
    }

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

    const Layout = userRole === 'recruiter' ? RecruiterLayout : CandidateLayout;

    return (
        <Layout activeTab="jobs">
            <div className="py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
                <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    className="mb-6 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors gap-2 dark:text-slate-300"
                    onClick={() => navigate(userRole === 'recruiter' ? '/dashboard?tab=jobs' : '/candidate-dashboard')}
                >
                    <ChevronLeft size={20} />
                    Back to Jobs
                </Button>

                {/* Recruiter Tabs */}
                {userRole === 'recruiter' && (
                    <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 bg-white dark:bg-slate-900 rounded-xl p-1.5 shadow-sm">
                        <button
                            onClick={() => {
                                setActiveTab('overview');
                                setSearchParams({ tab: 'overview' });
                            }}
                            className={`flex-1 sm:flex-initial px-6 py-3 font-semibold text-sm rounded-lg transition-all ${
                                activeTab === 'overview'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            Job Details & Info
                        </button>
                        <button
                            onClick={() => {
                                navigate(`/job/${id}/candidates`);
                            }}
                            className={`flex-1 sm:flex-initial px-6 py-3 font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800`}
                        >
                            <Users size={16} /> Candidate Pipeline
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400`}>
                                {candidates.length}
                            </span>
                        </button>
                    </div>
                )}

                {/* TAB CONTENT: Overview */}
                {(activeTab === 'overview' || userRole !== 'recruiter') && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                                <div className="p-8">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                            <BriefcaseBusiness size={32} />
                                        </div>
                                        <div className="flex gap-2">
                                            {userRole === 'recruiter' && (
                                                <Button 
                                                    variant="outline" 
                                                    className="rounded-xl border-slate-200 dark:border-slate-800 gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    onClick={handleOpenEdit}
                                                >
                                                    <Edit size={16} /> Edit
                                                </Button>
                                            )}
                                            <Button variant="outline" size="icon" className="rounded-xl border-slate-200 dark:border-slate-800 dark:text-slate-300">
                                                <Share2 size={18} />
                                            </Button>
                                            <Button variant="outline" size="icon" className="rounded-xl border-slate-200 dark:border-slate-800 dark:text-slate-300">
                                                <Bookmark size={18} />
                                            </Button>
                                        </div>
                                    </div>

                                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{job.title}</h1>

                                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-8 border-b border-slate-100 dark:border-slate-800 pb-8">
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <Building2 size={16} className="text-slate-400" />
                                            {job.department}
                                        </div>
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <MapPin size={16} className="text-slate-400" />
                                            {job.location}
                                        </div>
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <Clock size={16} className="text-slate-400" />
                                            {job.employmentType}
                                        </div>
                                        <div className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                                            {job.salaryRange?.currency === 'INR' ? '₹' : '$'}{job.salaryRange?.min?.toLocaleString()} - {job.salaryRange?.currency === 'INR' ? '₹' : '$'}{job.salaryRange?.max?.toLocaleString()} / {job.salaryRange?.period || 'year'}
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <section>
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Description</h2>
                                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {job.description}
                                            </p>
                                        </section>

                                        {job.responsibilities?.length > 0 && (
                                            <section>
                                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Responsibilities</h2>
                                                <ul className="space-y-3">
                                                    {job.responsibilities.map((item, index) => (
                                                        <li key={index} className="flex gap-3 text-slate-600 dark:text-slate-300">
                                                            <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}

                                        {job.requirements?.length > 0 && (
                                            <section>
                                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Requirements</h2>
                                                <ul className="space-y-3">
                                                    {job.requirements.map((item, index) => (
                                                        <li key={index} className="flex gap-3 text-slate-600 dark:text-slate-300">
                                                            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}

                                        {job.benefits?.length > 0 && (
                                            <section>
                                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">Benefits</h2>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {job.benefits.map((benefit, index) => (
                                                        <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                                            {benefit}
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Sidebar Stats */}
                        <div className="space-y-6">
                            <Card className="border-none shadow-sm bg-indigo-600 text-white p-6">
                                <h3 className="text-lg font-bold mb-4">Job Overview</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/10 rounded-lg">
                                            <Calendar size={18} />
                                        </div>
                                        <div>
                                            <div className="text-xs text-indigo-200">Date Posted</div>
                                            <div className="text-sm font-medium">{new Date(job.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/10 rounded-lg">
                                            <GraduationCap size={18} />
                                        </div>
                                        <div>
                                            <div className="text-xs text-indigo-200">Experience</div>
                                            <div className="text-sm font-medium">{job.experienceLevel} Level</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/10 rounded-lg">
                                            <Users size={18} />
                                        </div>
                                        <div>
                                            <div className="text-xs text-indigo-200">Applicants</div>
                                            <div className="text-sm font-medium">{job.candidatesApplied?.length || 0} People Applied</div>
                                        </div>
                                    </div>
                                </div>
                                {userRole === 'candidate' && (
                                    <Button 
                                        onClick={handleApply}
                                        disabled={isApplying || job.candidatesApplied?.includes(candidateProfile?._id)}
                                        className="w-full mt-6 bg-white text-indigo-600 hover:bg-indigo-50 font-bold h-11"
                                    >
                                        {isApplying ? 'Applying...' : job.candidatesApplied?.includes(candidateProfile?._id) ? 'Applied' : 'Apply Now'}
                                    </Button>
                                )}
                            </Card>

                            <Card className="border-none shadow-sm p-6 bg-white dark:bg-slate-900">
                                <h3 className="text-slate-900 dark:text-slate-100 font-bold mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 text-center group hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                        <Users className="mx-auto mb-2 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Similar Jobs</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 text-center group hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                        <Building2 className="mx-auto mb-2 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Company Info</div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}



                {/* Edit Job Modal */}
                {isEditModalOpen && formData && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-3xl bg-white shadow-xl max-h-[90vh] flex flex-col">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Edit Job</h3>
                                    <p className="text-xs text-slate-500">Update the job details below.</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)}>
                                    <X size={20} />
                                </Button>
                            </div>
                            <form onSubmit={handleUpdateJob} className="flex flex-col flex-1 overflow-hidden">
                                <div className="p-4 space-y-3 overflow-y-auto">
                                    <div className="pt-2">
                                        <Label className="text-slate-700 text-sm font-bold mb-3 block">Job Details</Label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-slate-700 text-xs font-medium">Job Title *</Label>
                                            <Input
                                                required
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="e.g. Senior React Developer"
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-slate-700 text-xs font-medium">Department</Label>
                                            <Input
                                                value={formData.department}
                                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                                                placeholder="e.g. Engineering"
                                                className="h-9"
                                            />
                                        </div>
                                    </div>

                                    {/* Location — mandatory */}
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 text-xs font-medium">Work Type *</Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['Work from Home', 'On-site', 'Hybrid'].map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, workType: type, city: type === 'Work from Home' ? '' : formData.city })}
                                                    className={`h-9 rounded-md text-xs font-semibold border-2 transition-all ${formData.workType === type
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
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
                                            <Label className="text-slate-700 text-xs font-medium">Type</Label>
                                            <select
                                                value={formData.employmentType}
                                                onChange={e => setFormData({ ...formData, employmentType: e.target.value })}
                                                className="w-full h-9 px-3 rounded-md border-2 border-slate-300 bg-white text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
                                            >
                                                <option>Full-time</option>
                                                <option>Part-time</option>
                                                <option>Contract</option>
                                                <option>Internship</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-slate-700 text-xs font-medium">Level</Label>
                                            <select
                                                value={formData.experienceLevel}
                                                onChange={e => setFormData({ ...formData, experienceLevel: e.target.value })}
                                                className="w-full h-9 px-3 rounded-md border-2 border-slate-300 bg-white text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
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
                                            <Label className="text-slate-700 text-xs font-medium">Min Salary</Label>
                                            <Input
                                                type="number"
                                                value={formData.salaryMin}
                                                onChange={e => setFormData({ ...formData, salaryMin: e.target.value })}
                                                placeholder="80000"
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-slate-700 text-xs font-medium">Max Salary</Label>
                                            <Input
                                                type="number"
                                                value={formData.salaryMax}
                                                onChange={e => setFormData({ ...formData, salaryMax: e.target.value })}
                                                placeholder="120000"
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-slate-700 text-xs font-medium">Currency</Label>
                                            <select
                                                value={formData.currency}
                                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                                className="w-full h-9 px-3 rounded-md border-2 border-slate-300 bg-white text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
                                            >
                                                <option value="USD">Dollars (USD)</option>
                                                <option value="INR">Rupees (INR)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-slate-700 text-xs font-medium">Period</Label>
                                            <select
                                                value={formData.period}
                                                onChange={e => setFormData({ ...formData, period: e.target.value })}
                                                className="w-full h-9 px-3 rounded-md border-2 border-slate-300 bg-white text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
                                            >
                                                <option value="year">Per Year</option>
                                                <option value="month">Per Month</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-slate-700 text-xs font-medium">Job Status</Label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full h-9 px-3 rounded-md border-2 border-slate-300 bg-white text-slate-900 text-sm focus:border-indigo-500 focus:outline-none"
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="active">Active</option>
                                            <option value="expired">Expired</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-slate-700 text-xs font-medium">Description *</Label>
                                        <Textarea
                                            required
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Job description..."
                                            className="h-16 resize-none text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-slate-700 text-xs font-medium">Responsibilities (comma separated)</Label>
                                        <Textarea
                                            value={formData.responsibilities}
                                            onChange={e => setFormData({ ...formData, responsibilities: e.target.value })}
                                            placeholder="Lead development, Code reviews, Mentor team"
                                            className="h-14 resize-none text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-slate-700 text-xs font-medium">Requirements (comma separated)</Label>
                                        <Textarea
                                            value={formData.requirements}
                                            onChange={e => setFormData({ ...formData, requirements: e.target.value })}
                                            placeholder="React, Node.js, 5+ years experience"
                                            className="h-14 resize-none text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-slate-700 text-xs font-medium">Benefits (comma separated)</Label>
                                        <Input
                                            value={formData.benefits}
                                            onChange={e => setFormData({ ...formData, benefits: e.target.value })}
                                            placeholder="Health insurance, 401k, Remote work"
                                            className="h-9"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 p-4 border-t border-slate-100 shrink-0">
                                    <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Save Changes</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
                </div>
            </div>
        </Layout>
    );
}
