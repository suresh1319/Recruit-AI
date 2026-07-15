import mongoose from 'mongoose';
import Candidate from '../models/Candidate.js';
import Job from '../models/Job.js';
import Interview from '../models/Interview.js';
import User from '../models/User.js';
import connectDB from '../db/connect.js';
import { ai, GEMINI_TEXT_MODEL } from '../config/ai.js';
import { sendEmail } from '../utils/sendEmail.js';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5001}`;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PRIMARY_CLIENT_URL = CLIENT_URL.split(',')[0].trim().replace(/\/$/, '');
export const getCandidateMe = async (req, res) => {
    try {
        const { clerkId } = req.query;
        if (!clerkId) return res.status(400).json({ error: 'Missing clerkId' });
        await connectDB();
        const candidate = await Candidate.findOne({ clerkId });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        res.status(200).json(candidate);
    } catch (error) {
        console.error('Fetch candidate me error:', error);
        res.status(500).json({ error: 'Failed to fetch candidate profile' });
    }
};

export const getMyApplications = async (req, res) => {
    try {
        const { clerkId } = req.query;
        if (!clerkId) return res.status(400).json({ error: 'Missing clerkId' });
        await connectDB();
        const candidate = await Candidate.findOne({ clerkId });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        const appliedJobs = await Job.find({
            $or: [
                { candidatesApplied: candidate._id },
                { _id: candidate.jobId }
            ]
        });

        let updated = false;
        if (!candidate.applications) {
            candidate.applications = [];
            updated = true;
        }

        const applications = await Promise.all(appliedJobs.map(async (job) => {
            const isTargetJob = candidate.jobId && candidate.jobId.toString() === job._id.toString();
            
            let subApp = candidate.applications?.find(app => app.jobId && app.jobId.toString() === job._id.toString());
            
            if (!subApp) {
                if (isTargetJob) {
                    candidate.applications.push({
                        jobId: job._id,
                        status: candidate.status,
                        interviewLink: candidate.interviewLink || null
                    });
                    updated = true;
                    subApp = candidate.applications[candidate.applications.length - 1];
                } else {
                    candidate.applications.push({
                        jobId: job._id,
                        status: 'pending'
                    });
                    updated = true;
                    subApp = candidate.applications[candidate.applications.length - 1];
                }
            }

            let status = 'pending';
            let interviewLink = null;
            
            if (subApp) {
                status = subApp.status;
                interviewLink = subApp.interviewLink || null;
            } else if (isTargetJob) {
                status = candidate.status;
                interviewLink = candidate.interviewLink || null;
            } else if (job.candidatesMatched.some(id => id.toString() === candidate._id.toString())) {
                status = 'matched';
            } else if (candidate.status === 'rejected' && (candidate.jobId ? candidate.jobId.toString() === job._id.toString() : candidate.role === job.title)) {
                status = 'rejected';
            }
            
            if (interviewLink && ['pending', 'invited'].includes(status)) {
                status = 'invited';
            }

            let deadline = null;
            let interviewStatus = null;
            if (interviewLink) {
                const parts = interviewLink.split('/');
                const interviewId = parts[parts.length - 1];
                if (interviewId) {
                    const interview = await Interview.findOne({ interviewId }).select('expiresAt status').lean();
                    if (interview) {
                        deadline = interview.expiresAt;
                        interviewStatus = interview.status;
                    }
                }
            }

            return {
                jobId: job._id,
                jobTitle: job.title,
                department: job.department,
                location: job.location,
                employmentType: job.employmentType,
                appliedOn: job.updatedAt,
                applicationStatus: status,
                interviewLink,
                deadline,
                interviewStatus,
            };
        }));

        if (updated) {
            await candidate.save();
        }

        res.status(200).json({ applications, candidateStatus: candidate.status });
    } catch (error) {
        console.error('My applications error:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
};

export const getCandidateById = async (req, res) => {
    try {
        const { candidateId } = req.params;
        // Guard: if somehow 'me' reaches this handler, redirect to the correct endpoint
        if (candidateId === 'me') return res.status(400).json({ error: 'Use GET /me for the current user profile' });
        await connectDB();
        const candidate = await Candidate.findById(candidateId).populate('jobMatchScores.jobId', 'title department name status');
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        
        const candidateObj = candidate.toObject();

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

        const formatProctoring = (i) => {
            if (!i) return null;
            const events = i.proctoringEvents || [];
            const noFace = events.filter(e => e.type === 'NO_FACE').length;
            const multiple = events.filter(e => e.type === 'MULTIPLE_FACES').length;
            const lookingAway = events.filter(e => e.type === 'LOOKING_AWAY').length;
            const eyesClosed = events.filter(e => e.type === 'EYES_CLOSED').length;
            const tabSwitches = events.filter(e => e.type === 'TAB_SWITCH').length;
            const fullscreenExits = events.filter(e => e.type === 'FULLSCREEN_EXITED').length;

            const violationPoints = (noFace * 3) + (lookingAway * 1.5) + (tabSwitches * 10) + (fullscreenExits * 15);
            const facePresentRate = Math.max(0, Math.min(100, Math.round(100 - violationPoints)));

            return {
                noFace,
                multipleFaces: multiple,
                lookingAway,
                eyesClosed,
                tabSwitches,
                fullscreenExits,
                facePresentRate
            };
        };

        const formattedInterview = (i) => {
            if (!i) return null;
            const verdictMatch = i.analysis?.match(/SUMMARY_VERDICT:\s*([^\n\r]+)/i);
            const verdict = verdictMatch ? verdictMatch[1].trim() : (i.analysis ? 'Analyzed' : null);
            
            return {
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
                proctoring: formatProctoring(i)
            };
        };

        let interviewData = null;
        if (candidate.interviewLink) {
            const interviewId = extractInterviewId(candidate.interviewLink);
            if (interviewId) {
                const interviewDoc = await Interview.findOne({ interviewId });
                if (interviewDoc) {
                    interviewData = formattedInterview(interviewDoc);
                }
            }
        }

        if (candidateObj.applications && candidateObj.applications.length > 0) {
            for (let i = 0; i < candidateObj.applications.length; i++) {
                const app = candidateObj.applications[i];
                if (app.interviewLink) {
                    const interviewId = extractInterviewId(app.interviewLink);
                    if (interviewId) {
                        const interviewDoc = await Interview.findOne({ interviewId });
                        if (interviewDoc) {
                            app.interview = formattedInterview(interviewDoc);
                        }
                    }
                }
            }
        }

        // Fallback: if main interviewLink was blank or had no match, check if any application has a populated interview
        if (!interviewData && candidateObj.applications && candidateObj.applications.length > 0) {
            const appWithInterview = candidateObj.applications.find(app => app.interview);
            if (appWithInterview) {
                interviewData = appWithInterview.interview;
            }
        }

        candidateObj.interview = interviewData;

        res.status(200).json(candidateObj);
    } catch (error) {
        console.error('Fetch candidate details error:', error);
        res.status(500).json({ error: 'Failed to fetch candidate details' });
    }
};

export const updateCandidateMe = async (req, res) => {
    try {
        const { clerkId } = req.query;
        if (!clerkId) return res.status(400).json({ error: 'Missing clerkId' });
        await connectDB();
        const updateData = { ...req.body, clerkId };
        if (updateData.projects) updateData.projects = normalizeProjects(updateData.projects);
        
        const candidate = await Candidate.findOneAndUpdate(
            { clerkId },
            { $set: updateData },
            { upsert: true, returnDocument: 'after', runValidators: true }
        );
        res.status(200).json(candidate);
    } catch (error) {
        console.error('Update candidate me error:', error);
        res.status(500).json({ error: 'Failed to update candidate profile' });
    }
};

export const importCandidates = async (req, res) => {
    try {
        let candidates = req.body.candidates;
        if (!candidates || !Array.isArray(candidates)) return res.status(400).json({ error: 'Invalid candidates data' });
        
        candidates = candidates.map(c => ({
            ...c,
            projects: normalizeProjects(c.projects)
        }));
        
        await connectDB();
        const inserted = await Candidate.insertMany(candidates);
        res.status(201).json({ message: 'Candidates imported successfully', count: inserted.length });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to import candidates' });
    }
};

export const getDashboardMetrics = async (req, res) => {
    try {
        await connectDB();
        const totalCandidates = await Candidate.countDocuments();
        const scheduledInterviews = await Candidate.countDocuments({ status: 'scheduled' });
        const screenedCandidates = await Candidate.countDocuments({ status: { $in: ['called', 'scheduled', 'rejected'] } });
        const recentCandidates = await Candidate.find().sort({ updatedAt: -1 }).limit(10);
        const recentActivityItems = recentCandidates.map(c => {
            let message = '';
            let icon = 'CheckCircle2'; 
            if (c.status === 'scheduled') { message = `Interview scheduled with ${c.name} — ${c.role}`; icon = 'Calendar'; }
            else if (c.status === 'called') { message = `AI screened ${c.name} for ${c.role}`; icon = 'CheckCircle2'; }
            else if (c.status === 'pending') { message = `New candidate ${c.name} applied for ${c.role}`; icon = 'Users'; }
            else { message = `AI call completed for ${c.name} — ${c.role}`; icon = 'Clock'; }
            return { message, time: c.updatedAt, icon };
        });
        const screeningRate = totalCandidates > 0 ? Math.round((screenedCandidates / totalCandidates) * 100) : 0;
        const activeJobs = await Job.countDocuments({ status: 'active' });
        res.status(200).json({ activeJobs, totalCandidates, scheduledInterviews, screeningRate, recentActivity: recentActivityItems.slice(0, 5) });
    } catch (error) {
        console.error('Dashboard metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
};

const normalizeProjects = (projects) => {
    if (!projects) return [];
    if (typeof projects === 'string') {
        return projects.split(',').map(p => ({ name: p.trim(), points: [] }));
    }
    if (Array.isArray(projects)) {
        return projects.map(p => {
            if (typeof p === 'string') return { name: p.trim(), points: [] };
            return {
                name: p.name || 'Untitled Project',
                points: Array.isArray(p.points) ? p.points : []
            };
        });
    }
    return [];
};

const extractJSON = (text) => {
    if (!text) throw new Error('AI returned an empty response');
    let clean = text.trim();
    if (clean.startsWith('```json')) clean = clean.slice(7);
    if (clean.startsWith('```')) clean = clean.slice(3);
    if (clean.endsWith('```')) clean = clean.slice(0, -3);

    const start = clean.search(/[\[{]/);
    if (start === -1) throw new Error('AI response did not contain JSON');
    const endChar = clean[start] === '[' ? ']' : '}';
    const end = clean.lastIndexOf(endChar);
    if (end === -1) throw new Error('AI response JSON was incomplete');

    return JSON.parse(clean.slice(start, end + 1));
};

export const parseResume = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No resume file uploaded' });
        const dataBuffer = req.file.buffer;
        const data = await pdfParse(dataBuffer);
        const rawText = data.text;
        if (!rawText || rawText.trim().length === 0) return res.status(400).json({ error: 'Could not extract text from the PDF' });
        
        const prompt = `You are an expert technical recruiter AI. Extract information from this resume text.
        Return ONLY valid JSON with these fields:
        {
          "name": "string",
          "email": "string",
          "phone": "string",
          "role": "string",
          "skills": ["string"],
          "experienceSummary": "string",
          "projects": [{"name": "string", "points": ["string"]}]
        }
        Use empty strings or empty arrays when a field is not present.
        
        RAW TEXT:
        ${rawText}`;

        const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
            },
        });

        const structuredData = extractJSON(response.text);
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);
        structuredData.resumeUrl = `${PUBLIC_API_URL}/uploads/${fileName}`;
        
        // Normalize projects before sending to frontend
        structuredData.projects = normalizeProjects(structuredData.projects);
        
        res.status(200).json(structuredData);
    } catch (error) {
        console.error('Resume Parse Error:', error);
        res.status(500).json({ error: 'Failed to parse resume.' });
    }
};

