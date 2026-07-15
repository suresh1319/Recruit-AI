import Interview from '../models/Interview.js';
import Candidate from '../models/Candidate.js';
import connectDB from '../db/connect.js';
import { ai, GEMINI_TEXT_MODEL } from '../config/ai.js';

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

        // Compile proctoring and integrity violation statistics
        const events = interview.proctoringEvents || [];
        const noFace = events.filter(e => e.type === 'NO_FACE').length;
        const multiple = events.filter(e => e.type === 'MULTIPLE_FACES').length;
        const lookingAway = events.filter(e => e.type === 'LOOKING_AWAY').length;
        const eyesClosed = events.filter(e => e.type === 'EYES_CLOSED').length;
        const tabSwitches = events.filter(e => e.type === 'TAB_SWITCH').length;
        const fullscreenExits = events.filter(e => e.type === 'FULLSCREEN_EXITED').length;

        const violationPoints = (noFace * 3) + (lookingAway * 1.5) + (tabSwitches * 10) + (fullscreenExits * 15);
        const integrityScore = Math.max(0, Math.min(100, Math.round(100 - violationPoints)));

        const integrityReport = `
        AI Proctoring & Session Integrity Metrics:
        - No Face Detected (Camera Empty): ${noFace} times
        - Multiple Faces Detected: ${multiple} times
        - Candidate Looking Away: ${lookingAway} times
        - Candidate Eyes Closed: ${eyesClosed} times
        - Tab Switches / Window Lost Focus: ${tabSwitches} times
        - Fullscreen Mode Exited: ${fullscreenExits} times
        - Overall Session Integrity Score: ${integrityScore}% (Calculated by penalizing violations)
        `;
        
        const prompt = `
        You are an expert technical recruiter and advisor to the Director of Engineering. 
        Analyze the following interview transcript and proctoring/integrity report for the role of ${interview.jobTitle}.
        
        ${integrityReport}
        
        Provide a "Screening Feedback Report for Director" with the following structured sections.
        CRITICAL: DO NOT use any markdown formatting. NO BOLDING, NO STARS, NO BACKTICKS. 
        Use plain text headers (e.g., 1. TECHNICAL COMPETENCE) and simple bullet points (e.g., - Point).
        
        Sections:
        1. TECHNICAL COMPETENCE: Assessment of the candidate's technical skills and depth based on the transcript.
        2. COMMUNICATION AND SOFT SKILLS: Evaluation of clarity and professional demeanor.
        3. INTEGRITY AND PROCTORING ASSESSMENT: Analyze the proctoring and integrity logs. Identify if there are any suspicious behaviors, such as frequent tab switching, leaving fullscreen, looking away, or face missing events. Comment on whether these suggest external help, cheating, or simple distractions.
        4. KEY TAKEAWAYS: Notable strengths, concerns, and integrity issues.
        5. CANDIDATE POTENTIAL: Growth prospects and cultural fit.
        6. FINAL VERDICT: A clear recommendation for the Director (Recommended or Not Recommended) with a brief justification.
        
        CRITICAL: The FINAL_SCORE and SUMMARY_VERDICT must take both verbal/technical responses and integrity/proctoring violations into account. If there are severe proctoring violations (e.g. multiple tab switches, leaving fullscreen, or extremely low integrity score), you should significantly lower the FINAL_SCORE and consider a "Not Recommended" recommendation, even if the verbal responses were technically correct.
        
        At the VERY END of your response, provide these two values in this EXACT format for system parsing:
        FINAL_SCORE: [Number 0-100]
        SUMMARY_VERDICT: [Recommended or Not Recommended]
        
        Transcript:
        ${context}
        `;
        
        const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
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

        // Map candidates to build mapping to candidateId
        const candidatesList = await Candidate.find({
            $or: [
                { interviewLink: { $exists: true, $ne: null } },
                { 'applications.interviewLink': { $exists: true } }
            ]
        }).select('_id interviewLink applications');

        const interviewToCandidateMap = {};
        const interviewToJobMap = {};
        candidatesList.forEach(c => {
            if (c.interviewLink) {
                const parts = c.interviewLink.split('/');
                const id = parts[parts.length - 1];
                if (id) {
                    interviewToCandidateMap[id] = c._id.toString();
                    if (c.jobId) interviewToJobMap[id] = c.jobId.toString();
                }
            }
            if (c.applications) {
                c.applications.forEach(app => {
                    if (app.interviewLink) {
                        const parts = app.interviewLink.split('/');
                        const id = parts[parts.length - 1];
                        if (id) {
                            interviewToCandidateMap[id] = c._id.toString();
                            if (app.jobId) interviewToJobMap[id] = app.jobId.toString();
                        }
                    }
                });
            }
        });

        const formatted = interviews.map(i => {
            const verdictMatch = i.analysis?.match(/SUMMARY_VERDICT:\s*([^\n\r]+)/i);
            const verdict = verdictMatch ? verdictMatch[1].trim() : (i.analysis ? 'Analyzed' : null);
            
            const events = i.proctoringEvents || [];
            const noFace = events.filter(e => e.type === 'NO_FACE').length;
            const multiple = events.filter(e => e.type === 'MULTIPLE_FACES').length;
            const lookingAway = events.filter(e => e.type === 'LOOKING_AWAY').length;
            const eyesClosed = events.filter(e => e.type === 'EYES_CLOSED').length;
            const tabSwitches = events.filter(e => e.type === 'TAB_SWITCH').length;
            const fullscreenExits = events.filter(e => e.type === 'FULLSCREEN_EXITED').length;

            // Simple heuristic to calculate face present rate starting at 100%
            // and deducting for missing face, looking away, tab switching, and fullscreen exit events.
            const violationPoints = (noFace * 3) + (lookingAway * 1.5) + (tabSwitches * 10) + (fullscreenExits * 15);
            const facePresentRate = Math.max(0, Math.min(100, Math.round(100 - violationPoints)));

            return {
                id: i._id,
                interviewId: i.interviewId || i._id.toString(),
                candidateId: interviewToCandidateMap[i.interviewId] || null,
                jobId: interviewToJobMap[i.interviewId] || null,
                candidate: i.candidateName || 'Unknown',
                role: i.jobTitle,
                status: i.status === 'completed' ? 'Completed' : i.status === 'ongoing' ? 'Ongoing' : 'Scheduled',
                time: new Date(i.createdAt).toLocaleDateString(),
                aiRecommendation: verdict,
                aiScore: i.score || 0,
                aiSummary: i.analysis,
                proctoring: {
                    noFace,
                    multipleFaces: multiple,
                    lookingAway,
                    eyesClosed,
                    tabSwitches,
                    fullscreenExits,
                    facePresentRate
                }
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

        if (interview.status === 'completed') {
            return res.status(403).json({ error: 'This interview has already been completed.', completed: true });
        }

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

        if (interview.status === 'completed') {
            return res.status(403).json({ error: 'This interview has already been completed.', completed: true });
        }
        
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

        if (interview.status === 'completed') {
            return res.status(403).json({ error: 'This interview has already been completed.', completed: true });
        }
        
        const jobTitle = interview.jobTitle || 'Full Stack Developer';
        
        // Generate unique questions dynamically using Gemini API
        let questions = [];
        try {
            const prompt = `
            Generate 4 realistic, professional, and unique interview questions for a candidate applying for the role of: "${jobTitle}".
            The first question should be a welcome/introductory question.
            The remaining 3 questions should assess technical skills, situational/behavioral engineering experience, and technical problem solving.
            Return ONLY a valid JSON array of strings containing the questions, like:
            ["question 1", "question 2", "question 3", "question 4"]
            Do not include any markdown format, no code blocks (like \`\`\`json), no extra text. Just raw JSON text.
            `;

            const aiResponse = await ai.models.generateContent({
                model: GEMINI_TEXT_MODEL,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });

            const text = aiResponse.text || "";
            const cleanJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            questions = JSON.parse(cleanJsonText);
            
            // Ensure we got exactly 4 questions and all are strings
            if (!Array.isArray(questions) || questions.length !== 4) {
                throw new Error("Invalid questions array structure");
            }
        } catch (e) {
            console.error('Failed to generate dynamic questions via Gemini, using fallback:', e);
            questions = [
                `Welcome! Can you briefly introduce yourself and your experience with ${jobTitle} roles?`,
                `What is the most challenging project you've worked on recently?`,
                `In your opinion, what are the top 3 skills required for a ${jobTitle}?`,
                `Describe a time when you had to work under a tight deadline.`
            ];
        }

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

export const getFullInterviewReport = async (req, res) => {
    try {
        const { interviewId } = req.params;
        await connectDB();
        const i = await Interview.findOne({ interviewId });
        if (!i) return res.status(404).json({ error: 'Interview not found' });

        const verdictMatch = i.analysis?.match(/SUMMARY_VERDICT:\s*([^\n\r]+)/i);
        const verdict = verdictMatch ? verdictMatch[1].trim() : (i.analysis ? 'Analyzed' : null);
        
        const events = i.proctoringEvents || [];
        const noFace = events.filter(e => e.type === 'NO_FACE').length;
        const multiple = events.filter(e => e.type === 'MULTIPLE_FACES').length;
        const lookingAway = events.filter(e => e.type === 'LOOKING_AWAY').length;
        const eyesClosed = events.filter(e => e.type === 'EYES_CLOSED').length;
        const tabSwitches = events.filter(e => e.type === 'TAB_SWITCH').length;
        const fullscreenExits = events.filter(e => e.type === 'FULLSCREEN_EXITED').length;

        const violationPoints = (noFace * 3) + (lookingAway * 1.5) + (tabSwitches * 10) + (fullscreenExits * 15);
        const facePresentRate = Math.max(0, Math.min(100, Math.round(100 - violationPoints)));

        res.status(200).json({
            id: i._id,
            interviewId: i.interviewId,
            jobTitle: i.jobTitle,
            companyName: i.companyName,
            candidateName: i.candidateName,
            status: i.status === 'completed' ? 'Completed' : i.status === 'ongoing' ? 'Ongoing' : 'Scheduled',
            time: new Date(i.createdAt).toLocaleDateString(),
            aiRecommendation: verdict,
            aiScore: i.score || 0,
            aiSummary: i.analysis,
            transcript: i.transcript || [],
            proctoringEvents: i.proctoringEvents || [],
            proctoring: {
                noFace,
                multipleFaces: multiple,
                lookingAway,
                eyesClosed,
                tabSwitches,
                fullscreenExits,
                facePresentRate
            }
        });
    } catch (error) {
        console.error('Fetch full report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
