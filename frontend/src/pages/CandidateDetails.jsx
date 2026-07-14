import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    ArrowLeft, Mail, Phone, Briefcase, Calendar, Loader2, Trash2, 
    ShieldAlert, AlertTriangle, CheckCircle2, Bot, Check, X, MessageSquare 
} from 'lucide-react';
import { maskEmail, maskPhoneNumber } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import RecruiterLayout from './components/RecruiterLayout';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { toast } from 'sonner';

export default function CandidateDetails() {
    const { id, interviewId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const [candidate, setCandidate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [recruiterJobs, setRecruiterJobs] = useState([]);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const isReportOnly = !!interviewId;

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                if (isReportOnly) {
                    const response = await fetch(`${API_BASE_URL}/api/interviews/${interviewId}/full`);
                    const data = await response.json();
                    if (response.ok) {
                        setCandidate({
                            name: data.candidateName || 'Candidate',
                            interview: data
                        });
                    } else {
                        console.error('Failed to fetch interview report:', data.error);
                    }
                } else {
                    // Fetch candidate details
                    const candRes = await fetch(`${API_BASE_URL}/api/candidates/${id}`);
                    const data = await candRes.json();
                    
                    // Fetch recruiter's jobs if user is logged in
                    let jobs = [];
                    if (user) {
                        const jobsRes = await fetch(`${API_BASE_URL}/api/jobs?clerkId=${user.id}`);
                        jobs = await jobsRes.json();
                        setRecruiterJobs(jobs);
                    }

                    setCandidate({
                        id: data._id,
                        name: data.name,
                        email: data.email || 'N/A',
                        phone: data.phone || 'N/A',
                        role: data.role || 'N/A',
                        status: data.status || 'pending',
                        jobMatchScores: data.jobMatchScores || [],
                        appliedOn: new Date(data.createdAt).toLocaleDateString(),
                        skills: data.skills || [],
                        experienceSummary: data.experienceSummary || 'No summary available',
                        notes: data.notes || '',
                        projects: data.projects || [],
                        interview: data.interview || null
                    });
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, interviewId, user, isReportOnly]);

    const handleRegenerate = async (targetInterviewId) => {
        setIsRegenerating(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/interviews/${targetInterviewId}/analyze`, {
                method: 'POST'
            });
            if (response.ok) {
                toast.success('Interview report successfully regenerated!');
                // Refetch details
                if (isReportOnly) {
                    const res = await fetch(`${API_BASE_URL}/api/interviews/${targetInterviewId}/full`);
                    const data = await res.json();
                    setCandidate({
                        name: data.candidateName || 'Candidate',
                        interview: data
                    });
                } else {
                    const candRes = await fetch(`${API_BASE_URL}/api/candidates/${id}`);
                    const data = await candRes.json();
                    setCandidate(prev => ({
                        ...prev,
                        interview: data.interview || null
                    }));
                }
            } else {
                toast.error('Failed to regenerate report');
            }
        } catch (error) {
            console.error('Regenerate error:', error);
            toast.error('Failed to regenerate report');
        } finally {
            setIsRegenerating(false);
        }
    };

    const StatusBadge = ({ status }) => {
        let colors = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
        if (status === 'pending') colors = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        if (status === 'scheduled' || status === 'invited') colors = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        if (status === 'called') colors = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${colors}`}>
                {status}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!candidate) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Candidate Not Found</h2>
                    <Button onClick={() => navigate(-1)} variant="outline" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                        <ArrowLeft size={16} className="mr-2" /> Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <RecruiterLayout activeTab={isReportOnly ? "jobs" : "candidates"}>
            <div className="p-8">
                <div className="max-w-4xl mx-auto">
                <Button onClick={() => navigate(-1)} variant="ghost" className="mb-6 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:bg-slate-800">
                    <ArrowLeft size={16} className="mr-2" /> {isReportOnly ? 'Back' : 'Back to Dashboard'}
                </Button>

                {!isReportOnly && (
                    <Card className="p-8 border-0 shadow-sm bg-white dark:bg-slate-900">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{candidate.name}</h1>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                    <Mail size={20} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Email</p>
                                    <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">{maskEmail(candidate.email)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                                    <Phone size={20} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Phone</p>
                                    <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">{maskPhoneNumber(candidate.phone)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                                    <Briefcase size={20} className="text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Matched Roles</p>
                                    <p className="text-sm text-slate-900 dark:text-slate-100 font-bold">
                                        {recruiterJobs.length > 0 
                                            ? candidate.jobMatchScores?.filter(ms => recruiterJobs.some(rj => rj._id === ms.jobId?._id)).length || 0
                                            : candidate.jobMatchScores?.length || 0}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                                    <Calendar size={20} className="text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Applied On</p>
                                    <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">{candidate.appliedOn}</p>
                                </div>
                            </div>
                        </div>

                        {candidate.skills.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {candidate.skills.map((skill, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm rounded-lg font-medium">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Experience Summary</h3>
                            <p className="text-sm text-slate-800 dark:text-slate-400 leading-relaxed">{candidate.experienceSummary}</p>
                        </div>

                        {candidate.projects && candidate.projects.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 border-b dark:border-slate-800 pb-2">Projects</h3>
                                <div className="space-y-6">
                                    {candidate.projects.map((project, pIdx) => (
                                        <div key={pIdx}>
                                            <h4 className="font-bold text-slate-900 dark:text-slate-200 text-base mb-2">{project.name}</h4>
                                            <ul className="list-disc list-inside space-y-1.5">
                                                {(project.points || []).map((point, ptIdx) => (
                                                    <li key={ptIdx} className="text-sm text-slate-700 dark:text-slate-400 pl-2 leading-relaxed">
                                                        {point}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {candidate.notes && (
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Notes</h3>
                                <p className="text-sm text-slate-800 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{candidate.notes}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <Button variant="outline" className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Trash2 size={16} className="mr-2" /> Delete Candidate
                            </Button>
                        </div>
                    </Card>
                )}

                {isReportOnly && !candidate.interview && (
                    <Card className="p-8 text-center border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                        <Bot size={48} className="text-indigo-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-950 dark:text-slate-250">No Completed Interview Found</h3>
                        <p className="text-sm text-slate-500 mt-1">An interview has not been completed yet for {candidate.name}.</p>
                    </Card>
                )}

                {candidate.interview && (
                    <Card className={isReportOnly ? "p-8 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900" : "mt-8 p-8 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900"}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b dark:border-slate-800 pb-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <Bot className="text-indigo-500" /> AI Interview Report{isReportOnly ? `: ${candidate.name}` : ''}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Completed on {candidate.interview.time} for the role of <strong>{candidate.interview.jobTitle}</strong>
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {candidate.interview.aiRecommendation && (
                                    <div className="flex items-center gap-1.5 font-bold text-sm px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                        <span className={
                                            candidate.interview.aiRecommendation === 'Recommended' ? 'text-emerald-600 dark:text-emerald-400' :
                                            candidate.interview.aiRecommendation === 'Not Recommended' ? 'text-red-500 dark:text-red-400' :
                                            'text-indigo-600 dark:text-indigo-400'
                                        }>
                                            {candidate.interview.aiRecommendation}
                                        </span>
                                    </div>
                                )}
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleRegenerate(candidate.interview.interviewId)}
                                    disabled={isRegenerating}
                                    className="border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 gap-1.5"
                                >
                                    {isRegenerating ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                                    {isRegenerating ? 'Regenerating...' : 'Regenerate Report'}
                                </Button>
                            </div>
                        </div>

                        {/* Proctoring Section */}
                        {candidate.interview.proctoring && (
                            <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
                                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
                                    <ShieldAlert size={18} className="text-indigo-500" /> AI Proctoring & Integrity Logs
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Face Presence</span>
                                        <div className="flex items-baseline gap-1 mt-2">
                                            <span className={`text-2xl font-black ${
                                                candidate.interview.proctoring.facePresentRate >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                                                candidate.interview.proctoring.facePresentRate >= 75 ? 'text-amber-500' : 'text-rose-500'
                                            }`}>{candidate.interview.proctoring.facePresentRate}%</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-1 font-medium">Estimated attention</span>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No Face</span>
                                        <div className="flex items-baseline gap-1 mt-2">
                                            <span className={`text-2xl font-black ${
                                                candidate.interview.proctoring.noFace > 0 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'
                                            }`}>{candidate.interview.proctoring.noFace}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-1 font-medium">Camera missing flags</span>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Multiple Faces</span>
                                        <div className="flex items-baseline gap-1 mt-2">
                                            <span className={`text-2xl font-black ${
                                                candidate.interview.proctoring.multipleFaces > 0 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'
                                            }`}>{candidate.interview.proctoring.multipleFaces}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-1 font-medium">Multiple faces count</span>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Looked Away</span>
                                        <div className="flex items-baseline gap-1 mt-2">
                                            <span className={`text-2xl font-black ${
                                                candidate.interview.proctoring.lookingAway > 5 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'
                                            }`}>{candidate.interview.proctoring.lookingAway}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-1 font-medium">Out of focus events</span>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Eyes Closed</span>
                                        <div className="flex items-baseline gap-1 mt-2">
                                            <span className={`text-2xl font-black ${
                                                candidate.interview.proctoring.eyesClosed > 10 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'
                                            }`}>{candidate.interview.proctoring.eyesClosed}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-1 font-medium">Eye closed alerts</span>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tab Switches</span>
                                        <div className="flex items-baseline gap-1 mt-2">
                                            <span className={`text-2xl font-black ${
                                                candidate.interview.proctoring.tabSwitches > 0 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'
                                            }`}>{candidate.interview.proctoring.tabSwitches}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-1 font-medium">Tab violations</span>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fullscreen Exits</span>
                                        <div className="flex items-baseline gap-1 mt-2">
                                            <span className={`text-2xl font-black ${
                                                candidate.interview.proctoring.fullscreenExits > 0 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'
                                            }`}>{candidate.interview.proctoring.fullscreenExits}</span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-1 font-medium">Fullscreen exits</span>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                                    <div className="md:col-span-2">
                                        <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                            <AlertTriangle size={12} className="text-amber-500" /> Proctoring Flag Timeline Breakdown
                                        </h6>
                                        <div className="h-44 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={[
                                                    { name: 'No Face', count: candidate.interview.proctoring.noFace },
                                                    { name: 'Multiple', count: candidate.interview.proctoring.multipleFaces },
                                                    { name: 'Looked Away', count: candidate.interview.proctoring.lookingAway },
                                                    { name: 'Eyes Closed', count: candidate.interview.proctoring.eyesClosed },
                                                    { name: 'Tab Switches', count: candidate.interview.proctoring.tabSwitches },
                                                    { name: 'Fullscreen Exits', count: candidate.interview.proctoring.fullscreenExits }
                                                ]}>
                                                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                                    <Tooltip cursor={{ fill: 'rgba(99,102,241,0.03)' }} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                        <Cell fill="#ef4444" />
                                                        <Cell fill="#f43f5e" />
                                                        <Cell fill="#f59e0b" />
                                                        <Cell fill="#a855f7" />
                                                        <Cell fill="#3b82f6" />
                                                        <Cell fill="#ec4899" />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center items-center p-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800">
                                        <div className="relative flex items-center justify-center">
                                            <svg className="w-28 h-28 transform -rotate-90">
                                                <circle cx="56" cy="56" r="48" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="8" fill="transparent" />
                                                <circle cx="56" cy="56" r="48" stroke="currentColor" className={
                                                    candidate.interview.proctoring.facePresentRate >= 90 ? 'text-emerald-500' :
                                                    candidate.interview.proctoring.facePresentRate >= 75 ? 'text-amber-500' : 'text-rose-500'
                                                } strokeWidth="8" fill="transparent" strokeDasharray={301.6} strokeDashoffset={301.6 - (301.6 * candidate.interview.proctoring.facePresentRate) / 100} strokeLinecap="round" />
                                            </svg>
                                            <div className="absolute flex flex-col items-center justify-center">
                                                <span className="text-xl font-black text-slate-900 dark:text-white">{candidate.interview.proctoring.facePresentRate}%</span>
                                                <span className="text-[8px] uppercase font-extrabold text-slate-400 tracking-wider">Integrity Score</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Screening Summary Section */}
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <MessageSquare size={18} className="text-indigo-500" /> AI Screening Summary
                            </h4>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[100px] whitespace-pre-wrap font-sans">
                            {candidate.interview.aiSummary || (isRegenerating ? 'Generating screening report...' : 'No analysis available yet. Click regenerate to trigger AI screening report.')}
                        </div>
                        
                        <div className="flex justify-end pt-4 border-t dark:border-slate-800">
                            <p className="text-xs text-slate-400 italic">This AI-generated screening feedback is private and for recruiter use only.</p>
                        </div>
                    </Card>
                )}
                </div>
            </div>
        </RecruiterLayout>
    );
}
