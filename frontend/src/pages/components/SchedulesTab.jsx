import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    CalendarClock, Loader2, Bot, Mail, CheckCircle2, Check, X, ArrowUpRight,
    BriefcaseBusiness, MapPin, Building2, ChevronLeft, ChevronRight, Clock
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';

export default function SchedulesTab() {
    const { user } = useUser();
    const navigate = useNavigate();

    const [jobs, setJobs] = useState([]);
    const [interviews, setInterviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // View state: null means show Job List, otherwise holds selected jobId
    const [selectedJobId, setSelectedJobId] = useState(null);

    useEffect(() => {
        if (user) {
            fetchJobsAndInterviews();
        }
    }, [user?.id]);

    const fetchJobsAndInterviews = async () => {
        try {
            // 1. Fetch Recruiter's Jobs
            const jobsRes = await fetch(`${API_BASE_URL}/api/jobs?clerkId=${user.id}`);
            const jobsData = await jobsRes.json();
            setJobs(jobsData);

            // 2. Fetch All Interviews
            const interviewsRes = await fetch(`${API_BASE_URL}/api/interviews/all`);
            const interviewsData = await interviewsRes.json();
            setInterviews(interviewsData);
        } catch (error) {
            console.error('Fetch schedules error:', error);
            toast.error('Failed to load interviews and schedules.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewReport = (interviewId) => {
        if (interviewId) {
            navigate(`/report/${interviewId}`);
        } else {
            toast.info("Interview report not available yet.");
        }
    };

    const StatusBadge = ({ status }) => {
        if (status === 'Completed') return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">{status}</span>;
        if (status === 'Scheduled') return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">{status}</span>;
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-slate-55 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">{status}</span>;
    };

    const RecommendationBadge = ({ rec, score }) => {
        if (!rec || rec === 'Pending' || rec === 'Analyzed') return <span className="text-slate-400 dark:text-slate-500 text-xs italic">Pending Analysis</span>;
        
        const isRecommended = rec === 'Recommended';
        const isNotRecommended = rec === 'Not Recommended';
        
        return (
            <div className="flex flex-col items-start gap-1">
                <div className={`flex items-center gap-1 font-bold text-xs ${
                    isRecommended ? 'text-emerald-600 dark:text-emerald-400' : 
                    isNotRecommended ? 'text-rose-500 dark:text-rose-450' : 
                    'text-indigo-600 dark:text-indigo-405'
                }`}>
                    {isRecommended ? <Check size={12} /> : isNotRecommended ? <X size={12} /> : <CheckCircle2 size={12} />}
                    {rec}
                </div>
                {score > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Score: {score}%
                    </span>
                )}
            </div>
        );
    };

    // Filter interviews for the selected job
    const selectedJob = jobs.find(j => j._id === selectedJobId);
    const filteredInterviews = interviews.filter(i => i.jobId === selectedJobId);

    // Compute stats for selected job
    const invitesSent = filteredInterviews.length;
    const pendingInterviews = filteredInterviews.filter(i => i.status === 'Scheduled' || i.status === 'Ongoing').length;
    const completedInterviews = filteredInterviews.filter(i => i.status === 'Completed').length;
    const recommendedCount = filteredInterviews.filter(i => i.status === 'Completed' && i.aiRecommendation === 'Recommended').length;

    // Helper to get stats for a specific job card
    const getJobStats = (jobId) => {
        const jobInterviews = interviews.filter(i => i.jobId === jobId);
        return {
            total: jobInterviews.length,
            pending: jobInterviews.filter(i => i.status === 'Scheduled' || i.status === 'Ongoing').length,
            completed: jobInterviews.filter(i => i.status === 'Completed').length
        };
    };

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Loader2 className="h-8 w-8 animate-spin text-slate-350" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* VIEW 1: Job List (Job Selection) */}
            {!selectedJobId ? (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Interviews & Schedules</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Select a job to view candidate schedules and AI evaluation reports.</p>
                    </div>

                    {jobs.length === 0 ? (
                        <Card className="p-12 text-center text-slate-450 border border-slate-200 dark:border-slate-800">
                            <BriefcaseBusiness size={40} className="mx-auto text-slate-300 mb-3" />
                            <p className="font-semibold text-sm">No jobs posted yet.</p>
                            <p className="text-xs text-slate-400 mt-1">Please create a job post in the Jobs tab before reviewing interviews.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {jobs.map((job) => {
                                const stats = getJobStats(job._id);
                                return (
                                    <Card 
                                        key={job._id} 
                                        onClick={() => setSelectedJobId(job._id)}
                                        className="p-6 border border-slate-200 dark:border-slate-800 hover:border-indigo-350 dark:hover:border-indigo-850 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between bg-white dark:bg-slate-900 group"
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    <BriefcaseBusiness size={18} />
                                                </div>
                                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5">
                                                {job.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-slate-500 dark:text-slate-450">
                                                {job.department && (
                                                    <span className="flex items-center gap-1">
                                                        <Building2 size={12} /> {job.department}
                                                    </span>
                                                )}
                                                {job.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={12} /> {job.location}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2 flex justify-between text-xs font-semibold text-slate-650 dark:text-slate-400">
                                            <div>
                                                <span className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">Invites</span>
                                                <span className="font-extrabold text-slate-900 dark:text-slate-200 text-sm">{stats.total}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">Pending</span>
                                                <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">{stats.pending}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">Completed</span>
                                                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{stats.completed}</span>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* VIEW 2: Job Interviews Detail */
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                            <button 
                                onClick={() => setSelectedJobId(null)}
                                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-semibold mb-1 transition-colors"
                            >
                                <ChevronLeft size={14} /> Back to Jobs
                            </button>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                <span className="text-slate-400 font-normal">Schedules /</span> {selectedJob?.title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">Manage invites and review AI proctoring reports for this role.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center bg-blue-50/50 dark:bg-blue-950/20">
                            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-450 flex items-center justify-center mb-2.5">
                                <Mail size={18} />
                            </div>
                            <h3 className="font-bold text-xs text-slate-700 dark:text-slate-350">List of Invites Sent</h3>
                            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{invitesSent}</p>
                        </Card>
                        
                        <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center bg-purple-50/50 dark:bg-purple-950/20">
                            <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-455 flex items-center justify-center mb-2.5">
                                <CalendarClock size={18} />
                            </div>
                            <h3 className="font-bold text-xs text-slate-700 dark:text-slate-350">Pending Interviews</h3>
                            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{pendingInterviews}</p>
                        </Card>
                        
                        <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center bg-emerald-50/50 dark:bg-emerald-950/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                            <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 flex items-center justify-center mb-2.5 z-10">
                                <Bot size={18} />
                            </div>
                            <h3 className="font-bold text-xs text-slate-700 dark:text-slate-350 z-10">AI Auto-Selected Results</h3>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-450 mt-1 z-10">{recommendedCount}</p>
                        </Card>
                    </div>

                    <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                            <h3 className="font-bold text-sm text-slate-850 dark:text-slate-100">Status & Reports of Interview Results</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                                     <tr>
                                         <th className="p-4 pl-6">Candidate & Role</th>
                                         <th className="p-4">Schedule Status</th>
                                         <th className="p-4">AI Result</th>
                                         <th className="p-4 pr-6 text-right">Report</th>
                                     </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {filteredInterviews.length > 0 ? (
                                        filteredInterviews.map((interview) => (
                                            <tr key={interview.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4 pl-6">
                                                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{interview.candidate}</p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{interview.role}</p>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <StatusBadge status={interview.status} />
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{interview.time}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <RecommendationBadge 
                                                        rec={interview.aiRecommendation} 
                                                        score={interview.aiScore} 
                                                    />
                                                </td>
                                                <td className="p-4 pr-6 text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-indigo-650 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-semibold gap-1 text-xs" 
                                                        disabled={interview.status !== 'Completed'}
                                                        onClick={() => handleViewReport(interview.interviewId)}
                                                    >
                                                        View Report <ArrowUpRight size={12} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-slate-400 text-xs font-semibold">
                                                No interviews scheduled for this job yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
