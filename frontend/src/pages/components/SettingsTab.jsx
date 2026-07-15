import React, { useState, useEffect } from 'react';
import { useUser } from "@/hooks/useUser";
import { 
    Settings, User, Building2, Bell, Shield, 
    Mail, Globe, MapPin, Save, Loader2, Moon, Sun, Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme-provider';
import { API_BASE_URL } from '@/lib/api';

export default function SettingsTab() {
    const { user } = useUser();
    const { theme, setTheme } = useTheme();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState({
        companyName: '',
        website: '',
        industry: '',
        location: '',
        goal: '',
        description: '',
        services: '',
        emailNotifications: true,
        marketingEmails: false
    });

    useEffect(() => {
        const fetchCompanyData = async () => {
            if (!user?.id) return;
            try {
                const res = await fetch(`${API_BASE_URL}/api/companies/my-company?clerkId=${user.id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        setSettings(prev => ({
                            ...prev,
                            companyName: data.companyName || '',
                            website: data.website || '',
                            industry: data.industry || '',
                            location: data.address || '',
                            goal: data.goal || '',
                            description: data.description || '',
                            services: data.services || ''
                        }));
                    }
                }
            } catch (error) {
                console.error('Error fetching company details:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCompanyData();
    }, [user?.id]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/companies/update-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clerkId: user.id,
                    companyName: settings.companyName,
                    website: settings.website,
                    industry: settings.industry,
                    address: settings.location,
                    goal: settings.goal,
                    description: settings.description,
                    services: settings.services
                })
            });
            if (res.ok) {
                toast.success('Settings updated successfully!');
            } else {
                const errData = await res.json();
                toast.error(errData.error || 'Failed to update company profile');
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error('Network error while saving settings.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Settings</h2>
                <p className="text-slate-500 text-sm">Manage your recruiter profile and company preferences.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Recruiter Profile */}
                <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900/50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-indigo-600" />
                            <CardTitle className="text-lg">Recruiter Profile</CardTitle>
                        </div>
                        <CardDescription>Your personal information tied to your account.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input 
                                    id="fullName" 
                                    value={user?.fullName || ''} 
                                    disabled 
                                    className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-800" 
                                />
                                <p className="text-[10px] text-slate-400">Name is managed via Clerk authentication.</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email Address</Label>
                                <Input 
                                    id="email" 
                                    value={user?.primaryEmailAddress?.emailAddress || ''} 
                                    disabled 
                                    className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-800" 
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Appearance / Theme Settings */}
                <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900/50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Monitor className="h-5 w-5 text-indigo-600" />
                            <CardTitle className="text-lg">Appearance</CardTitle>
                        </div>
                        <CardDescription>Customize how RecruitAI looks on your device.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { id: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
                                { id: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
                                { id: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    type="button"
                                    onClick={() => setTheme(mode.id)}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                        theme === mode.id
                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {mode.icon}
                                    <span className="text-sm font-medium">{mode.label}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Company Information */}
                <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900/50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            <CardTitle className="text-lg">Company Information</CardTitle>
                        </div>
                        <CardDescription>Details about your organization.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="companyName">Company Name</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="companyName"
                                        name="companyName"
                                        placeholder="Acme Corp"
                                        value={settings.companyName}
                                        onChange={handleInputChange}
                                        className="pl-10 dark:bg-slate-900 dark:border-slate-800"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="website">Website</Label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="website"
                                        name="website"
                                        placeholder="https://example.com"
                                        value={settings.website}
                                        onChange={handleInputChange}
                                        className="pl-10 dark:bg-slate-900 dark:border-slate-800"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="industry">Industry</Label>
                                <Input 
                                    id="industry"
                                    name="industry"
                                    placeholder="Software Engineering"
                                    value={settings.industry}
                                    onChange={handleInputChange}
                                    className="dark:bg-slate-900 dark:border-slate-800"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="location">HQ Location</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input 
                                        id="location"
                                        name="location"
                                        placeholder="San Francisco, CA"
                                        value={settings.location}
                                        onChange={handleInputChange}
                                        className="pl-10 dark:bg-slate-900 dark:border-slate-800"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5 md:col-span-2 mt-2">
                                <Label htmlFor="description">About Company / What We Do</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    placeholder="Describe what your company does, its core business, and focus area."
                                    value={settings.description}
                                    onChange={handleInputChange}
                                    className="flex w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] dark:bg-slate-900 dark:text-slate-100"
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2 mt-2">
                                <Label htmlFor="goal">Company Goal & Vision</Label>
                                <textarea
                                    id="goal"
                                    name="goal"
                                    placeholder="Describe the company's primary target, vision, or goal."
                                    value={settings.goal}
                                    onChange={handleInputChange}
                                    className="flex w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] dark:bg-slate-900 dark:text-slate-100"
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2 mt-2">
                                <Label htmlFor="services">Services Offered</Label>
                                <textarea
                                    id="services"
                                    name="services"
                                    placeholder="What services or products does your company offer to clients or other companies?"
                                    value={settings.services}
                                    onChange={handleInputChange}
                                    className="flex w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] dark:bg-slate-900 dark:text-slate-100"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900/50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-indigo-600" />
                            <CardTitle className="text-lg">Notifications</CardTitle>
                        </div>
                        <CardDescription>Configure how you receive updates.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="mt-1">
                                    <input 
                                        type="checkbox"
                                        name="emailNotifications"
                                        checked={settings.emailNotifications}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Email Notifications</p>
                                    <p className="text-xs text-slate-500">Receive alerts about new candidate matches and interview schedules.</p>
                                </div>
                            </label>
                            
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="mt-1">
                                    <input 
                                        type="checkbox"
                                        name="marketingEmails"
                                        checked={settings.marketingEmails}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Marketing & Product Updates</p>
                                    <p className="text-xs text-slate-500">Stay up to date with new features and recruiting tips.</p>
                                </div>
                            </label>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-2">
                    <Button 
                        type="submit" 
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] gap-2"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