export const createCandidate = async (req, res) => {
    try {
        await connectDB();
        const candidateData = req.body;
        if (!candidateData.status) candidateData.status = 'pending';
        
        // Normalize projects
        candidateData.projects = normalizeProjects(candidateData.projects);
        
        const candidate = await Candidate.create(candidateData);
        res.status(201).json({ message: 'Candidate added successfully', candidate });
    } catch (error) {
        console.error('Create candidate error:', error);
        res.status(500).json({ error: 'Failed to create candidate' });
    }
};

export const getAllCandidates = async (req, res) => {
    try {
        await connectDB();
        
        // Exclude recruiters and admins
        const nonCandidates = await User.find({ role: { $in: ['recruiter', 'admin'] } }).select('clerkId');
        const excludeClerkIds = nonCandidates.map(u => u.clerkId).filter(id => !!id);
        
        const candidates = await Candidate.find({
            $or: [
                { clerkId: { $nin: excludeClerkIds } },
                { clerkId: { $exists: false } },
                { clerkId: null }
            ]
        }).sort({ createdAt: -1 }).populate('jobMatchScores.jobId', 'title department name status');
        
        res.status(200).json(candidates);
    } catch (error) {
        console.error('Fetch candidates error:', error);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
};

export const sendInvite = async (req, res) => {
    try {
        await connectDB();
        const { candidateId } = req.params;
        const { jobId, deadlineDays = 7 } = req.body;

        if (!candidateId || !mongoose.isValidObjectId(candidateId))
            return res.status(400).json({ error: 'Invalid candidate ID' });

        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        if (!candidate.email) return res.status(400).json({ error: 'Candidate has no email address.' });

        // If already invited to this specific job, return existing link
        const existingApp = candidate.applications?.find(app => app.jobId && app.jobId.toString() === jobId?.toString());
        const isAlreadyInvitedForThisJob = (existingApp && existingApp.interviewLink && ['invited', 'called', 'scheduled'].includes(existingApp.status)) ||
                                           (candidate.jobId && candidate.jobId.toString() === jobId?.toString() && candidate.interviewLink && ['invited', 'called', 'scheduled'].includes(candidate.status));
        
        if (isAlreadyInvitedForThisJob) {
            const link = existingApp ? existingApp.interviewLink : candidate.interviewLink;
            return res.status(200).json({ message: 'Already invited', interviewLink: link });
        }

        const safeName = (candidate.name || 'candidate').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const interviewId = `${safeName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + Number(deadlineDays) || 7);
        const interviewLink = `${PRIMARY_CLIENT_URL}/interview/${interviewId}`;

        let job = null;
        if (jobId && mongoose.isValidObjectId(jobId)) {
            job = await Job.findById(jobId).catch(() => null);
        }

        const jobTitle = job?.title || candidate.role || 'Technical Interview';

        await Interview.create({
            interviewId,
            jobTitle,
            companyName: 'RecruitAI',
            candidateName: candidate.name || 'Candidate',
            status: 'available',
            expiresAt
        });

        if (!candidate.applications) {
            candidate.applications = [];
        }
        if (job) {
            const appIndex = candidate.applications.findIndex(app => app.jobId && app.jobId.toString() === job._id.toString());
            if (appIndex === -1) {
                candidate.applications.push({
                    jobId: job._id,
                    status: 'invited',
                    interviewLink
                });
            } else {
                candidate.applications[appIndex].status = 'invited';
                candidate.applications[appIndex].interviewLink = interviewLink;
            }
        }
        candidate.status = 'invited';
        candidate.interviewLink = interviewLink;
        candidate.role = jobTitle;
        candidate.jobId = job?._id || null;
        await candidate.save();

        res.status(200).json({ message: 'Invite sent', interviewLink, expiresAt });

        // Send email in background after response
        const subject = `Interview Invitation — ${jobTitle}`;
        const text = `Hi ${candidate.name || 'there'},\n\nYou have been invited to complete an AI-powered technical interview at RecruitAI.\n\nPlease complete it before: ${expiresAt.toLocaleDateString()}\n\nYou can start your interview by clicking the link below:\n${interviewLink}\n\nBest regards,\nRecruitAI Team`;
        const html = `<p>Hi ${candidate.name || 'there'},</p><p>You have been invited for an AI interview at RecruitAI.</p><p>Please complete it before: <strong>${expiresAt.toLocaleDateString()}</strong></p><p><a href="${interviewLink}">Click here to start your interview</a></p>`;
        
        sendEmail(candidate.email, subject, text, html).then((success) => {
            if (!success) {
                console.error(`Background email failed for ${candidateId}`);
            }
        }).catch((err) => {
            console.error(`Background email failed for ${candidateId}:`, err.message);
        });

    } catch (error) {
        console.error('Send invite error:', error.message, error.stack);
        res.status(500).json({ error: error.message || 'Failed to send invite' });
    }
};

export const updateCandidate = async (req, res) => {
    try {
        const { candidateId } = req.params;
        if (!candidateId || !mongoose.isValidObjectId(candidateId)) {
            return res.status(400).json({ error: 'Invalid candidate ID' });
        }
        await connectDB();
        
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        
        // Extract jobId from body or candidate
        const targetJobId = req.body.jobId || candidate.jobId;

        // Update candidate fields (excluding jobId from direct body assignment)
        Object.keys(req.body).forEach(key => {
            if (key !== 'jobId') {
                candidate[key] = req.body[key];
            }
        });
        
        if (req.body.jobId) {
            candidate.jobId = req.body.jobId;
        }

        // If status is updated, also update the specific application in candidate.applications
        if (req.body.status && targetJobId) {
            const oldStatus = candidate.status;
            const newStatus = req.body.status;

            if (!candidate.applications) {
                candidate.applications = [];
            }
            const appIndex = candidate.applications.findIndex(app => app.jobId && app.jobId.toString() === targetJobId.toString());
            const reason = req.body.status === 'rejected' ? 'Rejected manually by Recruiter' : null;
            if (appIndex === -1) {
                candidate.applications.push({
                    jobId: targetJobId,
                    status: req.body.status,
                    interviewLink: candidate.interviewLink,
                    rejectionReason: reason
                });
            } else {
                candidate.applications[appIndex].status = req.body.status;
                if (req.body.status === 'rejected') {
                    candidate.applications[appIndex].rejectionReason = reason;
                } else {
                    candidate.applications[appIndex].rejectionReason = null;
                }
                if (candidate.interviewLink && req.body.status === 'invited') {
                    candidate.applications[appIndex].interviewLink = candidate.interviewLink;
                }
            }

            // Send notification email when status is changed manually
            if (oldStatus !== newStatus) {
                let jobTitle = 'the position';
                try {
                    const job = await Job.findById(targetJobId);
                    if (job) jobTitle = job.title;
                } catch (e) {
                    console.error('Error fetching job title for email:', e.message);
                }

                let subject = '';
                let text = '';
                let html = '';

                if (newStatus === 'rejected') {
                    subject = `Application Update — ${jobTitle}`;
                    text = `Hi ${candidate.name || 'there'},\n\nThank you for your interest in the ${jobTitle} position. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nWe appreciate the time you took to apply and wish you the best in your job search.\n\nBest regards,\nRecruitAI Team`;
                    html = `<p>Hi ${candidate.name || 'there'},</p><p>Thank you for your interest in the <strong>${jobTitle}</strong> position. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p><p>We appreciate the time you took to apply and wish you the best in your job search.</p><p>Best regards,<br/>RecruitAI Team</p>`;
                } else if (newStatus === 'matched' || newStatus === 'shortlisted') {
                    subject = `Congratulations! Shortlisted — ${jobTitle}`;
                    text = `Hi ${candidate.name || 'there'},\n\nGreat news! Your profile has been shortlisted for the ${jobTitle} position at RecruitAI.\n\nWe will reach out to you shortly with the next steps regarding your interview process.\n\nBest regards,\nRecruitAI Team`;
                    html = `<p>Hi ${candidate.name || 'there'},</p><p>Great news! Your profile has been shortlisted for the <strong>${jobTitle}</strong> position at RecruitAI.</p><p>We will reach out to you shortly with the next steps regarding your interview process.</p><p>Best regards,<br/>RecruitAI Team</p>`;
                } else if (newStatus === 'pending') {
                    subject = `Application Update — ${jobTitle}`;
                    text = `Hi ${candidate.name || 'there'},\n\nWe wanted to let you know that your application for the ${jobTitle} position is back under review.\n\nWe will keep you updated as we process applications.\n\nBest regards,\nRecruitAI Team`;
                    html = `<p>Hi ${candidate.name || 'there'},</p><p>We wanted to let you know that your application for the <strong>${jobTitle}</strong> position is back under review.</p><p>We will keep you updated as we process applications.</p><p>Best regards,<br/>RecruitAI Team</p>`;
                }

                if (subject) {
                    sendEmail(candidate.email, subject, text, html).catch(err => console.error('Error sending manual update email:', err.message));
                }
            }
        }
        
        await candidate.save();
        res.status(200).json(candidate);
    } catch (error) {
        console.error('Update candidate error:', error);
        res.status(500).json({ error: 'Failed to update candidate status' });
    }
};

