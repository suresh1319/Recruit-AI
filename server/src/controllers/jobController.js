import mongoose from 'mongoose';
import Job from '../models/Job.js';
import Candidate from '../models/Candidate.js';
import Interview from '../models/Interview.js';
import connectDB from '../db/connect.js';
import { ai, GEMINI_TEXT_MODEL } from '../config/ai.js';
import { sendEmail } from '../utils/sendEmail.js';

const extractJSON = (text) => {
    try {
        let clean = text.trim();
        if (clean.startsWith('```json')) clean = clean.slice(7);
        if (clean.startsWith('```')) clean = clean.slice(3);
        if (clean.endsWith('```')) clean = clean.slice(0, -3);
        
        // Find first { or [ and last } or ]
        const start = clean.search(/[\[\{]/);
        const end = clean.lastIndexOf(clean.charAt(start) === '[' ? ']' : '}');
        
        if (start === -1 || end === -1) throw new Error('No JSON structure found');
        return JSON.parse(clean.substring(start, end + 1));
    } catch (e) {
        console.error('JSON Extraction failed:', e, 'Raw text:', text);
        return null;
    }
};
export const createJob = async (req, res) => {
    try {
        await connectDB();
        if (!req.body.clerkId) return res.status(400).json({ error: 'clerkId is required' });
        const job = await Job.create(req.body);
        res.status(201).json(job);
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({ error: 'Failed to create job' });
    }
};

export const generateJobDetails = async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt || !prompt.trim()) return res.status(400).json({ error: 'Prompt is required' });

        const aiPrompt = `You are an expert HR professional. Generate a job posting for: "${prompt}".
        Return ONLY valid JSON with these exact fields:
        {
          "title": "string",
          "department": "string",
          "workType": "Work from Home | On-site | Hybrid",
          "city": "string",
          "employmentType": "Full-time | Part-time | Contract | Internship",
          "experienceLevel": "Entry | Mid | Senior | Lead",
          "salaryMin": number,
          "salaryMax": number,
          "currency": "USD | INR",
          "period": "year | month",
          "description": "string",
          "requirements": ["string"],
          "responsibilities": ["string"],
          "benefits": ["string"]
        }
        If the role is remote, use workType "Work from Home" and city "".
        Do not include any conversational text.`;
        
        const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: [{ role: 'user', parts: [{ text: aiPrompt }] }],
            config: {
                responseMimeType: 'application/json',
            },
        });
        const jobData = extractJSON(response.text);
        if (!jobData) throw new Error('Failed to extract valid JSON from AI');
        res.status(200).json(jobData);
    } catch (error) {
        console.error('Generate job error:', error);
        res.status(500).json({ error: 'Failed to generate job' });
    }
};

