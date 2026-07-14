import React from 'react';
import { Card } from '@/components/ui/card';
import { 
    PlusCircle, UserPlus, CalendarCheck, Settings, 
    Briefcase, Bot, FileText, CheckCircle2 
} from 'lucide-react';

export default function WorkflowVisualization({ setActiveTab, setSearchParams }) {
    const handleQuickAction = (tabId, action = null) => {
        if (setActiveTab && setSearchParams) {
            const params = { tab: tabId };
            if (action) params.action = action;
            setSearchParams(params);
            setActiveTab(tabId);
        }
    };

    const actions = [
        {
            title: 'New Job Posting',
            desc: 'Create and launch a new AI-screened role',
            icon: <PlusCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
            onClick: () => handleQuickAction('jobs', 'new'),
            bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100/50 dark:border-indigo-900/30'
        },
        {
            title: 'Invite Candidate',
            desc: 'Send automated AI screening invite',
            icon: <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
            onClick: () => handleQuickAction('candidates'),
            bgColor: 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-100/50 dark:border-purple-900/30'
        },
        {
            title: 'Manage Schedules',
            desc: 'View upcoming interviews and calendar',
            icon: <CalendarCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
            onClick: () => handleQuickAction('schedules'),
            bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/50 dark:border-emerald-900/30'
        },
        {
            title: 'System Settings',
            desc: 'Configure API keys and preferences',
            icon: <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />,
            onClick: () => handleQuickAction('settings'),
            bgColor: 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100/50 dark:border-slate-800'
        }
    ];

    const stepperSteps = [
        { label: 'Role Active', icon: <Briefcase className="h-4 w-4" />, desc: 'Job created' },
        { label: 'AI Screening', icon: <Bot className="h-4 w-4" />, desc: 'Voice interview' },
        { label: 'Evaluation', icon: <FileText className="h-4 w-4" />, desc: 'Transcript & analysis' },
        { label: 'Auto-Select', icon: <CheckCircle2 className="h-4 w-4" />, desc: 'Top list generated' }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Quick Actions Grid */}
            <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">Quick Actions</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Jump straight into active workflows</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {actions.map((act, idx) => (
                        <div
                            key={idx}
                            onClick={act.onClick}
                            className={`p-3 rounded-xl border ${act.bgColor} hover:scale-[1.01] hover:shadow-md cursor-pointer transition-all flex items-start gap-3`}
                        >
                            <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 shrink-0">
                                {act.icon}
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{act.title}</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{act.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Sleek Horizontal Stepper */}
            <Card className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">AI Hiring Pipeline</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Fully automated candidate lifecycle</p>
                </div>
                <div className="flex items-center justify-between relative w-full px-2 py-4">
                    {/* Background Connecting Line */}
                    <div className="absolute top-1/2 left-[12%] right-[12%] h-[2px] bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
                    
                    {stepperSteps.map((step, idx) => (
                        <div key={idx} className="flex flex-col items-center z-10 w-1/4 relative group">
                            {/* Circle Node */}
                            <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all shadow-sm">
                                {step.icon}
                            </div>
                            {/* Text labels */}
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-2 text-center truncate w-full">
                                {step.label}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 text-center truncate w-full mt-0.5 leading-none">
                                {step.desc}
                            </span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
