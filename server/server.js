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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
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
import { getDashboardMetrics } from './src/controllers/candidateController.js';
import { getPublicJobs } from './src/controllers/jobController.js';

app.get('/api/dashboard/metrics', getDashboardMetrics);
app.get('/api/public-jobs', getPublicJobs);

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    let audioStream;
    let currentInterviewId;

    socket.on('start_interview', async ({ interviewId }) => {
        currentInterviewId = interviewId;
        console.log(`Starting transcription for interview: ${interviewId}`);
        const recordingsDir = path.resolve('recordings');
        if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir);
        const filePath = path.join(recordingsDir, `${interviewId}.webm`);
        audioStream = fs.createWriteStream(filePath, { flags: 'a' });
        socket.emit('backend_ready', { message: 'Recording stream opened.' });
    });

    socket.on('audio_data', (data) => {
        if (audioStream) audioStream.write(data);
    });

    socket.on('stop_interview', async () => {
        if (audioStream) {
            audioStream.end();
            audioStream = null;
        }
        const interviewId = currentInterviewId;
        try {
            await connectDB();
            const filePath = `recordings/${interviewId}.webm`;
            await Interview.findOneAndUpdate(
                { interviewId },
                { status: 'completed', recordingPath: filePath }
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

    socket.on('disconnect', () => {
        if (audioStream) audioStream.end();
    });
});

// Start Server
connectDB().then(() => {
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
    console.error('DB Connection Failed:', err);
    process.exit(1);
});
