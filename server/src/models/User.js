import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        firstName: {
            type: String,
        },
        lastName: {
            type: String,
        },
        imageUrl: {
            type: String,
        },
        role: {
            type: String,
            enum: ['recruiter', 'candidate', 'admin'],
        }
    },
    { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