export const getAllJobs = async (req, res) => {
    try {
        await connectDB();
        const { clerkId } = req.query;
        let query = {};
        if (clerkId) query.clerkId = clerkId;
        const jobs = await Job.find(query).sort({ createdAt: -1 });
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Fetch jobs error:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
};

export const getPublicJobs = async (req, res) => {
    try {
        await connectDB();
        const jobs = await Job.find({ status: 'active' }).sort({ createdAt: -1 });
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Fetch public jobs error:', error);
        res.status(500).json({ error: 'Failed to fetch public jobs' });
    }
};

/**
 * Runs AI match scoring for a SINGLE candidate against a job.
 * Called automatically on application (fire-and-forget) and can also
 * be called manually from matchCandidates if needed.
 * Does NOT send an HTTP response — safe to call without res.
 */
const runMatchForCandidate = async (job, candidate) => {
    try {
        const prompt = `Score this candidate against the job.

Job Title: "${job.title}"
Requirements: ${(job.requirements || []).join(', ')}
Description: ${(job.description || '').slice(0, 300)}

Candidate:
- Name: ${candidate.name}
- Skills: ${(candidate.skills || []).slice(0, 15).join(', ')}
- Experience: ${(candidate.experienceSummary || '').slice(0, 300)}

Return ONLY valid JSON: {"matchScore": <number 0-100>}
Score above 50 means a reasonable fit.`;

        const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' },
        });

        const result = extractJSON(response.text);
        const score = result?.matchScore ?? 0;

        // Upsert the match score entry for this job on the candidate
        const idx = candidate.jobMatchScores.findIndex(
            s => s.jobId.toString() === job._id.toString()
        );
        if (idx >= 0) candidate.jobMatchScores[idx].score = score;
        else candidate.jobMatchScores.push({ jobId: job._id, score });

        // Automatically move to matched list if score is above threshold
        if (score > 75 && !job.candidatesMatched.some(id => id.toString() === candidate._id.toString())) {
            job.candidatesMatched.push(candidate._id);
            await job.save();

            // Send shortlist email
            const subject = `Congratulations! Shortlisted — ${job.title}`;
            const text = `Hi ${candidate.name || 'there'},\n\nGreat news! Your profile has been shortlisted for the ${job.title} position at RecruitAI.\n\nWe will reach out to you shortly with the next steps regarding your interview process.\n\nBest regards,\nRecruitAI Team`;
            const html = `<p>Hi ${candidate.name || 'there'},</p><p>Great news! Your profile has been shortlisted for the <strong>${job.title}</strong> position at RecruitAI.</p><p>We will reach out to you shortly with the next steps regarding your interview process.</p><p>Best regards,<br/>RecruitAI Team</p>`;
            sendEmail(candidate.email, subject, text, html).catch(err => console.error('Error sending shortlist email:', err.message));

        } else if (score <= 50 && job.candidatesApplied.some(id => id.toString() === candidate._id.toString())) {
            // Low score — mark auto-rejected
            candidate.status = 'rejected';
            if (!candidate.applications) {
                candidate.applications = [];
            }
            const appIndex = candidate.applications.findIndex(app => app.jobId && app.jobId.toString() === job._id.toString());
            if (appIndex === -1) {
                candidate.applications.push({
                    jobId: job._id,
                    status: 'rejected'
                });
            } else {
                candidate.applications[appIndex].status = 'rejected';
            }

            // Send rejection email
            const subject = `Application Update — ${job.title}`;
            const text = `Hi ${candidate.name || 'there'},\n\nThank you for your interest in the ${job.title} position. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nWe appreciate the time you took to apply and wish you the best in your job search.\n\nBest regards,\nRecruitAI Team`;
            const html = `<p>Hi ${candidate.name || 'there'},</p><p>Thank you for your interest in the <strong>${job.title}</strong> position. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p><p>We appreciate the time you took to apply and wish you the best in your job search.</p><p>Best regards,<br/>RecruitAI Team</p>`;
            sendEmail(candidate.email, subject, text, html).catch(err => console.error('Error sending rejection email:', err.message));
        }

        await candidate.save();
        console.log(`[AutoMatch] ${candidate.name} → "${job.title}": ${score}%`);
    } catch (err) {
        console.error('[AutoMatch] Error scoring candidate:', err.message);
    }
};

export const applyToJob = async (req, res) => {
    try {
        await connectDB();
        const { jobId } = req.params;
        const { clerkId } = req.body;
        const job = await Job.findById(jobId);
        if (!job || job.status !== 'active') return res.status(400).json({ error: 'Job unavailable' });
        const candidate = await Candidate.findOne({ clerkId });
        if (!candidate) return res.status(404).json({ error: 'Profile not found' });
        if (job.candidatesApplied.includes(candidate._id)) return res.status(400).json({ error: 'Already applied' });

        job.candidatesApplied.push(candidate._id);
        await job.save();

        if (!candidate.applications) {
            candidate.applications = [];
        }
        const appIndex = candidate.applications.findIndex(app => app.jobId && app.jobId.toString() === jobId.toString());
        if (appIndex === -1) {
            candidate.applications.push({
                jobId: job._id,
                status: 'pending'
            });
        } else {
            candidate.applications[appIndex].status = 'pending';
        }

        candidate.status = 'pending';
        candidate.role = job.title;
        candidate.jobId = job._id;
        await candidate.save();

        // Respond immediately — don't make the candidate wait for AI scoring
        res.status(200).json({ message: 'Applied successfully' });

        // Fire-and-forget: run AI match scoring in the background
        runMatchForCandidate(job, candidate).catch(err =>
            console.error('[AutoMatch] Background match failed:', err.message)
        );
    } catch (error) {
        console.error('Apply job error:', error);
        res.status(500).json({ error: 'Failed to apply' });
    }
};

