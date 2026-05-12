import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Mail, Phone, Briefcase, Calendar, Loader2, Trash2 } from 'lucide-react';
import { maskEmail, maskPhoneNumber } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';

export default function CandidateDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();
    const [candidate, setCandidate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [recruiterJobs, setRecruiterJobs] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
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
                    projects: data.projects || []
                });
            } catch (err) {
                console.error('Failed to fetch data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, user]);

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
            <div className="max-w-4xl mx-auto">
                <Button onClick={() => navigate(-1)} variant="ghost" className="mb-6 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:bg-slate-800">
                    <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
                </Button>

                <Card className="p-8 border-0 shadow-sm bg-white dark:bg-slate-900">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{candidate.name}</h1>
                        </div>
                        <StatusBadge status={candidate.status} />
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

                    {candidate.jobMatchScores && candidate.jobMatchScores.length > 0 && (
                        <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <Briefcase size={16} className="text-indigo-600 dark:text-indigo-400" />
                                Your Job Suitability Scores
                            </h3>
                            <div className="space-y-3">
                                {candidate.jobMatchScores
                                    .filter(match => recruiterJobs.some(rj => rj._id === match.jobId?._id))
                                    .map((match, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{match.jobId?.title || 'Unknown Job'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{match.jobId?.department || 'General'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${match.score >= 80 ? 'bg-emerald-500' : match.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ width: `${match.score}%` }}
                                                />
                                            </div>
                                            <div className="w-12 text-right">
                                                <span className={`text-sm font-bold ${match.score >= 80 ? 'text-emerald-700' : match.score >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                                                    {match.score}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {candidate.jobMatchScores.filter(match => recruiterJobs.some(rj => rj._id === match.jobId?._id)).length === 0 && (
                                    <p className="text-sm text-slate-500 italic text-center py-4">No suitability scores found for your jobs.</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <Button variant="outline" className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 size={16} className="mr-2" /> Delete Candidate
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
