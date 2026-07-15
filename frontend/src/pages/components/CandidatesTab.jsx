import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from "@/hooks/useUser";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Upload, Search, Filter, Loader2, Bot, Mail, CheckCircle2, X, Grid3x3, List, Trash2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { maskEmail, maskPhoneNumber } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';

export default function CandidatesTab() {
    const navigate = useNavigate();
    const { user } = useUser();
    const [candidates, setCandidates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [recruiterJobs, setRecruiterJobs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    
    const mapCandidateData = (c) => ({
        id: c._id,
        name: c.name,
        email: c.email || 'N/A',
        phone: c.phone || 'N/A',
        role: c.role || '',
        status: c.status || 'pending',
        jobMatchScores: c.jobMatchScores || [],
        matchScore: c.matchScore || 0,
        appliedOn: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A',
        autoSelected: c.autoSelected || false,
        skills: c.skills || [],
        interviewLink: c.interviewLink || null
    });

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch recruiter's jobs
                const jobsRes = await fetch(`${API_BASE_URL}/api/jobs?clerkId=${user.id}`);
                const jobs = await jobsRes.json();
                setRecruiterJobs(jobs);

                // Fetch candidates
                const candidatesRes = await fetch(`${API_BASE_URL}/api/candidates`);
                const data = await candidatesRes.json();
                
                setCandidates(data.map(mapCandidateData));
            } catch (err) {
                console.error('Failed to fetch data:', err);
                toast.error('Failed to load candidates data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

    const StatusBadge = ({ status, autoSelected }) => {
        let colors = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
        if (status === 'Screening Pending' || status === 'pending') colors = 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400';
        if (status === 'Invited' || status === 'scheduled') colors = 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400';
        if (status === 'Interviewed' || status === 'called') colors = 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400';

        return (
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colors} flex items-center gap-1.5 w-max`}>
                {status}
                {autoSelected && <Bot size={14} className="text-emerald-600" title="AI Auto-Selected" />}
            </div>
        );
    };

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', role: '', experienceSummary: '', skills: [], projects: []
    });
    const fileInputRef = useRef(null);

    const getRecruiterScores = (candidateMatchScores) => {
        if (!candidateMatchScores || !recruiterJobs || recruiterJobs.length === 0) return [];
        const jobIds = recruiterJobs.map(j => j._id.toString());
        return candidateMatchScores
            .filter(ms => ms.jobId && ms.jobId._id && jobIds.includes(ms.jobId._id.toString()))
            .map(ms => ({
                score: ms.score,
                title: ms.jobId.title,
                department: ms.jobId.department
            }))
            .sort((a, b) => b.score - a.score);
    };

    const [invitingId, setInvitingId] = useState(null);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [deadlineDays, setDeadlineDays] = useState(7);

    const handleSendInvite = async (candidateId) => {
        if (!selectedJobId) {
            toast.error('Please select a job first');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/candidates/${candidateId}/send-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: selectedJobId, deadlineDays })
            });
            if (response.ok) {
                const data = await response.json();
                toast.success(`Invite sent! Deadline: ${new Date(data.expiresAt).toLocaleDateString()}`);
                // Find the job title from local recruiterJobs so the badge
                // can immediately show "Invited for <role>" without a page reload.
                const selectedJob = recruiterJobs.find(j => j._id === selectedJobId);
                const updatedCandidates = candidates.map(c =>
                    c.id === candidateId
                        ? { ...c, status: 'Invited', role: selectedJob?.title || c.role }
                        : c
                );
                setCandidates(updatedCandidates);
                setInvitingId(null);
            } else {
                const errData = await response.json();
                toast.error(errData.error || 'Failed to send invite.');
            }
        } catch (error) {
            console.error('Send invite error:', error);
            toast.error('Failed to send invite');
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append('resume', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/candidates/parse-resume`, {
                method: 'POST',
                body: uploadData,
            });

            if (response.ok) {
                const parsedData = await response.json();
                setFormData({
                    name: parsedData.name || '',
                    email: parsedData.email || '',
                    phone: parsedData.phone || '',
                    role: parsedData.role || '',
                    experienceSummary: parsedData.experienceSummary || '',
                    skills: parsedData.skills || [],
                    projects: parsedData.projects || []
                });
            } else {
                console.error("Failed to parse resume");
                toast.error("Failed to parse the resume. Please fill out manually.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error connecting to server.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmitCandidate = async (e) => {
        e.preventDefault();
        try {
                const processedFormData = {
                ...formData,
                projects: typeof formData.projects === 'string' 
                    ? formData.projects.split(',').map(p => ({ name: p.trim(), points: [] }))
                    : formData.projects
            };

            const response = await fetch(`${API_BASE_URL}/api/candidates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(processedFormData)
            });
            if (response.ok) {
                const result = await response.json();
                // Fetch updated candidates list
                const candidatesRes = await fetch(`${API_BASE_URL}/api/candidates`);
                const candidatesData = await candidatesRes.json();
                setCandidates(candidatesData.map(mapCandidateData));
                setIsAddModalOpen(false);
                setFormData({ name: '', email: '', phone: '', role: '', experienceSummary: '', skills: [], projects: [] });
            }
        } catch (error) {
            console.error("Error saving candidate", error);
        }
    };

    const handleManualClick = () => {
        setFormData({ name: '', email: '', phone: '', role: '', experienceSummary: '', skills: [], projects: [] });
        setIsAddModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Candidates CRM</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Upload resumes, view AI matches, and track screening progress.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        accept=".pdf"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        onClick={() => { fileInputRef.current?.click(); setIsAddModalOpen(true); }}
                        className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm flex items-center gap-2 transition-colors"
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 size={18} className="animate-spin text-indigo-600" /> : <Upload size={18} className="text-slate-400 dark:text-slate-500" />}
                        {isUploading ? "Extracting..." : "AI Resume Upload"}
                    </Button>
                    <Button onClick={handleManualClick} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2">
                        <Users size={18} />
                        Add Candidate
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative flex-1 max-w-md">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 h-5 w-5" />
                    <Input
                        placeholder="Search candidates..."
                        className="pl-10 bg-slate-50 dark:bg-slate-950 border-transparent dark:border-slate-800 focus-visible:ring-indigo-500 rounded-lg text-slate-900 dark:text-slate-100"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                 <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg p-1 bg-slate-50 dark:bg-slate-950">
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className={viewMode === 'list' ? 'bg-indigo-600 hover:bg-indigo-700' : 'dark:text-slate-400'}
                    >
                        <List size={16} />
                    </Button>
                    <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className={viewMode === 'grid' ? 'bg-indigo-600 hover:bg-indigo-700' : 'dark:text-slate-400'}
                    >
                        <Grid3x3 size={16} />
                    </Button>
                </div>
            </div>

            {/* Candidates Display */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full p-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-300 mb-2 mx-auto" />
                            <p className="text-sm text-slate-500 font-medium">Loading candidates...</p>
                        </div>
                    ) : candidates.filter(c =>
                        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.email.toLowerCase().includes(searchQuery.toLowerCase())
                    ).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length > 0 ? (
                        candidates.filter(c =>
                            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.email.toLowerCase().includes(searchQuery.toLowerCase())
                        ).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((candidate) => (
                             <Card key={candidate.id} className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-white dark:bg-slate-900/50 relative">
                                {candidate.status === 'pending' ? (
                                    <span className="absolute top-4 right-4 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase rounded">new</span>
                                ) : null}

                                <div className="mb-4">
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-0.5 pr-16">{candidate.name}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{maskEmail(candidate.email)}</p>
                                </div>

                                {candidate.skills && candidate.skills.length > 0 && (
                                     <div className="flex flex-wrap gap-2 mb-4">
                                        {candidate.skills.slice(0, 5).map((skill, idx) => (
                                            <span key={idx} className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-xs rounded font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                        {candidate.skills.length > 5 && (
                                            <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-xs rounded font-bold">
                                                +{candidate.skills.length - 5}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Bottom row — clean: just date + delete + view */}
                                 <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-xs text-slate-600 dark:text-slate-500 font-medium">Added {candidate.appliedOn}</span>
                                    <div className="flex gap-2">
                                         <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-8 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            onClick={() => navigate(`/candidate/${candidate.id}`)}
                                        >
                                            View
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full p-8 text-center text-slate-400 text-sm">
                            No candidates found.
                        </div>
                    )}
                </div>
             ) : (
                <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                             <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                                    <th className="p-4 pl-6">Candidate</th>
                                    <th className="p-4">Added On</th>
                                    <th className="p-4 pr-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="3" className="p-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <Loader2 className="h-8 w-8 animate-spin text-slate-300 mb-2" />
                                                <p className="text-sm text-slate-500 font-medium">Loading candidates...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : candidates.filter(c =>
                                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    c.email.toLowerCase().includes(searchQuery.toLowerCase())
                                ).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length > 0 ? (
                                    candidates.filter(c =>
                                        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        c.email.toLowerCase().includes(searchQuery.toLowerCase())
                                      ).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((candidate) => (
                                        <tr key={candidate.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold shadow-sm border border-white dark:border-slate-800">
                                                        {candidate.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-slate-100">{candidate.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{maskEmail(candidate.email)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Added {candidate.appliedOn}</p>
                                            </td>
                                            <td className="p-4 pr-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                     <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg gap-1.5 h-8 transition-colors"
                                                        onClick={() => navigate(`/candidate/${candidate.id}`)}
                                                    >
                                                        <Eye size={14} /> View
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="p-8 text-center text-slate-400 text-sm">
                                            No candidates found. Upload a resume to begin.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Pagination */}
            {!isLoading && candidates.filter(c =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email.toLowerCase().includes(searchQuery.toLowerCase())
            ).length > itemsPerPage && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <Button
                              variant="outline"
                             size="sm"
                             onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                             disabled={currentPage === 1}
                             className="border-slate-200 dark:border-slate-800 dark:text-slate-400"
                         >
                            <ChevronLeft size={16} />
                        </Button>
                        <span className="text-sm text-slate-600 dark:text-slate-400 px-4">
                            Page {currentPage} of {Math.ceil(candidates.filter(c =>
                                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                c.email.toLowerCase().includes(searchQuery.toLowerCase())
                            ).length / itemsPerPage)}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                             onClick={() => setCurrentPage(p => p + 1)}
                             disabled={currentPage >= Math.ceil(candidates.filter(c =>
                                 c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 c.email.toLowerCase().includes(searchQuery.toLowerCase())
                             ).length / itemsPerPage)}
                             className="border-slate-200 dark:border-slate-800 dark:text-slate-400"
                         >
                             <ChevronRight size={16} />
                         </Button>
                    </div>
                )}

            {/* AI Candidate Modal Overlay */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                     <Card className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border-slate-200 dark:border-slate-800">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <Bot className="text-indigo-600 dark:text-indigo-400" /> Add Candidate Profile
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Upload a PDF resume to auto-fill these fields using Gemini AI.</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                                <X size={20} />
                            </Button>
                        </div>

                        <div className="p-6">
                             {isUploading && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
                                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg">AI is reading the resume...</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Extracting skills, experience, and contact details.</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmitCandidate} className="space-y-4">
                                 <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-medium">Full Name</Label>
                                        <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Jane Doe" className="text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800" />
                                    </div>
                                </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-medium">Email Address</Label>
                                        <Input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="jane@example.com" className="text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 font-medium">Phone Number</Label>
                                        <Input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (555) 000-0000" className="text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800" />
                                    </div>
                                </div>

                                 <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-medium">Top Skills (comma separated)</Label>
                                     <Input
                                         value={Array.isArray(formData.skills) ? formData.skills.join(', ') : ''}
                                         onChange={e => setFormData({ ...formData, skills: e.target.value.split(',').map(s => s.trim()) })}
                                         placeholder="React, Node.js, TypeScript, UI Design"
                                         className="text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800"
                                     />
                                </div>

                                 <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-medium">Projects (AI Extracted / Manual)</Label>
                                    <Textarea
                                        className="h-24 resize-none text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 leading-relaxed"
                                        value={typeof formData.projects === 'string' ? formData.projects : JSON.stringify(formData.projects, null, 2)}
                                        onChange={e => {
                                            try {
                                                // Try to parse if it's JSON, otherwise keep as string
                                                const val = e.target.value;
                                                if (val.trim().startsWith('[') || val.trim().startsWith('{')) {
                                                    setFormData({ ...formData, projects: JSON.parse(val) });
                                                } else {
                                                    setFormData({ ...formData, projects: val });
                                                }
                                            } catch (err) {
                                                setFormData({ ...formData, projects: e.target.value });
                                            }
                                        }}
                                        placeholder="Projects details..."
                                    />
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Note: AI returns structured data here. You can edit it as text or JSON.</p>
                                </div>

                                 <div className="space-y-2">
                                    <Label className="text-slate-700 dark:text-slate-300 font-medium">AI Experience Summary / Notes</Label>
                                    <Textarea
                                        className="h-24 resize-none text-slate-900 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 leading-relaxed"
                                        value={formData.experienceSummary}
                                        onChange={e => setFormData({ ...formData, experienceSummary: e.target.value })}
                                        placeholder="Brief overview of candidate background..."
                                    />
                                </div>

                                 <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                    <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">Cancel</Button>
                                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Candidate</Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
