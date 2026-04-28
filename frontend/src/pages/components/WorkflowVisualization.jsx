import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowRight, Briefcase, Bot, Mail, Users, CheckCircle, FileText } from 'lucide-react';

export default function WorkflowVisualization() {
    const steps = [
        { icon: Briefcase, title: 'Add new job posting', desc: 'Create Job', color: 'bg-indigo-100 text-indigo-600' },
        { icon: Bot, title: 'Find matching candidates', desc: 'AI Match', color: 'bg-purple-100 text-purple-600' },
        { icon: Mail, title: 'Email screening link', desc: 'Send Invite', color: 'bg-blue-100 text-blue-600' },
        { icon: Users, title: 'Voice screening', desc: 'AI Interview', color: 'bg-cyan-100 text-cyan-600' },
        { icon: FileText, title: 'AI analysis', desc: 'Generate Report', color: 'bg-emerald-100 text-emerald-600' },
        { icon: CheckCircle, title: 'Best candidates', desc: 'Auto-Select', color: 'bg-green-100 text-green-600' }
    ];

    return (
        <Card className="p-6 border border-slate-200 shadow-sm bg-slate-900">
            <h3 className="text-lg font-bold text-white mb-6">AI Recruitment Workflow</h3>
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                {steps.map((step, idx) => (
                    <React.Fragment key={idx}>
                        <div className="flex flex-col items-center min-w-[140px]">
                            <div className={`h-14 w-14 rounded-full ${step.color} flex items-center justify-center mb-3`}>
                                <step.icon size={24} />
                            </div>
                            <p className="text-xs font-semibold text-blue-400 text-center mb-1">{step.desc}</p>
                            <p className="text-[11px] text-slate-400 text-center">{step.title}</p>
                        </div>
                        {idx < steps.length - 1 && (
                            <ArrowRight size={20} className="text-slate-600 flex-shrink-0" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </Card>
    );
}