export const getMatchedCandidates = async (req, res) => {
    try {
        await connectDB();
        const { jobId } = req.params;
        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        // 1. Fetch Applied Candidates
        const applied = await Candidate.find({
            _id: { $in: job.candidatesApplied }
        }).select('_id name email phone skills experienceSummary status jobMatchScores interviewLink jobId role applications createdAt').lean();

        // 2. Fetch Recommended Candidates (match score > 75 for this job, but not in job.candidatesApplied)
        const recommended = await Candidate.find({
            _id: { $nin: job.candidatesApplied },
            'jobMatchScores.jobId': job._id,
            'jobMatchScores.score': { $gt: 75 }
        }).select('_id name email phone skills experienceSummary status jobMatchScores interviewLink jobId role applications createdAt').lean();

        const extractInterviewId = (link) => {
            if (!link) return null;
            try {
                const cleanLink = link.trim().replace(/\/+$/, '');
                const parts = cleanLink.split('/');
                return parts[parts.length - 1] || null;
            } catch (e) {
                return null;
            }
        };

        const enrichCandidates = async (candidatesList) => {
            const enriched = [];
            for (const c of candidatesList) {
                let interviewId = null;

                // 1. First priority: find the interview link for THIS specific job
                if (c.applications && c.applications.length > 0) {
                    const jobApp = c.applications.find(a => a.jobId && a.jobId.toString() === job._id.toString() && a.interviewLink);
                    if (jobApp) interviewId = extractInterviewId(jobApp.interviewLink);
                }

                // 2. Fallback: use the root-level interviewLink only if the candidate's jobId matches this job
                if (!interviewId && c.interviewLink && c.jobId && c.jobId.toString() === job._id.toString()) {
                    interviewId = extractInterviewId(c.interviewLink);
                }

                // 3. Last resort: if candidate only has one application, use whatever link exists
                if (!interviewId && c.applications && c.applications.length === 1 && c.applications[0].interviewLink) {
                    interviewId = extractInterviewId(c.applications[0].interviewLink);
                }

                let interviewInfo = null;
                if (interviewId) {
                    const intDoc = await Interview.findOne({ interviewId }).select('status score analysis interviewId').lean();
                    if (intDoc) {
                        const verdictMatch = intDoc.analysis?.match(/SUMMARY_VERDICT:\s*([^\n\r]+)/i);
                        const verdict = verdictMatch ? verdictMatch[1].trim() : (intDoc.analysis ? 'Analyzed' : null);
                        interviewInfo = {
                            interviewId: intDoc.interviewId,
                            status: intDoc.status === 'completed' ? 'Completed' : intDoc.status === 'ongoing' ? 'Ongoing' : 'Scheduled',
                            score: intDoc.score || 0,
                            recommendation: verdict
                        };
                    }
                }

                enriched.push({
                    ...c,
                    matchScore: c.jobMatchScores?.find(s => s.jobId?.toString() === job._id.toString())?.score ?? null,
                    interview: interviewInfo
                });
            }
            return enriched;
        };

        const enrichedApplied = await enrichCandidates(applied);
        const enrichedRecommended = await enrichCandidates(recommended);

        res.status(200).json({
            job: {
                _id: job._id,
                title: job.title,
                requirements: job.requirements || []
            },
            applied: enrichedApplied,
            recommended: enrichedRecommended
        });
    } catch (error) {
        console.error('Fetch matched error:', error);
        res.status(500).json({ error: 'Failed' });
    }
};

