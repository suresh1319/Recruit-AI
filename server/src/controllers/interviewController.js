import Interview from '../models/Interview.js';
import Candidate from '../models/Candidate.js';
import connectDB from '../db/connect.js';
import { ai } from '../config/ai.js';

// Helper for analysis
export const performInterviewAnalysis = async (interviewId) => {
    console.log(`[ANALYSIS] Starting analysis for interview: ${interviewId}`);
    try {
        await connectDB();
        // Try both UUID and ObjectId for robustness
        let interview = await Interview.findOne({ interviewId });
        if (!interview) {
            try {
                interview = await Interview.findById(interviewId);
            } catch (e) { /* ignore invalid objectid */ }
        }
        
        if (!interview) {
            console.error(`[ANALYSIS] Interview not found: ${interviewId}`);
            return null;
        }

        if (!interview.transcript || interview.transcript.length === 0) {
            console.warn(`[ANALYSIS] No transcript for interview: ${interviewId}`);
            return "No transcript available for analysis.";
        }

        const context = interview.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
        
        const prompt = `
        You are an expert technical recruiter and advisor to the Director of Engineering. 
        Analyze the following interview transcript for the role of ${interview.jobTitle}.
        
        Provide a "Screening Feedback Report for Director" with the following structured sections.
        CRITICAL: DO NOT use any markdown formatting. NO BOLDING, NO STARS, NO BACKTICKS. 
        Use plain text headers (e.g., 1. TECHNICAL COMPETENCE) and simple bullet points (e.g., - Point).
        
        Sections:
        1. TECHNICAL COMPETENCE: Assessment of the candidate's technical skills and depth.
        2. COMMUNICATION AND SOFT SKILLS: Evaluation of clarity and professional demeanor.
        3. KEY TAKEAWAYS: Notable strengths or concerns.
        4. CANDIDATE POTENTIAL: Growth prospects and cultural fit.
        5. FINAL VERDICT: A clear recommendation for the Director (Recommended or Not Recommended) with a brief justification.
        
        At the VERY END of your response, provide these two values in this EXACT format for system parsing:
        FINAL_SCORE: [Number 0-100]
        SUMMARY_VERDICT: [Recommended or Not Recommended]
        
        Transcript:
        ${context}
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        let analysisText = response.text || "AI failed to generate a response. Please try regenerating.";
        // Clean up markdown stars
        analysisText = analysisText.replace(/\*\*/g, '').replace(/\*/g, '');
        
        console.log(`[ANALYSIS] Generated analysis length: ${analysisText.length} chars`);
        
        // Extract score and verdict
        const scoreMatch = analysisText.match(/FINAL_SCORE:\s*(\d+)/i);
        const verdictMatch = analysisText.match(/SUMMARY_VERDICT:\s*([^\n\r]+)/i);
        
        interview.analysis = analysisText;
        if (scoreMatch) interview.score = parseInt(scoreMatch[1]);
        await interview.save();

        // NO automatic updates to candidate status/notes - Director decides
        return analysisText;
    } catch (err) {
        console.error(`Analysis error for ${interviewId}:`, err);
        throw err;
    }
};

export const getAllInterviews = async (req, res) => {
    try {
        await connectDB();
        
        // Auto-complete logic - set to 30 minutes as requested
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        const longRunning = await Interview.find({ status: 'ongoing', updatedAt: { $lt: thirtyMinsAgo } });
        for (const int of longRunning) {
            int.status = 'completed';
            await int.save();
            performInterviewAnalysis(int.interviewId || int._id).catch(console.error);
        }

        const interviews = await Interview.find().sort({ createdAt: -1 });
        const formatted = interviews.map(i => {
            const verdictMatch = i.analysis?.match(/SUMMARY_VERDICT:\s*([^\n\r]+)/i);
            const verdict = verdictMatch ? verdictMatch[1].trim() : (i.analysis ? 'Analyzed' : null);
            
            return {
                id: i._id,
                interviewId: i.interviewId || i._id.toString(), // FALLBACK: ensure never undefined
                candidate: i.candidateName || 'Unknown',
                role: i.jobTitle,
                status: i.status === 'completed' ? 'Completed' : i.status === 'ongoing' ? 'Ongoing' : 'Scheduled',
                time: new Date(i.createdAt).toLocaleDateString(),
                aiRecommendation: verdict,
                aiScore: i.score || 0,
                aiSummary: i.analysis
            };
        });
        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch interviews' });
    }
};

export const getInterviewById = async (req, res) => {
    try {
        const { interviewId } = req.params;
        await connectDB();
        const interview = await Interview.findOne({ interviewId });
        if (!interview) return res.status(404).json({ error: 'Not found' });

        if (interview.expiresAt < new Date()) {
            return res.status(403).json({ error: 'Link expired', expired: true });
        }

        res.status(200).json({
            interviewId: interview.interviewId,
            jobTitle: interview.jobTitle,
            companyName: interview.companyName,
            status: interview.status
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

export const startInterview = async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { fullName } = req.body;
        if (!fullName) return res.status(400).json({ error: 'Name required' });
        await connectDB();
        const interview = await Interview.findOne({ interviewId });
        if (!interview) return res.status(404).json({ error: 'Not found' });
        
        interview.status = 'ongoing';
        interview.candidateName = fullName;
        await interview.save();
        res.status(200).json({ message: 'Started', interviewId });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

export const getQuestions = async (req, res) => {
    try {
        const { interviewId } = req.params;
        await connectDB();
        const interview = await Interview.findOne({ interviewId });
        if (!interview) return res.status(404).json({ error: 'Not found' });
        
        const jobTitle = interview.jobTitle || 'Full Stack Developer';
        const questions = [
            `Welcome! Can you briefly introduce yourself and your experience with ${jobTitle} roles?`,
            `What is the most challenging project you've worked on recently?`,
            `In your opinion, what are the top 3 skills required for a ${jobTitle}?`,
            `Describe a time when you had to work under a tight deadline.`
        ];
        res.status(200).json({ questions, jobTitle: interview.jobTitle, companyName: interview.companyName });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

export const updateTranscript = async (req, res) => {
    try {
        const { interviewId } = req.params;
        const { transcript } = req.body;
        await connectDB();
        await Interview.findOneAndUpdate({ interviewId }, { transcript });
        res.status(200).json({ message: 'Updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

export const analyzeInterview = async (req, res) => {
    try {
        const analysis = await performInterviewAnalysis(req.params.interviewId);
        if (!analysis) return res.status(404).json({ error: 'Failed' });
        res.status(200).json({ message: 'Complete', analysis });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};
