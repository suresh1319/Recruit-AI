import Company from '../models/Company.js';
import User from '../models/User.js';
import Candidate from '../models/Candidate.js';
import connectDB from '../db/connect.js';
import dns from 'dns';
import { promisify } from 'util';

const lookupPromise = promisify(dns.lookup);
const PUBLIC_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'zoho.com', 'protonmail.com'];

const getDomainFromEmail = (email) => {
    if (!email) return '';
    return email.split('@')[1]?.toLowerCase().trim() || '';
};

const getDomainFromWebsite = (website) => {
    if (!website) return '';
    try {
        let cleanUrl = website.trim();
        if (!cleanUrl.startsWith('http')) {
            cleanUrl = 'http://' + cleanUrl;
        }
        const parsed = new URL(cleanUrl);
        let hostname = parsed.hostname.toLowerCase();
        if (hostname.startsWith('www.')) {
            hostname = hostname.substring(4);
        }
        return hostname;
    } catch {
        return '';
    }
};

const checkWebsite = async (urlStr) => {
    try {
        if (!urlStr) return { exists: false, https: false, reachable: false };
        const parsed = new URL(urlStr.startsWith('http') ? urlStr : `http://${urlStr}`);
        const hostname = parsed.hostname;

        // Try DNS resolution
        await lookupPromise(hostname);

        // Try fetching to check reachability
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(parsed.href, {
            method: 'HEAD',
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }).catch(async () => {
            return await fetch(parsed.href, {
                method: 'GET',
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
        });

        clearTimeout(timeoutId);

        return {
            exists: true,
            https: parsed.protocol === 'https:',
            reachable: res.ok || res.status < 500
        };
    } catch (e) {
        return { exists: false, https: false, reachable: false };
    }
};

export const submitVerification = async (req, res) => {
    try {
        const {
            clerkId,
            companyName,
            companyEmail,
            website,
            linkedin,
            phone,
            address,
            industry,
            companySize,
            gst,
            cin,
            startupIndiaId,
            goal,
            description,
            services
        } = req.body;

        if (!clerkId) return res.status(400).json({ error: 'clerkId is required' });
        if (!companyName || !companyEmail || !website || !linkedin || !phone || !address || !industry || !companySize || !goal || !description || !services) {
            return res.status(400).json({ error: 'All required fields must be completed' });
        }

        await connectDB();

        // 1. Fetch user (recruiter) to get Google OAuth Email
        const user = await User.findOne({ clerkId });
        if (!user) return res.status(404).json({ error: 'Recruiter profile not found' });
        const googleEmail = user.email || '';

        // Retrieve uploaded files
        const files = req.files || {};
        const logoFile = files.logo ? files.logo[0] : null;
        const coiFile = files.coi ? files.coi[0] : null;
        const gstCertFile = files.gstCert ? files.gstCert[0] : null;

        // Check if updating or creating
        const existingCompany = await Company.findOne({ clerkId });

        // Required upload validation (Logo and COI are required on initial submission)
        if (!existingCompany && (!logoFile || !coiFile)) {
            return res.status(400).json({ error: 'Company Logo and Certificate of Incorporation (COI) are required.' });
        }

        // Determine file URLs (save paths as static references)
        const logoUrl = logoFile ? `/uploads/company_docs/${logoFile.filename}` : (existingCompany ? existingCompany.logoUrl : '');
        const coiUrl = coiFile ? `/uploads/company_docs/${coiFile.filename}` : (existingCompany ? existingCompany.coiUrl : '');
        const gstCertUrl = gstCertFile ? `/uploads/company_docs/${gstCertFile.filename}` : (existingCompany ? existingCompany.gstCertUrl : '');

        // 2. Perform validations
        const fraudFlags = [];
        let trustScore = 0;

        // Email checks
        const googleEmailDomain = getDomainFromEmail(googleEmail);
        const companyEmailDomain = getDomainFromEmail(companyEmail);
        const websiteDomain = getDomainFromWebsite(website);

        // Gmail, Yahoo, Outlook used checks
        if (PUBLIC_DOMAINS.includes(googleEmailDomain) || PUBLIC_DOMAINS.includes(companyEmailDomain)) {
            if (googleEmailDomain === 'gmail.com' || companyEmailDomain === 'gmail.com') fraudFlags.push('Gmail used');
            if (googleEmailDomain === 'yahoo.com' || companyEmailDomain === 'yahoo.com') fraudFlags.push('Yahoo used');
            if (googleEmailDomain === 'outlook.com' || companyEmailDomain === 'outlook.com') fraudFlags.push('Outlook used');
        }

        // Website validation
        const webCheck = await checkWebsite(website);
        if (!website) {
            fraudFlags.push('Website missing');
        } else if (!webCheck.reachable) {
            fraudFlags.push('Website unreachable');
        }

        // Domain mismatch checks (Google email domain vs Website domain)
        const isDomainMatch = googleEmailDomain && websiteDomain && (googleEmailDomain === websiteDomain);
        if (!isDomainMatch) {
            fraudFlags.push('Website domain mismatch');
        }

        // LinkedIn checks
        const isLinkedInValid = linkedin && (linkedin.includes('linkedin.com/company/') || linkedin.includes('linkedin.com/school/'));
        if (!isLinkedInValid) {
            fraudFlags.push('Invalid LinkedIn URL');
        }

        // Documents checks
        if (!coiUrl || !logoUrl) {
            fraudFlags.push('Missing documents');
        }

        // Duplicate checks
        const dupName = await Company.findOne({ companyName: { $regex: new RegExp(`^${companyName.trim()}$`, 'i') }, clerkId: { $ne: clerkId } });
        if (dupName) fraudFlags.push('Duplicate company registration');

        if (gst && gst.trim()) {
            const dupGst = await Company.findOne({ gst: gst.trim(), clerkId: { $ne: clerkId } });
            if (dupGst) fraudFlags.push('Duplicate GST');
        }

        if (cin && cin.trim()) {
            const dupCin = await Company.findOne({ cin: cin.trim(), clerkId: { $ne: clerkId } });
            if (dupCin) fraudFlags.push('Duplicate CIN');
        }

        // 3. Trust Score calculation
        // Business email (+20)
        const isBusinessEmail = companyEmailDomain && !PUBLIC_DOMAINS.includes(companyEmailDomain);
        if (isBusinessEmail) trustScore += 20;

        // Website verified (+15)
        if (webCheck.reachable) trustScore += 15;

        // Domain match (+20)
        if (isDomainMatch) trustScore += 20;

        // LinkedIn present (+10)
        if (isLinkedInValid) trustScore += 10;

        // GST added (+10)
        if (gst && gst.trim()) trustScore += 10;

        // CIN added (+15)
        if (cin && cin.trim()) trustScore += 15;

        // Documents uploaded (+10)
        if (coiUrl && logoUrl) trustScore += 10;

        // Phone verified (+10)
        if (phone && phone.trim()) trustScore += 10;

        // Documents array
        const documents = [];
        if (logoUrl) documents.push({ name: 'Company Logo', url: logoUrl, type: 'logo' });
        if (coiUrl) documents.push({ name: 'Certificate of Incorporation', url: coiUrl, type: 'coi' });
        if (gstCertUrl) documents.push({ name: 'GST Certificate', url: gstCertUrl, type: 'gst' });

        const companyData = {
            clerkId,
            companyName: companyName.trim(),
            companyEmail: companyEmail.trim(),
            website: website.trim(),
            linkedin: linkedin.trim(),
            phone: phone.trim(),
            address: address.trim(),
            industry,
            companySize,
            gst: gst ? gst.trim() : '',
            cin: cin ? cin.trim() : '',
            startupIndiaId: startupIndiaId ? startupIndiaId.trim() : '',
            logoUrl,
            coiUrl,
            gstCertUrl,
            trustScore,
            fraudFlags,
            documents,
            verificationStatus: existingCompany ? existingCompany.verificationStatus : 'Pending',
            goal: goal ? goal.trim() : '',
            description: description ? description.trim() : '',
            services: services ? services.trim() : ''
        };

        let savedCompany;
        if (existingCompany) {
            // Keep status pending or reset it if rejected, unless suspended/verified (let recruiter re-submit details)
            if (existingCompany.verificationStatus === 'Rejected') {
                companyData.verificationStatus = 'Pending';
            }
            savedCompany = await Company.findOneAndUpdate({ clerkId }, { $set: companyData }, { new: true });
        } else {
            savedCompany = await Company.create(companyData);
        }

        res.status(200).json({ message: 'Verification form submitted successfully', company: savedCompany });
    } catch (error) {
        console.error('Submit verification error:', error);
        res.status(500).json({ error: 'Failed to submit verification' });
    }
};

export const getCompanyStatus = async (req, res) => {
    try {
        const { clerkId } = req.query;
        if (!clerkId) return res.status(400).json({ error: 'Missing clerkId' });

        await connectDB();
        const company = await Company.findOne({ clerkId });
        if (!company) {
            return res.status(200).json({ status: 'Not Registered', trustScore: 0, fraudFlags: [] });
        }

        res.status(200).json({
            status: company.verificationStatus,
            trustScore: company.trustScore,
            fraudFlags: company.fraudFlags,
            companyName: company.companyName
        });
    } catch (error) {
        console.error('Get company status error:', error);
        res.status(500).json({ error: 'Failed to fetch company verification status' });
    }
};

export const getMyCompany = async (req, res) => {
    try {
        const { clerkId } = req.query;
        if (!clerkId) return res.status(400).json({ error: 'Missing clerkId' });

        await connectDB();
        const company = await Company.findOne({ clerkId });
        res.status(200).json(company || null);
    } catch (error) {
        console.error('Get my company error:', error);
        res.status(500).json({ error: 'Failed to fetch company details' });
    }
};

export const getAllCompanies = async (req, res) => {
    try {
        const { clerkId } = req.query;
        if (!clerkId) return res.status(400).json({ error: 'Missing clerkId' });

        await connectDB();
        const user = await User.findOne({ clerkId });
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
        }

        const companies = await Company.find().sort({ createdAt: -1 });
        res.status(200).json(companies);
    } catch (error) {
        console.error('Get all companies error:', error);
        res.status(500).json({ error: 'Failed to fetch companies list' });
    }
};

export const reviewCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { clerkId, action, reason } = req.body; // action: Approve, Reject, Request Additional Documents, Suspend

        if (!clerkId) return res.status(400).json({ error: 'clerkId is required' });
        if (!action) return res.status(400).json({ error: 'Action is required' });

        await connectDB();
        const adminUser = await User.findOne({ clerkId });
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
        }

        let newStatus = 'Pending';
        if (action === 'Approve') newStatus = 'Verified';
        else if (action === 'Reject') newStatus = 'Rejected';
        else if (action === 'Suspend') newStatus = 'Suspended';
        else if (action === 'Request Additional Documents') newStatus = 'Pending';

        const updatedCompany = await Company.findByIdAndUpdate(
            id,
            {
                $set: {
                    verificationStatus: newStatus,
                    verifiedBy: adminUser.email,
                    verifiedAt: new Date()
                }
            },
            { new: true }
        );

        if (!updatedCompany) return res.status(404).json({ error: 'Company not found' });

        res.status(200).json({ message: `Company successfully set to ${newStatus}`, company: updatedCompany });
    } catch (error) {
        console.error('Review company error:', error);
        res.status(500).json({ error: 'Failed to process company review' });
    }
};