export const getJobById = async (req, res) => {
    try {
        await connectDB();
        const job = await Job.findById(req.params.jobId);
        if (!job) return res.status(404).json({ error: 'Not found' });
        res.status(200).json(job);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

export const updateJob = async (req, res) => {
    try {
        await connectDB();
        const job = await Job.findByIdAndUpdate(req.params.jobId, { $set: req.body }, { returnDocument: 'after' });
        res.status(200).json(job);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

export const matchCandidates = async (req, res) => {
    try {
        await connectDB();
        
        // Auto-heal any invalid status strings in the database
        await Candidate.updateMany(
            { status: 'Screening Pending' },
            { $set: { status: 'pending' } }
        );

        const job = await Job.findById(req.params.jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        const candidates = await Candidate.find().select('_id name skills experienceSummary status').lean();
        if (!candidates.length) return res.status(200).json({ message: 'No candidates found', matches: [] });

        // Batch into chunks of 20 to avoid oversized prompts
        const CHUNK = 20;
        const allMatches = [];
        for (let i = 0; i < candidates.length; i += CHUNK) {
            const chunk = candidates.slice(i, i + CHUNK).map(c => ({
                id: c._id.toString(),
                name: c.name,
                skills: c.skills?.slice(0, 10) || [],
                experience: c.experienceSummary?.slice(0, 200) || ''
            }));

            const prompt = `Match candidates to job "${job.title}".
Requirements: ${(job.requirements || []).join(', ')}
Description: ${(job.description || '').slice(0, 300)}

Candidates: ${JSON.stringify(chunk)}

Return ONLY a JSON array: [{"candidateId":"...","matchScore":85}]
Only include candidates with matchScore > 50.`;

            const response = await ai.models.generateContent({
                model: GEMINI_TEXT_MODEL,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: { responseMimeType: 'application/json' },
            });

            const chunk_matches = extractJSON(response.text);
            if (Array.isArray(chunk_matches)) allMatches.push(...chunk_matches);
        }

        let rejectedCount = 0;
        const matchedIds = [];
        await Promise.all(allMatches.map(async (m) => {
            const candidateId = m.candidateId || m.id;
            if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) return;

            const c = await Candidate.findById(candidateId);
            if (!c) return;

            if (!c.jobMatchScores) c.jobMatchScores = [];
            const idx = c.jobMatchScores.findIndex(s => s.jobId && s.jobId.toString() === job._id.toString());
            
            const scoreNum = Number(m.matchScore) || 0;
            if (idx >= 0) c.jobMatchScores[idx].score = scoreNum;
            else c.jobMatchScores.push({ jobId: job._id, score: scoreNum });

            if (scoreNum > 75) {
                const wasMatched = job.candidatesMatched.some(id => id && id.toString() === c._id.toString());
                matchedIds.push(c._id);
                if (!wasMatched) {
                    // Send shortlist email
                    const subject = `Congratulations! Shortlisted — ${job.title}`;
                    const text = `Hi ${c.name || 'there'},\n\nGreat news! Your profile has been shortlisted for the ${job.title} position at RecruitAI.\n\nWe will reach out to you shortly with the next steps regarding your interview process.\n\nBest regards,\nRecruitAI Team`;
                    const html = `<p>Hi ${c.name || 'there'},</p><p>Great news! Your profile has been shortlisted for the <strong>${job.title}</strong> position at RecruitAI.</p><p>We will reach out to you shortly with the next steps regarding your interview process.</p><p>Best regards,<br/>RecruitAI Team</p>`;
                    sendEmail(c.email, subject, text, html).catch(err => console.error('Error sending shortlist email:', err.message));
                }
            } else if (scoreNum <= 50 && job.candidatesApplied && job.candidatesApplied.some(id => id && id.toString() === c._id.toString())) {
                const wasRejected = c.status === 'rejected';
                // Low score — auto-reject, but keep in candidatesApplied so recruiter sees them
                c.status = 'rejected';
                if (!c.applications) {
                    c.applications = [];
                }
                const appIndex = c.applications.findIndex(app => app.jobId && app.jobId.toString() === job._id.toString());
                if (appIndex === -1) {
                    c.applications.push({
                        jobId: job._id,
                        status: 'rejected'
                    });
                } else {
                    c.applications[appIndex].status = 'rejected';
                }
                rejectedCount++;

                if (!wasRejected) {
                    // Send rejection email
                    const subject = `Application Update — ${job.title}`;
                    const text = `Hi ${c.name || 'there'},\n\nThank you for your interest in the ${job.title} position. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nWe appreciate the time you took to apply and wish you the best in your job search.\n\nBest regards,\nRecruitAI Team`;
                    const html = `<p>Hi ${c.name || 'there'},</p><p>Thank you for your interest in the <strong>${job.title}</strong> position. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p><p>We appreciate the time you took to apply and wish you the best in your job search.</p><p>Best regards,<br/>RecruitAI Team</p>`;
                    sendEmail(c.email, subject, text, html).catch(err => console.error('Error sending rejection email:', err.message));
                }
            }
            await c.save();
        }));

        job.candidatesMatched = matchedIds;
        await job.save();
        res.status(200).json({ message: 'Matching process completed', matches: allMatches, rejectedCount });
    } catch (error) {
        console.error('Match error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to process matches' });
    }
};
