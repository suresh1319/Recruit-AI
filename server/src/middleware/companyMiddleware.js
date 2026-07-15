import Company from '../models/Company.js';
import connectDB from '../db/connect.js';

export const requireVerifiedCompany = async (req, res, next) => {
    try {
        const clerkId = req.query.clerkId || req.body.clerkId;
        if (!clerkId) {
            return res.status(400).json({ error: 'clerkId is required to verify company status.' });
        }

        await connectDB();
        const company = await Company.findOne({ clerkId });
        if (!company || company.verificationStatus !== 'Verified') {
            return res.status(403).json({
                error: 'Your company verification is pending, rejected, or not registered. You cannot create, edit, or delete jobs until it is Verified.',
                verificationStatus: company ? company.verificationStatus : 'Not Registered'
            });
        }

        next();
    } catch (error) {
        console.error('Company verification middleware error:', error);
        res.status(500).json({ error: 'Server error during company status check' });
    }
};
