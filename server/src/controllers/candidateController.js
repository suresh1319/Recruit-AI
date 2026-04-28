import Candidate from '../models/Candidate.js';
import Job from '../models/Job.js';
import Interview from '../models/Interview.js';
import connectDB from '../db/connect.js';
import { ai } from '../config/ai.js';
import { sendEmail } from '../utils/sendEmail.js';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

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

export const parseResume = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No resume file uploaded' });
        const dataBuffer = req.file.buffer;
        const data = await pdfParse(dataBuffer);
        const rawText = data.text;
        if (!rawText || rawText.trim().length === 0) return res.status(400).json({ error: 'Could not extract text from the PDF' });
        
        const prompt = `You are an expert technical recruiter AI. Extract information from this resume text. 
        Return ONLY valid JSON with fields: name, email, phone, role, skills (array of strings), experienceSummary, projects (array of objects with 'name' and 'points' which is an array of strings).
        
        RAW TEXT:
        ${rawText}`;

        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        let aiOutput = response.text.trim();
        if (aiOutput.startsWith('```json')) aiOutput = aiOutput.slice(7);
        if (aiOutput.startsWith('```')) aiOutput = aiOutput.slice(3);
        if (aiOutput.endsWith('```')) aiOutput = aiOutput.slice(0, -3);

        const structuredData = JSON.parse(aiOutput.trim());
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);
        structuredData.resumeUrl = `http://localhost:5001/uploads/${fileName}`;
        
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

        const job = await Job.findById(jobId);
        const interviewId = `${candidate.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

        // Deadline logic
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + deadlineDays);

        await Interview.create({
            interviewId,
            jobTitle: job?.title || candidate.role,
            companyName: 'RecruitAI',
            candidateName: candidate.name,
            status: 'available',
            expiresAt
        });

        candidate.status = 'invited';
        candidate.interviewLink = `http://localhost:5173/interview/${interviewId}`;
        await candidate.save();

        if (candidate.email) {
            const subject = `Interview Invitation for ${job?.title || candidate.role}`;
            const html = `<p>Hi ${candidate.name},</p><p>You are invited for an interview. Deadline: ${expiresAt.toLocaleDateString()}</p><p><a href="${candidate.interviewLink}">${candidate.interviewLink}</a></p>`;
            await sendEmail(candidate.email, subject, html, html);
        }

        res.status(200).json({ message: 'Invite sent', interviewLink: candidate.interviewLink, expiresAt });
    } catch (error) {
        console.error('Send invite error:', error);
        res.status(500).json({ error: 'Failed to send invite' });
    }
};
