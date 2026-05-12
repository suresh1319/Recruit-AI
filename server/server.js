import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { DeepgramClient } from '@deepgram/sdk';
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
import { getDashboardMetrics } from './src/controllers/candidateController.js';
import { getPublicJobs } from './src/controllers/jobController.js';

app.get('/api/dashboard/metrics', getDashboardMetrics);
app.get('/api/public-jobs', getPublicJobs);

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    let audioStream;
    let currentInterviewId;
    let deepgramSocket;
    let keepAliveTimer;

    const closeDeepgram = () => {
        if (keepAliveTimer) {
            clearInterval(keepAliveTimer);
            keepAliveTimer = null;
        }
        if (deepgramSocket) {
            try {
                deepgramSocket.sendFinalize({ type: 'Finalize' });
                deepgramSocket.sendCloseStream({ type: 'CloseStream' });
                deepgramSocket.close();
            } catch (err) {
                console.error('Deepgram close error:', err.message);
            }
            deepgramSocket = null;
        }
    };

    const startDeepgram = async () => {
        const apiKey = process.env.DEEPGRAM_API_KEY;
        if (!apiKey) {
            socket.emit('transcription_error', { message: 'Deepgram API key is not configured.' });
            return;
        }

        try {
            const deepgram = new DeepgramClient({ apiKey });
            deepgramSocket = await deepgram.listen.v1.connect({
                Authorization: `Token ${apiKey}`,
                model: 'nova-3',
                language: 'en-US',
                punctuate: true,
                smart_format: true,
                interim_results: true,
                vad_events: true,
                utterance_end_ms: 1200,
                encoding: 'opus',
                sample_rate: 48000,
                channels: 1,
            });

            deepgramSocket.on('open', () => {
                console.log(`Deepgram connected for interview: ${currentInterviewId}`);
                socket.emit('transcription_ready', { provider: 'deepgram', model: 'nova-3' });
                keepAliveTimer = setInterval(() => {
                    try {
                        deepgramSocket?.sendKeepAlive({ type: 'KeepAlive' });
                    } catch (err) {
                        console.error('Deepgram keepalive error:', err.message);
                    }
                }, 10000);
            });

            deepgramSocket.on('message', (message) => {
                if (message.type === 'Results') {
                    const text = message.channel?.alternatives?.[0]?.transcript?.trim();
                    if (!text) return;
                    socket.emit('candidate_transcript', {
                        text,
                        isFinal: Boolean(message.is_final),
                        speechFinal: Boolean(message.speech_final),
                    });
                }

                if (message.type === 'SpeechStarted') {
                    socket.emit('candidate_speech_started');
                }

                if (message.type === 'UtteranceEnd') {
                    socket.emit('candidate_utterance_end');
                }
            });

            deepgramSocket.on('error', (error) => {
                console.error('Deepgram error:', error);
                socket.emit('transcription_error', { message: 'Live transcription connection failed.' });
            });

            deepgramSocket.on('close', () => {
                console.log(`Deepgram closed for interview: ${currentInterviewId}`);
                if (keepAliveTimer) {
                    clearInterval(keepAliveTimer);
                    keepAliveTimer = null;
                }
            });

            deepgramSocket.connect();
            await deepgramSocket.waitForOpen();
        } catch (err) {
            console.error('Deepgram start error:', err);
            socket.emit('transcription_error', { message: 'Could not start live transcription.' });
            closeDeepgram();
        }
    };

    socket.on('start_interview', async ({ interviewId }) => {
        currentInterviewId = interviewId;
        console.log(`Starting transcription for interview: ${interviewId}`);
        const recordingsDir = path.resolve('recordings');
        if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir);
        const filePath = path.join(recordingsDir, `${interviewId}.webm`);
        audioStream = fs.createWriteStream(filePath, { flags: 'a' });
        socket.emit('backend_ready', { message: 'Recording stream opened.' });
        await startDeepgram();
    });

    socket.on('audio_data', (data) => {
        if (audioStream) audioStream.write(data);
        if (deepgramSocket) {
            try {
                deepgramSocket.sendMedia(data);
            } catch (err) {
                console.error('Deepgram media send error:', err.message);
            }
        }
    });

    socket.on('stop_interview', async () => {
        closeDeepgram();
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
        closeDeepgram();
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
