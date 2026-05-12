import Candidate from '../models/Candidate.js';
import Job from '../models/Job.js';
import Interview from '../models/Interview.js';
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
        const appliedJobs = await Job.find({ candidatesApplied: candidate._id });
        const applications = appliedJobs.map(job => ({
            jobId: job._id,
            jobTitle: job.title,
            department: job.department,
            location: job.location,
            employmentType: job.employmentType,
            appliedOn: job.updatedAt,
            applicationStatus: candidate.status,
            interviewLink: candidate.interviewLink || null,
        }));
        res.status(200).json({ applications, candidateStatus: candidate.status });
    } catch (error) {
        console.error('My applications error:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
};

export const getCandidateById = async (req, res) => {
    try {
        const { candidateId } = req.params;
        if(candidateId === 'me') return; 
        await connectDB();
        const candidate = await Candidate.findById(candidateId).populate('jobMatchScores.jobId', 'title department name status');
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        res.status(200).json(candidate);
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
        const candidates = await Candidate.find().sort({ createdAt: -1 }).populate('jobMatchScores.jobId', 'title department name status');
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

        if (!candidateId || candidateId.length !== 24) return res.status(400).json({ error: 'Invalid candidate ID' });

        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

        // Ensure email is sent only once
        if (candidate.status === 'invited' || candidate.interviewLink) {
            return res.status(400).json({ error: 'An invite has already been sent to this candidate.' });
        }

        if (!candidate.email) {
            return res.status(400).json({ error: 'Candidate does not have an email address.' });
        }

        const job = await Job.findById(jobId);
        const interviewId = `${candidate.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

        // Deadline logic
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + deadlineDays);
        
        const interviewLink = `${CLIENT_URL}/interview/${interviewId}`;

        // Attempt to send the email first, before saving to database
        const subject = `Interview Invitation for ${job?.title || candidate.role}`;
        const html = `<p>Hi ${candidate.name},</p><p>You are invited for an interview. Deadline: ${expiresAt.toLocaleDateString()}</p><p><a href="${interviewLink}">${interviewLink}</a></p>`;
        
        const emailSent = await sendEmail(candidate.email, subject, html, html);

        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send email. Please check your email server credentials.' });
        }

        // If email was successful, then save to DB
        await Interview.create({
            interviewId,
            jobTitle: job?.title || candidate.role,
            companyName: 'RecruitAI',
            candidateName: candidate.name,
            status: 'available',
            expiresAt
        });

        candidate.status = 'invited';
        candidate.interviewLink = interviewLink;
        await candidate.save();

        res.status(200).json({ message: 'Invite sent', interviewLink: candidate.interviewLink, expiresAt });
    } catch (error) {
        console.error('Send invite error:', error);
        res.status(500).json({ error: 'Failed to send invite' });
    }
};
