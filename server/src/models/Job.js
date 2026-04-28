import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        clerkId: {
            type: String,
        },
        department: String,
        location: String,
        employmentType: {
            type: String,
            enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
            default: 'Full-time'
        },
        experienceLevel: {
            type: String,
            enum: ['Entry', 'Mid', 'Senior', 'Lead'],
            default: 'Mid'
        },
        salaryRange: {
            min: Number,
            max: Number,
            currency: { type: String, default: 'USD' },
            period: { type: String, enum: ['year', 'month'], default: 'year' }
        },
        description: String,
        responsibilities: [String],
        requirements: [String],
        benefits: [String],
        status: {
            type: String,
            enum: ['draft', 'active', 'expired'],
            default: 'draft',
        },
        candidatesMatched: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate'
        }],
        candidatesApplied: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate'
        }],
        invitesSent: Number,
        interviewsCompleted: Number,
    },
    { timestamps: true }
);

export default mongoose.models.Job || mongoose.model('Job', JobSchema);
