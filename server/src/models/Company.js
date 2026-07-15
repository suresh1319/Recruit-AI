import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
        },
        companyName: {
            type: String,
            required: true,
        },
        companyEmail: {
            type: String,
            required: true,
        },
        website: {
            type: String,
            required: true,
        },
        linkedin: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        industry: {
            type: String,
            required: true,
        },
        companySize: {
            type: String,
            required: true,
        },
        gst: {
            type: String,
            default: ''
        },
        cin: {
            type: String,
            default: ''
        },
        startupIndiaId: {
            type: String,
            default: ''
        },
        logoUrl: {
            type: String,
            default: ''
        },
        coiUrl: {
            type: String,
            default: ''
        },
        gstCertUrl: {
            type: String,
            default: ''
        },
        verificationStatus: {
            type: String,
            enum: ['Pending', 'Verified', 'Rejected', 'Suspended'],
            default: 'Pending'
        },
        trustScore: {
            type: Number,
            default: 0
        },
        fraudFlags: {
            type: [String],
            default: []
        },
        documents: [{
            name: String,
            url: String,
            type: {
                type: String
            }
        }],
        verifiedBy: {
            type: String,
            default: ''
        },
        verifiedAt: {
            type: Date
        },
        goal: {
            type: String,
            default: ''
        },
        description: {
            type: String,
            default: ''
        },
        services: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
