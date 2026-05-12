import Job from '../models/Job.js';
import Candidate from '../models/Candidate.js';
import connectDB from '../db/connect.js';
import { ai, GEMINI_TEXT_MODEL } from '../config/ai.js';

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
        candidate.status = 'pending';
        candidate.role = job.title;
        await candidate.save();
        res.status(200).json({ message: 'Applied successfully' });
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
        const applied = await Candidate.find({ _id: { $in: job.candidatesApplied } });
        const matched = await Candidate.find({ _id: { $in: job.candidatesMatched } });
        res.status(200).json({ applied, matched });
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
        const job = await Job.findById(req.params.jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        const candidates = await Candidate.find({ status: 'pending' });

        const candidateDataForAI = candidates.map(c => ({
            id: c._id,
            name: c.name,
            skills: c.skills,
            experience: c.experienceSummary
        }));

        const prompt = `Match these candidates to the job "${job.title}".
        Job Description: ${job.description}
        Requirements: ${job.requirements.join(', ')}

        Candidates:
        ${JSON.stringify(candidateDataForAI)}

        Return ONLY a JSON array of objects, e.g:
        [{"candidateId": "...", "matchScore": 85, "reason": "..."}]
        No other text.`;

        const response = await ai.models.generateContent({
            model: GEMINI_TEXT_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
            },
        });
        
        const matches = extractJSON(response.text);
        if (!matches || !Array.isArray(matches)) throw new Error('Failed to extract valid match array from AI');

        const matchedIds = [];
        for (const m of matches) {
            const c = await Candidate.findById(m.candidateId);
            if (!c) continue;
            const idx = c.jobMatchScores.findIndex(s => s.jobId.toString() === job._id.toString());
            if (idx >= 0) c.jobMatchScores[idx].score = m.matchScore;
            else c.jobMatchScores.push({ jobId: job._id, score: m.matchScore });
            
            // Collect matched IDs for the job record, but don't force status change to 'matched' automatically
            if (m.matchScore > 75) { 
                matchedIds.push(c._id); 
            }
            await c.save();
        }
        job.candidatesMatched = matchedIds;
        await job.save();
        res.status(200).json({ message: 'Matching process completed', matches });
    } catch (error) {
        console.error('Match error:', error);
        res.status(500).json({ error: 'Failed to process matches' });
    }
};
