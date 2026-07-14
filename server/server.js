import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import connectDB from './src/db/connect.js';
import Interview from './src/models/Interview.js';
import { performInterviewAnalysis } from './src/controllers/interviewController.js';

// Route Imports
import userRoutes from './src/routes/userRoutes.js';
import candidateRoutes from './src/routes/candidateRoutes.js';
import jobRoutes from './src/routes/jobRoutes.js';
import interviewRoutes from './src/routes/interviewRoutes.js';
import ttsRoutes from './src/routes/ttsRoutes.js';

// Backward compatibility imports (must be at top level in ESM)
import { getDashboardMetrics } from './src/controllers/candidateController.js';
import { getPublicJobs } from './src/controllers/jobController.js';

const app = express();
const httpServer = createServer(app);
const envOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(origin => origin.trim().replace(/\/$/, '')) : [];
const allowedOrigins = [...new Set([...envOrigins, 'http://localhost:5173'])].filter(Boolean);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Modular Routes
app.use('/api/users', userRoutes);
app.use('/api/candidates', candidateRoutes); 
app.use('/api/jobs', jobRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/tts', ttsRoutes);

// Backward compatibility for legacy paths
app.get('/api/dashboard/metrics', getDashboardMetrics);
app.get('/api/public-jobs', getPublicJobs);

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    let currentInterviewId;

    socket.on('start_interview', async ({ interviewId }) => {
        currentInterviewId = interviewId;
        console.log(`Socket connected for proctoring interview: ${interviewId}`);
        socket.emit('backend_ready', { message: 'Proctoring channel opened.' });
    });

    socket.on('stop_interview', async () => {
        const interviewId = currentInterviewId;
        try {
            await connectDB();
            await Interview.findOneAndUpdate(
                { interviewId },
                { status: 'completed' }
            );
            
            setTimeout(() => {
                performInterviewAnalysis(interviewId)
                    .then(() => console.log(`Analysis done for ${interviewId}`))
                    .catch(console.error);
            }, 2000);
            console.log(`Interview ${interviewId} marked as completed.`);
        } catch (err) {
            console.error('Socket stop error:', err);
        }
    });

    socket.on('interview-event', async ({ interviewId, type, timestamp }) => {
        console.log(`[PROCTORING] Event for ${interviewId}: ${type}`);
        try {
            await Interview.findOneAndUpdate(
                { interviewId },
                {
                    $push: {
                        proctoringEvents: {
                            type,
                            timestamp: new Date(timestamp)
                        }
                    }
                }
            );
        } catch (err) {
            console.error('Failed to save proctoring event:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start Server
connectDB().then(() => {
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
    console.error('DB Connection Failed:', err);
    process.exit(1);
});
