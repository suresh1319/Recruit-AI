import User from '../models/User.js';
import Candidate from '../models/Candidate.js';
import connectDB from '../db/connect.js';

export const syncUser = async (req, res) => {
    try {
        const { id, email_addresses, first_name, last_name, image_url, public_metadata, firstName, lastName, imageUrl, emailAddresses, primaryEmailAddress, email, role } = req.body;

        const actualId = id;
        const actualFirstName = first_name || firstName || '';
        const actualLastName = last_name || lastName || '';
        const actualImageUrl = image_url || imageUrl || '';
        
        let primaryEmail = email || '';
        if (!primaryEmail && email_addresses && email_addresses[0]?.email_address) {
            primaryEmail = email_addresses[0].email_address;
        }
        if (!primaryEmail && emailAddresses && emailAddresses[0]?.emailAddress) {
            primaryEmail = emailAddresses[0].emailAddress;
        }
        if (!primaryEmail && primaryEmailAddress) {
            primaryEmail = typeof primaryEmailAddress === 'string' ? primaryEmailAddress : (primaryEmailAddress.emailAddress || '');
        }

        if (!actualId) return res.status(400).json({ error: 'Missing Clerk ID' });

        let roleUpdate = {};
        if (public_metadata && public_metadata.role) {
            roleUpdate.role = public_metadata.role;
        } else if (role) {
            roleUpdate.role = role;
        }

        await connectDB();

        // Build update object and check existing user by clerkId or email
        let user = await User.findOne({ clerkId: actualId });

        if (!user && primaryEmail) {
            user = await User.findOne({ email: primaryEmail });
            if (user) {
                // If a user exists with this email but a different clerkId, update it
                user.clerkId = actualId;
            }
        }

        const fallbackEmail = `user-${actualId}@recruitai.internal`;
        const finalEmail = (primaryEmail && primaryEmail.trim() !== '') 
            ? primaryEmail 
            : ((user && user.email && user.email.trim() !== '') ? user.email : fallbackEmail);

        if (user) {
            user.email = finalEmail;
            if (actualFirstName) user.firstName = actualFirstName;
            if (actualLastName) user.lastName = actualLastName;
            if (actualImageUrl) user.imageUrl = actualImageUrl;

            if (roleUpdate.role) {
                user.role = roleUpdate.role;
            } else if (!user.role) {
                user.role = 'candidate';
            }
            await user.save();
        } else {
            // Create new user
            const createFields = {
                clerkId: actualId,
                email: finalEmail,
                firstName: actualFirstName,
                lastName: actualLastName,
                imageUrl: actualImageUrl,
                role: roleUpdate.role || 'candidate'
            };
            user = await User.create(createFields);
        }

        // Fail-safe: if role is still missing, default to candidate
        if (!user.role) {
            user.role = 'candidate';
            await user.save();
        }

        const userRole = user.role;

        // If they are a candidate, make sure they have a Candidate profile
        if (userRole === 'candidate') {
            await Candidate.findOneAndUpdate(
                { clerkId: actualId },
                {
                    clerkId: actualId,
                    name: `${actualFirstName} ${actualLastName}`.trim() || 'Candidate',
                    email: finalEmail
                },
                { upsert: true }
            );
        } else {
            // Delete Candidate profile if user role changes to recruiter/admin
            await Candidate.deleteOne({ clerkId: actualId });
        }

        res.status(200).json({ message: 'User synced successfully', user });
    } catch (error) {
        console.error('User sync error:', error);
        res.status(500).json({ error: 'Failed to sync user: ' + (error.message || error) });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const { clerkId } = req.query;
        if (!clerkId) return res.status(400).json({ error: 'Missing clerkId' });

        await connectDB();
        const user = await User.findOne({ clerkId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.status(200).json(user);
    } catch (error) {
        console.error('Fetch user me error:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
};
