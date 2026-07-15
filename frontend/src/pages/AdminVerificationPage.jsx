import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@/hooks/useUser';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ShieldCheck, ShieldAlert, FileText, ExternalLink, Globe, Link2, AlertTriangle, AlertCircle, Building2, Phone, MapPin, Loader2, CheckCircle2, User, LogOut } from 'lucide-react';

export default function AdminVerificationPage() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();

    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All'); // All, Pending, Verified, Rejected, Suspended
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [reviewing, setReviewing] = useState(false);

    // Mock role setting for testing
    const [roleUpdating, setRoleUpdating] = useState(false);

    const checkAdminRole = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/me?clerkId=${user.id}`);
            const userData = await res.json();
            if (userData.role === 'admin') {
                setIsAdmin(true);
                fetchCompanies();
            } else {
                setIsAdmin(false);
                setLoading(false);
            }
        } catch (err) {
            console.error('Error verifying user role:', err);
            setIsAdmin(false);
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/companies/all?clerkId=${user.id}`);
            if (!res.ok) throw new Error('Failed to fetch companies list.');
            const data = await res.json();
            setCompanies(data);
            if (data.length > 0) {
                setSelectedCompany(data[0]);
            }
        } catch (err) {
            console.error('Error fetching companies:', err);
            toast.error(err.message || 'Access Denied: Admin role needed.');
        } finally {
            setLoading(false);
        }
    };

    // Helper to toggle admin role for testing
    const makeMeAdmin = async () => {
        if (!user) return;
        setRoleUpdating(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: user.id,
                    emailAddresses: [{ emailAddress: user.primaryEmailAddress?.emailAddress }],
                    firstName: user.firstName,
                    lastName: user.lastName,
                    imageUrl: user.imageUrl,
                    role: 'admin' // Force role to admin
                }),
            });

            if (response.ok) {
                toast.success('Successfully synced as Admin! Reloading...');
                setIsAdmin(true);
                fetchCompanies();
            } else {
                toast.error('Failed to change role.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to set role.');
        } finally {
            setRoleUpdating(false);
        }
    };

    useEffect(() => {
        if (isLoaded && user) {
            checkAdminRole();
        }
    }, [isLoaded, user]);

    const handleReviewAction = async (action) => {
        if (!selectedCompany || !user) return;
        setReviewing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/companies/${selectedCompany._id}/review`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clerkId: user.id,
                    action
                })
            });

            if (!res.ok) throw new Error('Failed to submit review action');

            const data = await res.json();
            toast.success(`Company verification set to: ${data.company.verificationStatus}`);
            
            // Refresh list
            const updatedCompanies = companies.map(c => c._id === data.company._id ? data.company : c);
            setCompanies(updatedCompanies);
            setSelectedCompany(data.company);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Action failed.');
        } finally {
            setReviewing(false);
        }
    };

    const getTrustDetails = (score) => {
        if (score >= 90) return { label: 'Trusted', color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200' };
        if (score >= 70) return { label: 'Verified', color: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-755 dark:text-indigo-300 border-indigo-200' };
        if (score >= 40) return { label: 'Needs Review', color: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200' };
        return { label: 'High Risk', color: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200' };
    };

    const filteredCompanies = companies.filter(c => filterStatus === 'All' || c.verificationStatus === filterStatus);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-indigo-600 h-10 w-10" />
                    <p className="text-sm font-semibold text-slate-650 dark:text-slate-400">Loading admin portal...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <Card className="max-w-md p-8 border-amber-200 dark:border-amber-900/40 bg-white dark:bg-slate-900 shadow-xl text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20 rounded-full flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Access Denied</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-450 leading-relaxed">
                        You do not have Administrator permissions. To test the Admin Company Verification dashboard, click the button below to temporary assign the "Admin" role to your account.
                    </p>
                    <Button onClick={makeMeAdmin} disabled={roleUpdating} className="w-full bg-indigo-600 text-white hover:bg-indigo-755 font-semibold">
                        {roleUpdating ? 'Configuring Admin role...' : 'Mock Admin Credentials'}
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
            <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 py-4 px-6 flex justify-between items-center z-50">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-rose-600" />
                    <span className="font-extrabold text-xl text-slate-900 dark:text-slate-100">RecruitAI</span>
                    <span className="text-xs px-2 py-0.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 rounded-full font-semibold border border-rose-100 dark:border-rose-900/30">Admin Dashboard</span>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-1.5">
                         Go to Recruiter App
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => signOut(() => navigate('/'))} className="gap-1.5">
                        <LogOut size={14} /> Sign Out
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Companies list */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Registration Audits</h2>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {['All', 'Pending', 'Verified', 'Rejected', 'Suspended'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setFilterStatus(st)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
                                        filterStatus === st
                                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>

                        {filteredCompanies.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-8">No companies found.</p>
                        ) : (
                            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                                {filteredCompanies.map((c) => (
                                    <div
                                        key={c._id}
                                        onClick={() => setSelectedCompany(c)}
                                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                                            selectedCompany?._id === c._id
                                                ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-350'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{c.companyName}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                c.verificationStatus === 'Verified' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' :
                                                c.verificationStatus === 'Pending' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
                                                'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                                            }`}>
                                                {c.verificationStatus}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate mb-2">{c.website}</p>
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-500">Score: <strong className="font-bold">{c.trustScore}</strong></span>
                                            {c.fraudFlags.length > 0 && (
                                                <span className="text-rose-600 dark:text-rose-400 font-semibold">{c.fraudFlags.length} Flags</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Selected Company Details */}
                <div className="lg:col-span-2">
                    {selectedCompany ? (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500" />
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {selectedCompany.logoUrl ? (
                                            <img src={`${API_BASE_URL}${selectedCompany.logoUrl}`} alt="logo" className="w-12 h-12 rounded-lg object-contain border border-slate-100 bg-white" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                                                <Building2 size={24} />
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedCompany.companyName}</h2>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                    selectedCompany.verificationStatus === 'Verified' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' :
                                                    selectedCompany.verificationStatus === 'Pending' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
                                                    'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                                                }`}>
                                                    Status: {selectedCompany.verificationStatus}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getTrustDetails(selectedCompany.trustScore).color}`}>
                                                    Trust: {selectedCompany.trustScore}/100 ({getTrustDetails(selectedCompany.trustScore).label})
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleReviewAction('Approve')}
                                            disabled={reviewing || selectedCompany.verificationStatus === 'Verified'}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleReviewAction('Reject')}
                                            disabled={reviewing || selectedCompany.verificationStatus === 'Rejected'}
                                            className="bg-rose-600 hover:bg-rose-750 text-white font-semibold"
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleReviewAction('Request Additional Documents')}
                                            disabled={reviewing}
                                            variant="outline"
                                            className="font-semibold"
                                        >
                                            Request Docs
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleReviewAction('Suspend')}
                                            disabled={reviewing || selectedCompany.verificationStatus === 'Suspended'}
                                            className="bg-slate-700 hover:bg-slate-800 text-white font-semibold"
                                        >
                                            Suspend
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* Trust score & Fraud flags panel */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Fraud flags */}
                                <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-4">
                                        <AlertCircle size={16} className="text-rose-500" /> Auto-Detected Fraud Flags
                                    </h3>
                                    {selectedCompany.fraudFlags.length === 0 ? (
                                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 p-2.5 rounded-lg">
                                            <CheckCircle2 size={14} /> No issues found. Highly consistent profile.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedCompany.fraudFlags.map((flag, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/35 text-rose-700 dark:text-rose-300">
                                                    <span>{flag}</span>
                                                    <span className="text-[9px] font-bold uppercase bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 rounded">Flagged</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>

                                {/* Documents list */}
                                <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-4">
                                        <FileText size={16} className="text-indigo-500" /> Uploaded Credentials
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedCompany.documents.map((doc, idx) => (
                                            <a
                                                key={idx}
                                                href={`${API_BASE_URL}${doc.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-350 transition-all font-semibold"
                                            >
                                                <span>{doc.name}</span>
                                                <ExternalLink size={14} className="text-slate-400 hover:text-indigo-600" />
                                            </a>
                                        ))}
                                    </div>
                                </Card>
                            </div>

                            {/* Detailed Fields info */}
                            <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">Detailed Application Audit</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Recruiter Clerk ID</span>
                                        <span className="font-mono text-slate-800 dark:text-slate-200">{selectedCompany.clerkId}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Official email</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCompany.companyEmail}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Website</span>
                                        <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                            {selectedCompany.website} <Globe size={12} />
                                        </a>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">LinkedIn Profile</span>
                                        <a href={selectedCompany.linkedin} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                            {selectedCompany.linkedin} <Link2 size={12} />
                                        </a>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Corporate Phone</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCompany.phone}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Office Address</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCompany.address}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">GST Code (GSTIN)</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCompany.gst || 'Not Provided'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">CIN Code</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCompany.cin || 'Not Provided'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Startup India Registration</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCompany.startupIndiaId || 'Not Provided'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Industry / Domain</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCompany.industry}</span>
                                    </div>
                                    <div className="md:col-span-2 mt-2">
                                        <span className="text-slate-400 block mb-0.5">About Company / What We Do</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 block bg-slate-50 dark:bg-slate-950 p-2.5 rounded border dark:border-slate-800 whitespace-pre-wrap">{selectedCompany.description || 'Not Provided'}</span>
                                    </div>
                                    <div className="md:col-span-2 mt-2">
                                        <span className="text-slate-400 block mb-0.5">Company Goal & Vision</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 block bg-slate-50 dark:bg-slate-950 p-2.5 rounded border dark:border-slate-800 whitespace-pre-wrap">{selectedCompany.goal || 'Not Provided'}</span>
                                    </div>
                                    <div className="md:col-span-2 mt-2">
                                        <span className="text-slate-400 block mb-0.5">Services Provided</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 block bg-slate-50 dark:bg-slate-950 p-2.5 rounded border dark:border-slate-800 whitespace-pre-wrap">{selectedCompany.services || 'Not Provided'}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center text-slate-400">
                            Select a company to show audits.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
