import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    BriefcaseBusiness, MapPin, Building2, Clock, DollarSign,
    ChevronLeft, Share2, Bookmark, CheckCircle2,
    Users, Calendar, GraduationCap, Edit, X
} from 'lucide-react';
import { toast } from 'sonner';

export default function JobDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useUser();
    const [userRole, setUserRole] = useState(null);
    const [candidateProfile, setCandidateProfile] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [formData, setFormData] = useState(null);
    const [isApplying, setIsApplying] = useState(false);

    useEffect(() => {
        fetchJobDetails();
        if (user) {
            fetchUserRole();
        }
    }, [id, user]);

    const fetchUserRole = async () => {
        try {
            const response = await fetch(`http://localhost:5001/api/users/me?clerkId=${user.id}`);
            if (response.ok) {
                const data = await response.json();
                setUserRole(data.role);
                
                if (data.role === 'candidate') {
                    const candRes = await fetch(`http://localhost:5001/api/candidates/me?clerkId=${user.id}`);
                    if (candRes.ok) {
                        const candData = await candRes.json();
                        setCandidateProfile(candData);
                    }
                }
            }
        } catch (error) {
            console.error('Fetch user role error:', error);
        }
    };

    const handleApply = async () => {
        if (!user) {
            toast.error("Please sign in to apply.");
            return;
        }

        setIsApplying(true);
        try {
            const res = await fetch(`http://localhost:5001/api/jobs/${id}/apply`, {
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
            const response = await fetch(`http://localhost:5001/api/jobs/${id}`);
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
            const response = await fetch(`http://localhost:5001/api/jobs/${job._id}`, {
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

    if (isLoading) {
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

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    className="mb-8 hover:bg-slate-200 transition-colors gap-2"
                    onClick={() => navigate(-1)}
                >
                    <ChevronLeft size={20} />
                    Back to Jobs
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="border-none shadow-sm overflow-hidden bg-white">
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <BriefcaseBusiness size={32} />
                                    </div>
                                    <div className="flex gap-2">
                                        {userRole === 'recruiter' && (
                                            <Button 
                                                variant="outline" 
                                                className="rounded-xl border-slate-200 gap-2 text-slate-700 hover:bg-slate-50"
                                                onClick={handleOpenEdit}
                                            >
                                                <Edit size={16} /> Edit
                                            </Button>
                                        )}
                                        <Button variant="outline" size="icon" className="rounded-xl border-slate-200">
                                            <Share2 size={18} />
                                        </Button>
                                        <Button variant="outline" size="icon" className="rounded-xl border-slate-200">
                                            <Bookmark size={18} />
                                        </Button>
                                    </div>
                                </div>

                                <h1 className="text-3xl font-bold text-slate-900 mb-2">{job.title}</h1>

                                <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-8 border-b border-slate-100 pb-8">
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
                                    <div className="flex items-center gap-1.5 font-medium text-indigo-600">
                                        {job.salaryRange?.currency === 'INR' ? '₹' : '$'}{job.salaryRange?.min?.toLocaleString()} - {job.salaryRange?.currency === 'INR' ? '₹' : '$'}{job.salaryRange?.max?.toLocaleString()} / {job.salaryRange?.period || 'year'}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <section>
                                        <h2 className="text-lg font-bold text-slate-900 mb-3">Description</h2>
                                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                                            {job.description}
                                        </p>
                                    </section>

                                    {job.responsibilities?.length > 0 && (
                                        <section>
                                            <h2 className="text-lg font-bold text-slate-900 mb-3">Responsibilities</h2>
                                            <ul className="space-y-3">
                                                {job.responsibilities.map((item, index) => (
                                                    <li key={index} className="flex gap-3 text-slate-600">
                                                        <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}

                                    {job.requirements?.length > 0 && (
                                        <section>
                                            <h2 className="text-lg font-bold text-slate-900 mb-3">Requirements</h2>
                                            <ul className="space-y-3">
                                                {job.requirements.map((item, index) => (
                                                    <li key={index} className="flex gap-3 text-slate-600">
                                                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}

                                    {job.benefits?.length > 0 && (
                                        <section>
                                            <h2 className="text-lg font-bold text-slate-900 mb-3">Benefits</h2>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {job.benefits.map((benefit, index) => (
                                                    <div key={index} className="p-3 bg-slate-50 rounded-xl text-slate-700 text-sm font-medium border border-slate-100 flex items-center gap-2">
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

                        <Card className="border-none shadow-sm p-6 bg-white">
                            <h3 className="text-slate-900 font-bold mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center group hover:bg-indigo-50 transition-colors cursor-pointer">
                                    <Users className="mx-auto mb-2 text-slate-400 group-hover:text-indigo-600" />
                                    <div className="text-xs font-bold text-slate-900">Similar Jobs</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center group hover:bg-indigo-50 transition-colors cursor-pointer">
                                    <Building2 className="mx-auto mb-2 text-slate-400 group-hover:text-indigo-600" />
                                    <div className="text-xs font-bold text-slate-900">Company Info</div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

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
    );
}
