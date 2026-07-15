import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@/hooks/useUser';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ShieldCheck, ShieldAlert, FileText, Upload, LogOut, CheckCircle2, AlertTriangle, AlertCircle, Building2, Globe, Link2, Phone, MapPin, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function CompanyVerificationPage() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();

    const [status, setStatus] = useState('Checking'); // Checking, Not Registered, Pending, Verified, Rejected, Suspended
    const [companyDetails, setCompanyDetails] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(true);

    // Form inputs
    const [formData, setFormData] = useState({
        companyName: '',
        companyEmail: '',
        website: '',
        linkedin: '',
        phone: '',
        address: '',
        industry: '',
        companySize: '',
        gst: '',
        cin: '',
        startupIndiaId: '',
        goal: '',
        description: '',
        services: ''
    });

    // Uploaded files
    const [logoFile, setLogoFile] = useState(null);
    const [coiFile, setCoiFile] = useState(null);
    const [gstCertFile, setGstCertFile] = useState(null);

    const fetchVerificationStatus = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/companies/status?clerkId=${user.id}`);
            const data = await res.json();
            setStatus(data.status);

            if (data.status !== 'Not Registered') {
                const detailsRes = await fetch(`${API_BASE_URL}/api/companies/my-company?clerkId=${user.id}`);
                const detailsData = await detailsRes.json();
                setCompanyDetails(detailsData);
                if (detailsData) {
                    setFormData({
                        companyName: detailsData.companyName || '',
                        companyEmail: detailsData.companyEmail || '',
                        website: detailsData.website || '',
                        linkedin: detailsData.linkedin || '',
                        phone: detailsData.phone || '',
                        address: detailsData.address || '',
                        industry: detailsData.industry || '',
                        companySize: detailsData.companySize || '',
                        gst: detailsData.gst || '',
                        cin: detailsData.cin || '',
                        startupIndiaId: detailsData.startupIndiaId || '',
                        goal: detailsData.goal || '',
                        description: detailsData.description || '',
                        services: detailsData.services || ''
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching verification status:', err);
            toast.error('Failed to load company verification status');
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        if (isLoaded && user) {
            fetchVerificationStatus();
        }
    }, [isLoaded, user]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e, setFile) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Standard validation checks
        if (!formData.companyName.trim() || !formData.companyEmail.trim() || !formData.website.trim() ||
            !formData.linkedin.trim() || !formData.phone.trim() || !formData.address.trim() ||
            !formData.industry.trim() || !formData.companySize.trim() ||
            !formData.goal.trim() || !formData.description.trim() || !formData.services.trim()) {
            toast.error('Please fill in all required fields.');
            return;
        }

        // Require files on initial submission
        if (status === 'Not Registered' && (!logoFile || !coiFile)) {
            toast.error('Logo and Certificate of Incorporation (COI) are required.');
            return;
        }

        setSubmitting(true);
        const data = new FormData();
        data.append('clerkId', user.id);
        Object.keys(formData).forEach(key => {
            data.append(key, formData[key]);
        });

        if (logoFile) data.append('logo', logoFile);
        if (coiFile) data.append('coi', coiFile);
        if (gstCertFile) data.append('gstCert', gstCertFile);

        try {
            const response = await fetch(`${API_BASE_URL}/api/companies/verify`, {
                method: 'POST',
                body: data
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to submit verification request.');
            }

            toast.success('Company verification submitted successfully!');
            fetchVerificationStatus();
        } catch (err) {
            console.error('Submit error:', err);
            toast.error(err.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignOut = () => {
        signOut(() => navigate('/'));
    };

    if (loadingStatus) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-indigo-600 h-10 w-10" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading your verification status...</p>
                </div>
            </div>
        );
    }

    // Trust Score status labels
    const getTrustStatus = (score) => {
        if (score >= 90) return { label: 'Trusted', color: 'bg-emerald-500 text-white', border: 'border-emerald-600' };
        if (score >= 70) return { label: 'Verified', color: 'bg-indigo-500 text-white', border: 'border-indigo-600' };
        if (score >= 40) return { label: 'Needs Review', color: 'bg-amber-500 text-white', border: 'border-amber-600' };
        return { label: 'High Risk', color: 'bg-rose-500 text-white', border: 'border-rose-600' };
    };

    const trustBadge = companyDetails ? getTrustStatus(companyDetails.trustScore) : null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
            <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 py-4 px-6 flex justify-between items-center z-50">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-indigo-600" />
                    <span className="font-extrabold text-xl bg-gradient-to-r bg-clip-text text-transparent from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">RecruitAI</span>
                    <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 rounded-full font-semibold border border-indigo-100 dark:border-indigo-900/30">Verification Portal</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 dark:text-slate-450">{user?.primaryEmailAddress?.emailAddress}</span>
                    <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5">
                        <LogOut size={14} /> Sign Out
                    </Button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto mt-10 px-4">
                {/* 1. Account Suspended View */}
                {status === 'Suspended' && (
                    <Card className="p-8 border-rose-200 dark:border-rose-950/40 bg-white dark:bg-slate-900 shadow-xl">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-full text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20">
                                <ShieldAlert size={48} className="animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Account Suspended</h2>
                            <p className="max-w-md text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                Your recruiter account and company registration have been suspended by the platform administrator due to a violation of guidelines or compliance flags. Please contact support if you believe this is an error.
                            </p>
                        </div>
                    </Card>
                )}

                {/* 2. Verification Pending View */}
                {status === 'Pending' && companyDetails && (
                    <div className="space-y-6">
                        <Card className="p-8 border-amber-200 dark:border-amber-950/40 bg-white dark:bg-slate-900 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-amber-500" />
                            <div className="flex items-start gap-5">
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20">
                                    <AlertTriangle size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Verification Pending Review</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Your company information has been submitted and is currently being audited by our trust & safety team. You will be able to post jobs once verification is approved.
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 pt-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-full border border-amber-100 dark:border-amber-900/30">
                                            Status: Under Review
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${trustBadge?.color} ${trustBadge?.border}`}>
                                            Trust: {companyDetails.trustScore}/100 ({trustBadge?.label})
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Fraud flags warning */}
                        {companyDetails.fraudFlags.length > 0 && (
                            <Card className="p-6 border-rose-100 dark:border-rose-900/20 bg-rose-50/50 dark:bg-rose-950/10">
                                <h3 className="text-sm font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5 mb-3">
                                    <AlertCircle size={16} /> Compliance Flag Warnings
                                </h3>
                                <p className="text-xs text-rose-700 dark:text-rose-450 mb-4">
                                    Our automated scanners detected these anomalies in your registration. These flags do not mean you are rejected, but require manual review by our administration.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {companyDetails.fraudFlags.map((flag, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 text-xs font-medium border border-rose-200 dark:border-rose-800">
                                            {flag}
                                        </span>
                                    ))}
                                </div>
                            </Card>
                        )}

                        <Card className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">Submitted Company Profile</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <div>
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Company Name</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{companyDetails.companyName}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Official Company Email</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{companyDetails.companyEmail}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Website URL</span>
                                    <a href={companyDetails.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                        {companyDetails.website} <Globe size={12} />
                                    </a>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">LinkedIn Company Page</span>
                                    <a href={companyDetails.linkedin} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                        View Page <Link2 size={12} />
                                    </a>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Phone Number</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{companyDetails.phone}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Office Address</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{companyDetails.address}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Industry</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{companyDetails.industry}</span>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Company Size</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{companyDetails.companySize}</span>
                                </div>
                                <div className="md:col-span-2">
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">About Company / What We Do</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed block bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border dark:border-slate-800/80 whitespace-pre-wrap">{companyDetails.description || 'Not Provided'}</span>
                                </div>
                                <div className="md:col-span-2">
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Company Goal & Vision</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed block bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border dark:border-slate-800/80 whitespace-pre-wrap">{companyDetails.goal || 'Not Provided'}</span>
                                </div>
                                <div className="md:col-span-2">
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Services Provided</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed block bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border dark:border-slate-800/80 whitespace-pre-wrap">{companyDetails.services || 'Not Provided'}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* 3. Not Registered or Rejected Form Submission View */}
                {(status === 'Not Registered' || status === 'Rejected') && (
                    <div className="space-y-6">
                        {status === 'Rejected' && (
                            <Card className="p-6 border-rose-200 dark:border-rose-950/40 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-sm">Company Verification Rejected</h3>
                                        <p className="text-xs mt-1 leading-relaxed">
                                            The review team rejected your verification. This may be due to missing details or document mismatch. Please update and re-submit the form below.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        <Card className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
                            <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Register & Verify Your Company</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    To post jobs, please fill out the official company details. Our scanning logic will check your domain and credentials.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Company Name */}
                                    <div className="space-y-2">
                                        <Label htmlFor="companyName" className="font-semibold text-slate-700 dark:text-slate-300">Company Name *</Label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                                            <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="e.g. Acme Corp" className="pl-10" required />
                                        </div>
                                    </div>

                                    {/* Official Email */}
                                    <div className="space-y-2">
                                        <Label htmlFor="companyEmail" className="font-semibold text-slate-700 dark:text-slate-300">Official Company Email *</Label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                                            <Input id="companyEmail" name="companyEmail" type="email" value={formData.companyEmail} onChange={handleInputChange} placeholder="e.g. hr@acme.com" className="pl-10" required />
                                        </div>
                                        <p className="text-[11px] text-slate-400">Must belong to your corporate domain.</p>
                                    </div>

                                    {/* Company Website */}
                                    <div className="space-y-2">
                                        <Label htmlFor="website" className="font-semibold text-slate-700 dark:text-slate-300">Company Website *</Label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                                            <Input id="website" name="website" value={formData.website} onChange={handleInputChange} placeholder="e.g. https://acme.com" className="pl-10" required />
                                        </div>
                                    </div>

                                    {/* LinkedIn Company URL */}
                                    <div className="space-y-2">
                                        <Label htmlFor="linkedin" className="font-semibold text-slate-700 dark:text-slate-300">LinkedIn Company Page *</Label>
                                        <div className="relative">
                                            <Link2 className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                                            <Input id="linkedin" name="linkedin" value={formData.linkedin} onChange={handleInputChange} placeholder="e.g. https://linkedin.com/company/acme" className="pl-10" required />
                                        </div>
                                    </div>

                                    {/* Company Phone */}
                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="font-semibold text-slate-700 dark:text-slate-300">Company Phone Number *</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                                            <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="e.g. +1 555-0199" className="pl-10" required />
                                        </div>
                                    </div>

                                    {/* Industry */}
                                    <div className="space-y-2">
                                        <Label htmlFor="industry" className="font-semibold text-slate-700 dark:text-slate-300">Industry *</Label>
                                        <Input id="industry" name="industry" value={formData.industry} onChange={handleInputChange} placeholder="e.g. Software, Healthcare" required />
                                    </div>

                                    {/* Company Size */}
                                    <div className="space-y-2">
                                        <Label htmlFor="companySize" className="font-semibold text-slate-700 dark:text-slate-300">Company Size *</Label>
                                        <select id="companySize" name="companySize" value={formData.companySize} onChange={handleInputChange} className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100" required>
                                            <option value="">Select Size</option>
                                            <option value="1-10">1-10 employees</option>
                                            <option value="11-50">11-50 employees</option>
                                            <option value="51-200">51-200 employees</option>
                                            <option value="201-500">201-500 employees</option>
                                            <option value="501+">501+ employees</option>
                                        </select>
                                    </div>

                                    {/* Office Address */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="address" className="font-semibold text-slate-700 dark:text-slate-300">Office Address *</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                                            <Textarea id="address" name="address" value={formData.address} onChange={handleInputChange} placeholder="e.g. 100 Main St, San Francisco, CA" className="pl-10 min-h-[80px]" required />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="description" className="font-semibold text-slate-700 dark:text-slate-300">About Company / What We Do *</Label>
                                        <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Describe what your company does, its core business, and focus area." className="min-h-[80px]" required />
                                    </div>

                                    {/* Goal */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="goal" className="font-semibold text-slate-700 dark:text-slate-300">Company Goal & Vision *</Label>
                                        <Textarea id="goal" name="goal" value={formData.goal} onChange={handleInputChange} placeholder="Describe the company's primary target, vision, or goal." className="min-h-[80px]" required />
                                    </div>

                                    {/* Services */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="services" className="font-semibold text-slate-700 dark:text-slate-300">Services Offered *</Label>
                                        <Textarea id="services" name="services" value={formData.services} onChange={handleInputChange} placeholder="What services or products does your company offer to clients or other companies?" className="min-h-[80px]" required />
                                    </div>

                                    <div className="border-t border-slate-100 dark:border-slate-800 md:col-span-2 pt-4">
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-4">Verification IDs (Optional)</h3>
                                    </div>

                                    {/* GST Number */}
                                    <div className="space-y-2">
                                        <Label htmlFor="gst" className="font-semibold text-slate-750 dark:text-slate-350">GST Number</Label>
                                        <Input id="gst" name="gst" value={formData.gst} onChange={handleInputChange} placeholder="e.g. 22AAAAA0000A1Z5" />
                                    </div>

                                    {/* CIN Number */}
                                    <div className="space-y-2">
                                        <Label htmlFor="cin" className="font-semibold text-slate-750 dark:text-slate-350">CIN Number</Label>
                                        <Input id="cin" name="cin" value={formData.cin} onChange={handleInputChange} placeholder="e.g. L01234MH2020PLC123456" />
                                    </div>

                                    {/* Startup India ID */}
                                    <div className="space-y-2">
                                        <Label htmlFor="startupIndiaId" className="font-semibold text-slate-750 dark:text-slate-350">Startup India ID</Label>
                                        <Input id="startupIndiaId" name="startupIndiaId" value={formData.startupIndiaId} onChange={handleInputChange} placeholder="e.g. DIPP12345" />
                                    </div>

                                    <div className="border-t border-slate-100 dark:border-slate-800 md:col-span-2 pt-4">
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-4 font-semibold">Document Uploads *</h3>
                                    </div>

                                    {/* Logo upload */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-slate-700 dark:text-slate-300">Company Logo *</Label>
                                        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                                            <Upload className="h-6 w-6 text-slate-400 mb-1.5" />
                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLogoFile)} className="text-xs text-slate-500 w-full" required={status === 'Not Registered'} />
                                            {logoFile && <span className="text-[11px] text-emerald-600 font-semibold mt-1">Selected: {logoFile.name}</span>}
                                        </div>
                                    </div>

                                    {/* COI upload */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-slate-700 dark:text-slate-300">Certificate of Incorporation (COI) *</Label>
                                        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                                            <Upload className="h-6 w-6 text-slate-400 mb-1.5" />
                                            <input type="file" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, setCoiFile)} className="text-xs text-slate-500 w-full" required={status === 'Not Registered'} />
                                            {coiFile && <span className="text-[11px] text-emerald-600 font-semibold mt-1">Selected: {coiFile.name}</span>}
                                        </div>
                                    </div>

                                    {/* GST Certificate upload */}
                                    <div className="space-y-2">
                                        <Label className="font-semibold text-slate-700 dark:text-slate-300">GST Certificate (Optional)</Label>
                                        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                                            <Upload className="h-6 w-6 text-slate-400 mb-1.5" />
                                            <input type="file" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, setGstCertFile)} className="text-xs text-slate-500 w-full" />
                                            {gstCertFile && <span className="text-[11px] text-emerald-600 font-semibold mt-1">Selected: {gstCertFile.name}</span>}
                                        </div>
                                    </div>
                                </div>

                                <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white hover:bg-indigo-700 h-11 text-sm font-semibold">
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting verification details...
                                        </>
                                    ) : (
                                        'Submit for Verification'
                                    )}
                                </Button>
                            </form>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
