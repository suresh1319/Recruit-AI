import mongoose from 'mongoose';

const CandidateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a name for this candidate.'],
            maxlength: [60, 'Name cannot be more than 60 characters'],
        },
        clerkId: {
            type: String,
            unique: true,
            sparse: true,
        },
        email: {
            type: String,
            maxlength: [100, 'Email cannot be more than 100 characters'],
        },
        phone: {
            type: String,
            maxlength: [20, 'Phone cannot be more than 20 characters'],
        },
        role: {
            type: String,
            maxlength: [100, 'Role cannot be more than 100 characters'],
        },
        status: {
            type: String,
            enum: ['pending', 'calling', 'called', 'scheduled', 'rejected', 'matched', 'invited', 'sending', 'selected'],
            default: 'pending',
        },
        notes: {
            type: String,
        },
        interviewDate: {
            type: Date,
        },
        experienceSummary: {
            type: String,
        },
        skills: {
            type: [String],
            default: []
        },
        matchScore: {
            type: Number,
            default: 0
        },
        resumeUrl: {
            type: String
        },
        interviewLink: {
            type: String
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job'
        },
        applications: [
            {
                jobId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Job'
                },
                status: {
                    type: String,
                    enum: ['pending', 'calling', 'called', 'scheduled', 'rejected', 'matched', 'invited', 'sending', 'selected'],
                    default: 'pending'
                },
                interviewLink: {
                    type: String
                },
                rejectionReason: {
                    type: String,
                    default: null
                }
            }
        ],
        jobMatchScores: [
            {
                jobId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Job'
                },
                score: {
                    type: Number,
                    default: 0
                }
            }
        ],
        projects: [
            {
                name: String,
                points: [String]
            }
        ]
    },
    { timestamps: true }
);

CandidateSchema.pre('init', function(doc) {
    if (doc.projects && typeof doc.projects === 'string') {
        doc.projects = doc.projects.split(',').map(p => ({
            name: p.trim(),
            points: []
        }));
    } else if (Array.isArray(doc.projects)) {
        doc.projects = doc.projects.map(p => {
            if (typeof p === 'string') {
                return { name: p.trim(), points: [] };
            }
            return p;
        });
    }
    return doc;
});

export default mongoose.models.Candidate || mongoose.model('Candidate', CandidateSchema);
