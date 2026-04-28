import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
    interviewId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    jobTitle: {
        type: String,
        default: 'AI Voice Interview'
    },
    companyName: {
        type: String,
        default: 'RecruitAI Demo'
    },
    candidateName: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['available', 'ongoing', 'completed'],
        default: 'available'
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    transcript: [{
        speaker: String,
        text: String,
        time: String,
        analysis: String
    }],
    analysis: {
        type: String,
        default: null
    },
    score: {
        type: Number,
        default: 0
    },
    recordingPath: {
        type: String,
        default: null
    }
}, { timestamps: true });

export default mongoose.model('Interview', interviewSchema);