export const seedMockData = async (req, res) => {
    try {
        await connectDB();

        // Clean up any stale/invalid statuses in the DB
        await Candidate.updateMany(
            { status: 'Screening Pending' },
            { $set: { status: 'pending' } }
        );

        // 1. Mock Candidate
        await User.findOneAndUpdate(
            { clerkId: 'mock_candidate_id' },
            {
                clerkId: 'mock_candidate_id',
                email: 'candidate@acme.com',
                firstName: 'John',
                lastName: 'Candidate',
                role: 'candidate',
                imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
            },
            { upsert: true }
        );
        await Candidate.findOneAndUpdate(
            { clerkId: 'mock_candidate_id' },
            {
                clerkId: 'mock_candidate_id',
                name: 'John Candidate',
                email: 'candidate@acme.com',
                phone: '+1 555-0199',
                role: 'Software Engineer',
                experienceSummary: '3 years of React and Node.js development.',
                skills: ['React', 'Node.js', 'Express', 'MongoDB'],
                status: 'pending'
            },
            { upsert: true }
        );

        // 2. Mock Pending Recruiter & Company
        await User.findOneAndUpdate(
            { clerkId: 'mock_pending_recruiter_id' },
            {
                clerkId: 'mock_pending_recruiter_id',
                email: 'recruiter.pending@gmail.com',
                firstName: 'Bob',
                lastName: 'Pending',
                role: 'recruiter',
                imageUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80'
            },
            { upsert: true }
        );
        await Company.findOneAndUpdate(
            { clerkId: 'mock_pending_recruiter_id' },
            {
                clerkId: 'mock_pending_recruiter_id',
                companyName: 'Pending Ventures',
                companyEmail: 'recruiter.pending@gmail.com',
                website: 'http://pendingventures.com',
                linkedin: 'https://linkedin.com/company/pendingventures',
                phone: '+1 555-0100',
                address: '123 Pending Rd, Silicon Valley, CA',
                industry: 'Finance / Fintech',
                companySize: '11-50',
                verificationStatus: 'Pending',
                trustScore: 45,
                fraudFlags: ['Gmail used', 'Website unreachable', 'Website domain mismatch'],
                documents: [
                    { name: 'Company Logo', url: '/uploads/company_docs/mock-logo.png', type: 'logo' },
                    { name: 'Certificate of Incorporation', url: '/uploads/company_docs/mock-coi.pdf', type: 'coi' }
                ]
            },
            { upsert: true }
        );

        // 3. Mock Verified Recruiter & Company
        await User.findOneAndUpdate(
            { clerkId: 'mock_verified_recruiter_id' },
            {
                clerkId: 'mock_verified_recruiter_id',
                email: 'recruiter.verified@acme.com',
                firstName: 'Alice',
                lastName: 'Verified',
                role: 'recruiter',
                imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80'
            },
            { upsert: true }
        );
        await Company.findOneAndUpdate(
            { clerkId: 'mock_verified_recruiter_id' },
            {
                clerkId: 'mock_verified_recruiter_id',
                companyName: 'Verified Industries',
                companyEmail: 'recruiter.verified@verifiedindustries.com',
                website: 'https://verifiedindustries.com',
                linkedin: 'https://linkedin.com/company/verifiedindustries',
                phone: '+1 555-0200',
                address: '456 Verified Blvd, Seattle, WA',
                industry: 'Technology',
                companySize: '501+',
                verificationStatus: 'Verified',
                trustScore: 95,
                fraudFlags: [],
                documents: [
                    { name: 'Company Logo', url: '/uploads/company_docs/mock-logo.png', type: 'logo' },
                    { name: 'Certificate of Incorporation', url: '/uploads/company_docs/mock-coi.pdf', type: 'coi' }
                ]
            },
            { upsert: true }
        );

        // 4. Mock Admin
        await User.findOneAndUpdate(
            { clerkId: 'mock_admin_id' },
            {
                clerkId: 'mock_admin_id',
                email: 'admin@recruitai.com',
                firstName: 'Charlie',
                lastName: 'Admin',
                role: 'admin',
                imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80'
            },
            { upsert: true }
        );

        res.status(200).json({ message: 'Mock users and companies seeded successfully!' });
    } catch (error) {
        console.error('Seeding mock data error:', error);
        res.status(500).json({ error: 'Failed to seed mock data.' });
    }
};

export const updateCompanyProfile = async (req, res) => {
    try {
        const { clerkId, companyName, website, industry, address, goal, description, services } = req.body;
        if (!clerkId) return res.status(400).json({ error: 'Missing clerkId' });

        await connectDB();
        const updated = await Company.findOneAndUpdate(
            { clerkId },
            {
                $set: {
                    companyName,
                    website,
                    industry,
                    address,
                    goal,
                    description,
                    services
                }
            },
            { new: true, upsert: true }
        );

        res.status(200).json({ message: 'Company profile updated successfully', company: updated });
    } catch (error) {
        console.error('Update company profile error:', error);
        res.status(500).json({ error: 'Failed to update company profile' });
    }
};
