import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    CalendarClock, Loader2, Bot, Mail, CheckCircle2, Check, X, ArrowUpRight 
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';

export default function SchedulesTab() {
    const [interviews, setInterviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/interviews/all`);
            const data = await response.json();
            setInterviews(data);
        } catch (error) {
            console.error('Fetch interviews error:', error);
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
        if (status === 'Completed') return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">{status}</span>;
        if (status === 'Scheduled') return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">{status}</span>;
        return <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{status}</span>;
    };

    const RecommendationBadge = ({ rec, score }) => {
        if (!rec || rec === 'Pending' || rec === 'Analyzed') return <span className="text-slate-400 dark:text-slate-500 text-sm italic">Pending Analysis</span>;
        
        const isRecommended = rec === 'Recommended';
        const isNotRecommended = rec === 'Not Recommended';
        
        return (
            <div className="flex flex-col items-start gap-1">
                <div className={`flex items-center gap-1.5 font-bold text-sm ${
                    isRecommended ? 'text-emerald-600 dark:text-emerald-400' : 
                    isNotRecommended ? 'text-red-500 dark:text-red-400' : 
                    'text-indigo-600 dark:text-indigo-400'
                }`}>
                    {isRecommended ? <Check size={14} /> : isNotRecommended ? <X size={14} /> : <CheckCircle2 size={14} />}
                    {rec}
                </div>
                {score > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Score: {score}%
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Interviews & Schedules</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Review AI interview reports, status, and automated selection results.</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2">
                    <CalendarClock size={18} />
                    Schedule Interview
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center bg-blue-50 dark:bg-blue-950/20">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                        <Mail size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-200">List of Invites Sent</h3>
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">12</p>
                </Card>
                <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center bg-purple-50 dark:bg-purple-950/20">
                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                        <CalendarClock size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-200">Pending Interviews</h3>
                    <p className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">4</p>
                </Card>
                <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center bg-emerald-50 dark:bg-emerald-950/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 z-10">
                        <Bot size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-200 z-10">AI Auto-Selected Results</h3>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 z-10">8</p>
                    <p className="text-emerald-600/60 dark:text-emerald-400/60 text-xs font-bold uppercase tracking-wider z-10 mt-1">Ready for next steps</p>
                </Card>
            </div>

            <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">Status & Reports of Interview Results</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                             <tr>
                                 <th className="p-4 pl-6">Candidate & Role</th>
                                 <th className="p-4">Schedule Status</th>
                                 <th className="p-4">AI Result</th>
                                 <th className="p-4 pr-6 text-right">Report</th>
                             </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="p-12 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto" />
                                    </td>
                                </tr>
                            ) : interviews.length > 0 ? (
                                interviews.map((interview) => (
                                    <tr key={interview.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 pl-6">
                                            <p className="font-bold text-slate-900 dark:text-slate-100">{interview.candidate}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{interview.role}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <StatusBadge status={interview.status} />
                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{interview.time}</span>
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
                                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-semibold gap-2" 
                                                disabled={interview.status !== 'Completed'}
                                                onClick={() => handleViewReport(interview.interviewId)}
                                            >
                                                View Report <ArrowUpRight size={14} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400 text-sm">
                                        No interviews found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
