import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Settings, MonitorUp, Wifi, Shield,
    MessageSquare, Bot, User, Clock, Loader2,
    Volume2, Sparkles, ChevronRight, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '@/lib/api';

const RESPONSE_END_SILENCE_MS = 7000;
const MIN_ANSWER_TIME_MS = 8000;
const MIN_ANSWER_WORDS = 6;
const SPEAKING_LEVEL_THRESHOLD = 0.018;

const InterviewRoom = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();

    // States
    const [candidateName, setCandidateName] = useState(localStorage.getItem(`candidateName_${interviewId}`) || 'Candidate');
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [status, setStatus] = useState('connecting'); // connecting, active, completed
    const [timer, setTimer] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [questions, setQuestions] = useState([]);
    const [transcription, setTranscription] = useState([]);
    const [isBotSpeaking, setIsBotSpeaking] = useState(false);
    const [isCandidateSpeaking, setIsCandidateSpeaking] = useState(false);
    const [interuptEnabled, setInteruptEnabled] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [error, setError] = useState(null);

    // Refs
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);
    const chatEndRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const silenceCheckRef = useRef(null);
    const activeSourcesRef = useRef([]);
    const activeAnswerRef = useRef(""); // Accumulates the current turn's speech (final)
    const latestFullTextRef = useRef(""); // Accumulates final + interim
    const lastResultTimeRef = useRef(0); // Tracks last time speech was heard
    const answerStartedAtRef = useRef(0);
    const candidateAudioLevelRef = useRef(0);
    const analyserRef = useRef(null);
    const analyserFrameRef = useRef(null);
    const socketRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recognitionRef = useRef(null);

    // Context refs for closures
    const isBotSpeakingRef = useRef(isBotSpeaking);
    const isCandidateSpeakingRef = useRef(isCandidateSpeaking);
    const hasStartedRef = useRef(hasStarted);
    const statusRef = useRef(status);

    useEffect(() => { isBotSpeakingRef.current = isBotSpeaking; }, [isBotSpeaking]);
    useEffect(() => { isCandidateSpeakingRef.current = isCandidateSpeaking; }, [isCandidateSpeaking]);
    useEffect(() => { hasStartedRef.current = hasStarted; }, [hasStarted]);
    useEffect(() => { statusRef.current = status; }, [status]);

    // Initial setup
    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            console.log('--- Initializing Interview Room ---');
            try {
                // Run in parallel to be faster
                const [qData, camData] = await Promise.allSettled([
                    fetchQuestions(),
                    startWebcam()
                ]);

                if (qData.status === 'rejected') console.error('Question Fetch Failed:', qData.reason);
                if (camData.status === 'rejected') console.error('Webcam Start Failed:', camData.reason);

                if (isMounted) {
                    console.log('Initialization complete');
                }
            } catch (err) {
                console.error('Core Init Error:', err);
            }
        };
        init();

        const interval = setInterval(() => {
            if (hasStarted) setTimer(prev => prev + 1);
        }, 1000);

        return () => {
            clearInterval(interval);
            stopWebcam();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (socketRef.current) {
                socketRef.current.emit('stop_interview');
                socketRef.current.disconnect();
            }
            stopCandidateAudioMonitor();
        };
    }, []); // Only run on mount

    // Scroll chat to bottom and sync to backend
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

        // Sync transcript to backend for persistence
        if (transcription.length > 0 && hasStarted) {
            fetch(`${API_BASE_URL}/api/interviews/${interviewId}/transcript`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: transcription })
            }).catch(err => console.error('Sync failed:', err));
        }
    }, [transcription, interviewId, hasStarted]);

    // Handle bot speaking when question changes
    useEffect(() => {
        if (!hasStarted) return;

        if (currentQuestionIndex >= 0 && currentQuestionIndex < questions.length) {
            handleBotSpeech(questions[currentQuestionIndex]);
        } else if (currentQuestionIndex >= questions.length && questions.length > 0) {
            setStatus('completed');
            handleBotSpeech("Thank you for your time today. The interview is now complete. The recruiter will connect to you soon.");

            // Trigger analysis now that the interview is completed
            if (interviewId) {
                // Ensure the final transcript is synced before analysis
                const syncAndAnalyze = async () => {
                    try {
                        console.log('Syncing final transcript...');
                        await fetch(`${API_BASE_URL}/api/interviews/${interviewId}/transcript`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ transcript: transcription })
                        });
                        
                        console.log('Interview finished, triggering analysis...');
                        await fetch(`${API_BASE_URL}/api/interviews/${interviewId}/analyze`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                        });
                    } catch (err) {
                        console.error('Final sync/analysis failed:', err);
                    }
                };
                syncAndAnalyze();
            }
        }
    }, [currentQuestionIndex, questions, hasStarted]);

    const handleStartInterview = async () => {
        try {
            // Initialize/Resume AudioContext on user interaction
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            }
            await audioContextRef.current.resume();

            activeAnswerRef.current = ""; // Reset buffer on join
            setHasStarted(true);
            setCurrentQuestionIndex(0);
            initTranscription(); // Initialize Deepgram when the interview actually starts
        } catch (err) {
            console.error('Failed to start interview:', err);
        }
    };

    const fetchQuestions = async () => {
        console.log(`Fetching questions for: ${interviewId}`);
        try {
            const response = await fetch(`${API_BASE_URL}/api/interviews/${interviewId}/questions`);
            if (!response.ok) {
                console.error(`Questions API error: ${response.status}`);
                setError(`Failed to load interview: ${response.status === 404 ? 'Invalid Link' : 'Server Error'}`);
                return;
            }
            const data = await response.json();
            console.log('Questions loaded:', data.questions?.length || 0);
            if (!data.questions || data.questions.length === 0) {
                setError("No questions found for this interview.");
            }
            setQuestions(data.questions || []);
        } catch (err) {
            console.error('Error fetching questions:', err);
            setError("Network error connecting to backend.");
        }
    };

    const startWebcam = async () => {
        console.log('Requesting User Media (Cam+Mic)...');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const msg = isLocal
                ? "Media access blocked. Try using 'localhost' instead of an IP address."
                : "Camera access requires a secure (HTTPS) connection.";
            setError(msg);
            setStatus('active');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            console.log('User Media Access Granted');

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(e => console.error('Video Playback Error:', e));
            } else {
                console.warn('videoRef.current is null, will retry setting srcObject');
                setTimeout(() => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.play().catch(e => console.error('Video Playback Retry Error:', e));
                    }
                }, 1000);
            }

            streamRef.current = stream;
            startCandidateAudioMonitor(stream);
            setStatus('active');
        } catch (err) {
            console.error('Error starting media devices:', err);
            if (err.name === 'NotAllowedError') {
                setError("Camera/Mic permission denied. Please allow access in your browser settings.");
            } else {
                setError("Could not access camera/microphone. Ensure no other app is using them.");
            }
            setStatus('active');
        }
    };

    const stopWebcam = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        stopCandidateAudioMonitor();
    };

    const startCandidateAudioMonitor = (stream) => {
        if (!stream?.getAudioTracks?.().length || analyserRef.current) return;

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            const context = audioContextRef.current || new AudioContextClass();
            audioContextRef.current = context;
            const source = context.createMediaStreamSource(stream);
            const analyser = context.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);
            analyserRef.current = analyser;
            activeSourcesRef.current.push(source);

            const samples = new Uint8Array(analyser.fftSize);
            const readLevel = () => {
                analyser.getByteTimeDomainData(samples);
                let sum = 0;
                for (const value of samples) {
                    const centered = (value - 128) / 128;
                    sum += centered * centered;
                }
                candidateAudioLevelRef.current = Math.sqrt(sum / samples.length);
                analyserFrameRef.current = requestAnimationFrame(readLevel);
            };
            readLevel();
        } catch (err) {
            console.error('Could not start candidate audio monitor:', err);
        }
    };

    const stopCandidateAudioMonitor = () => {
        if (analyserFrameRef.current) {
            cancelAnimationFrame(analyserFrameRef.current);
            analyserFrameRef.current = null;
        }
        activeSourcesRef.current.forEach(source => {
            try {
                source.disconnect();
            } catch (e) { }
        });
        activeSourcesRef.current = [];
        analyserRef.current = null;
        candidateAudioLevelRef.current = 0;
    };

    const initTranscription = async () => {
        console.log('Initializing Deepgram STT...');
        // Initialize Socket.io
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            timeout: 10000
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to backend via Socket.io');
            socket.emit('start_interview', { interviewId });
        });

        socket.on('connect_error', (err) => {
            console.error('Socket.io Connection Error:', err.message);
            setError(`Connection Error: ${err.message}. Ensure backend is running.`);
        });

        socket.on('transcription_ready', ({ provider, model }) => {
            console.log(`Live transcription ready: ${provider} ${model}`);
        });

        socket.on('transcription_error', ({ message }) => {
            console.error('Live transcription error:', message);
            setError(message || 'Live transcription is unavailable.');
        });

        socket.on('candidate_speech_started', () => {
            lastResultTimeRef.current = Date.now();
            if (!answerStartedAtRef.current) answerStartedAtRef.current = Date.now();
            isCandidateSpeakingRef.current = true;
            setIsCandidateSpeaking(true);
        });

        socket.on('candidate_transcript', ({ text, isFinal }) => {
            const cleanText = text?.trim();
            if (!cleanText) return;

            lastResultTimeRef.current = Date.now();
            if (!answerStartedAtRef.current) answerStartedAtRef.current = Date.now();
            isCandidateSpeakingRef.current = true;
            setIsCandidateSpeaking(true);

            if (isFinal) {
                activeAnswerRef.current += (activeAnswerRef.current ? ' ' : '') + cleanText;
            }

            const currentFullText = (activeAnswerRef.current + (!isFinal ? ` ${cleanText}` : '')).trim();
            latestFullTextRef.current = currentFullText;
            upsertCandidateTranscript(currentFullText);
            scheduleTurnCompletionCheck();
        });

        socket.on('candidate_utterance_end', () => {
            scheduleTurnCompletionCheck();
        });

        // Initialize MediaRecorder - Use existing stream if available
        try {
            let recordingStream;
            if (streamRef.current && streamRef.current.getAudioTracks().length > 0) {
                console.log('Reusing existing audio stream for recording');
                recordingStream = streamRef.current;
            } else {
                console.log('Requesting new audio stream for recording');
                recordingStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
            }

            const mediaRecorder = new MediaRecorder(recordingStream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && socket.connected) {
                    socket.emit('audio_data', event.data);
                }
            };

            mediaRecorder.start(250); // Send 250ms chunks
            mediaRecorderRef.current = mediaRecorder;
            console.log('MediaRecorder started');

        } catch (err) {
            console.error('Error starting MediaRecorder:', err);
        }
    };

    const upsertCandidateTranscript = (text) => {
        if (!text) return;

        setTranscription(prev => {
            const lastMsg = prev[prev.length - 1];
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (lastMsg && lastMsg.speaker === 'Candidate' && lastMsg.isLive) {
                const newArr = [...prev];
                newArr[newArr.length - 1] = {
                    ...lastMsg,
                    text,
                    time: timestamp
                };
                return newArr;
            }

            return [...prev, {
                speaker: 'Candidate',
                name: candidateName,
                text,
                time: timestamp,
                isLive: true
            }];
        });
    };

    const finalizeTurn = () => {
        const finalAnswer = latestFullTextRef.current.trim();
        if (!finalAnswer) return;

        setTranscription(prev => {
            const newArr = [...prev];
            const lastIdx = newArr.length - 1;
            if (lastIdx >= 0 && newArr[lastIdx].speaker === 'Candidate' && newArr[lastIdx].isLive) {
                newArr[lastIdx] = {
                    ...newArr[lastIdx],
                    isLive: false,
                    text: finalAnswer
                };
            }
            return newArr;
        });

        activeAnswerRef.current = "";
        latestFullTextRef.current = "";
        answerStartedAtRef.current = 0;
        isCandidateSpeakingRef.current = false;
        setIsCandidateSpeaking(false);
        handleNext();
    };

    const scheduleTurnCompletionCheck = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (silenceCheckRef.current) clearTimeout(silenceCheckRef.current);

        silenceCheckRef.current = setTimeout(() => {
            const answerText = latestFullTextRef.current.trim();
            const wordCount = answerText ? answerText.split(/\s+/).length : 0;
            const silenceMs = Date.now() - lastResultTimeRef.current;
            const answerAgeMs = answerStartedAtRef.current ? Date.now() - answerStartedAtRef.current : 0;
            const micIsQuiet = candidateAudioLevelRef.current < SPEAKING_LEVEL_THRESHOLD;
            const hasEnoughAnswer = wordCount >= MIN_ANSWER_WORDS || answerAgeMs >= MIN_ANSWER_TIME_MS;

            if (
                answerText &&
                hasEnoughAnswer &&
                silenceMs >= RESPONSE_END_SILENCE_MS &&
                micIsQuiet &&
                !isBotSpeakingRef.current
            ) {
                finalizeTurn();
                return;
            }

            scheduleTurnCompletionCheck();
        }, 1000);
    };

    const stopAllSpeech = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setIsBotSpeaking(false);
    };

    const handleBotSpeech = async (text) => {
        try {
            // Stop any existing speech before starting new one
            stopAllSpeech();

            // Clear silence timer when bot starts speaking
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (silenceCheckRef.current) clearTimeout(silenceCheckRef.current);

            // Pause Native Speech Recognition so it doesn't transcribe the bot
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) { }
            }

            setIsBotSpeaking(true);
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            setTranscription(prev => [...prev, {
                speaker: 'AI Bot',
                text: text,
                time: timestamp
            }]);

            // --- Native Web Speech Synthesis (TTS) ---
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                window._interviewUtterance = utterance; // Prevent Chrome garbage collection bug


                // Try to find a good English voice
                const voices = window.speechSynthesis.getVoices();
                const preferredVoice = voices.find(v => v.lang.includes('en-US') && (v.name.includes('Google') || v.name.includes('Edge'))) || voices.find(v => v.lang.includes('en'));
                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                }

                utterance.rate = 1.0;
                utterance.pitch = 1.0;

                utterance.onend = () => {
                    // Resume native recognition when bot is done speaking
                    if (recognitionRef.current && hasStartedRef.current && statusRef.current === 'active') {
                        try {
                            recognitionRef.current.start();
                        } catch (e) { }
                    }
                    setIsBotSpeaking(false);
                };

                utterance.onerror = (e) => {
                    console.error("SpeechSynthesis error:", e);
                    setIsBotSpeaking(false);
                    if (recognitionRef.current && hasStartedRef.current && statusRef.current === 'active') {
                        try {
                            recognitionRef.current.start();
                        } catch (err) { }
                    }
                };

                window.speechSynthesis.speak(utterance);
            } else {
                console.error("Browser does not support Speech Synthesis");
                setIsBotSpeaking(false);
            }

        } catch (err) {
            console.error('Bot speech error:', err);
            setIsBotSpeaking(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleNext = () => {
        if (
            !isBotSpeakingRef.current &&
            !isCandidateSpeakingRef.current &&
            hasStartedRef.current &&
            statusRef.current === 'active'
        ) {
            // No need to manually start anything here, MediaRecorder is persistent
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handleManualNext = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (silenceCheckRef.current) clearTimeout(silenceCheckRef.current);
        finalizeTurn();
    };

    const handleEndCall = () => {
        if (window.confirm("Are you sure you want to end the interview?")) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (socketRef.current) {
                socketRef.current.emit('stop_interview');
                socketRef.current.disconnect();
            }
            stopWebcam();
            stopAllSpeech();
            setStatus('completed');

            // Trigger analysis when manually ending the call
            if (interviewId) {
                const syncAndAnalyze = async () => {
                    try {
                        console.log('Syncing final transcript (manual end)...');
                        await fetch(`${API_BASE_URL}/api/interviews/${interviewId}/transcript`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ transcript: transcription })
                        });
                        
                        console.log('Interview ended manually, triggering analysis...');
                        await fetch(`${API_BASE_URL}/api/interviews/${interviewId}/analyze`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                        });
                    } catch (err) {
                        console.error('Manual end sync/analysis failed:', err);
                    }
                };
                syncAndAnalyze();
            }

            navigate(`/candidate/dashboard`);
        }
    };

    return (
        <div className="dark h-screen bg-[#020617] text-slate-100 flex flex-col overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Force Background Reset */}
            <style dangerouslySetInnerHTML={{
                __html: `
                body, html, #root { background-color: #020617 !important; color: #f1f5f9 !important; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />

            {/* Header */}
            <header className="h-20 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl flex items-center justify-between px-8 shrink-0 z-40">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-xl shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                        {candidateName.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                            {questions.length > 0 ? `AI Technical Interview` : 'Initializing Session...'}
                        </h1>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                            <span className="font-mono tracking-wider">{formatTime(timer)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase">HD Connection</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Start Interview Overlay */}
                <AnimatePresence>
                    {!hasStarted && status === 'active' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl p-6 text-center"
                        >
                            <Card className="max-w-md w-full bg-[#0f172a] border-white/10 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
                                <div className="w-24 h-24 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
                                    <Bot size={48} className="text-indigo-400" />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-extrabold text-white tracking-tight">
                                        {error ? "Setup Required" : "Ready to begin?"}
                                    </h2>
                                    <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto text-balance">
                                        {error || "The AI interviewer is prepared and waiting for you to join."}
                                    </p>
                                </div>
                                <Button
                                    onClick={handleStartInterview}
                                    disabled={!!error || questions.length === 0}
                                    className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-800 disabled:text-slate-500 rounded-2xl text-lg font-bold shadow-[0_10px_30px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {error ? "Check Settings" : "Start Ask Questions"}
                                    {!error && <ChevronRight size={20} />}
                                </Button>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pb-2">
                                    {error ? "Please resolve the above issues to proceed" : "Ensure your camera and mic are working"}
                                </p>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Completed Interview Overlay */}
                <AnimatePresence>
                    {status === 'completed' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl p-6 text-center"
                        >
                            <Card className="max-w-md w-full bg-[#0f172a] border-white/10 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
                                <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
                                    <Sparkles size={48} className="text-emerald-400" />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-extrabold text-white tracking-tight">
                                        Interview Complete
                                    </h2>
                                    <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto text-balance">
                                        Thank you for your time today. The recruiter will connect with you soon.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => navigate('/candidate/dashboard')}
                                    className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-bold shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                                >
                                    Return to Dashboard
                                    <ChevronRight size={20} />
                                </Button>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Video Area */}
                <div className="flex-1 p-8 flex flex-col gap-8 overflow-hidden relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
                        {/* AI Bot Tile */}
                        <div className="relative rounded-[2.5rem] bg-[#0f172a] border border-white/5 overflow-hidden shadow-2xl flex flex-col items-center justify-center p-8 group">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-50"></div>

                            <div className="relative z-10 flex flex-col items-center gap-12">
                                {/* Bot Avatar Container - Allow overflow for rings */}
                                <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center translate-y-[-10%]">
                                    <AnimatePresence>
                                        {isBotSpeaking && (
                                            <>
                                                <motion.div
                                                    initial={{ scale: 1, opacity: 0.5 }}
                                                    animate={{ scale: 1.8, opacity: 0 }}
                                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                                                    className="absolute inset-0 rounded-full border-2 border-indigo-500/30"
                                                />
                                                <motion.div
                                                    initial={{ scale: 1, opacity: 0.5 }}
                                                    animate={{ scale: 2.5, opacity: 0 }}
                                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                                                    className="absolute inset-0 rounded-full border-2 border-indigo-500/20"
                                                />
                                            </>
                                        )}
                                    </AnimatePresence>

                                    <div className={`w-36 h-36 md:w-48 md:h-48 rounded-[3.5rem] bg-gradient-to-br from-[#1e293b] to-[#010617] flex items-center justify-center border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-20 transition-all duration-500 ${isBotSpeaking ? 'scale-110 rotate-3' : 'scale-100'}`}>
                                        <div className="bg-indigo-600 w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-600/30">
                                            <Bot size={56} className="text-white" />
                                        </div>

                                        {isBotSpeaking && (
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 0.5, repeat: Infinity }}
                                                className="absolute -top-3 -right-3 bg-red-500 p-3 rounded-2xl shadow-lg border border-white/20"
                                            >
                                                <Volume2 size={24} className="text-white" />
                                            </motion.div>
                                        )}
                                    </div>

                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 rounded-2xl bg-indigo-600 text-[11px] font-black tracking-[0.2em] uppercase shadow-xl shadow-indigo-600/20 z-30 border border-white/10">
                                        AI AGENT
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8 flex items-center gap-3 z-10">
                                <div className="px-5 py-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-sm font-bold tracking-tight text-white shadow-lg flex items-center gap-3">
                                    TechFlow AI Assistant
                                </div>
                            </div>
                        </div>

                        {/* Candidate Video Tile */}
                        <div className="relative rounded-[2.5rem] bg-[#0f172a] border border-white/5 overflow-hidden shadow-2xl group">
                            {!isCamOn && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070b14] z-10 p-12 text-center">
                                    <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                                        <User size={48} className="text-slate-600" />
                                    </div>
                                    <p className="text-slate-400 text-lg font-bold tracking-tight">Camera Disabled</p>
                                    <p className="text-slate-600 text-sm mt-2 font-medium">Please enable your camera for the interview</p>
                                </div>
                            )}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-700 ${!isCamOn ? 'opacity-30 blur-sm' : 'opacity-100'}`}
                            />

                            <div className="absolute bottom-8 left-8 flex items-center gap-3 z-10 transition-transform group-hover:scale-105 duration-300">
                                <div className="px-5 py-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-sm font-bold tracking-tight text-white shadow-lg">
                                    {candidateName} (You)
                                </div>
                            </div>

                            {isCandidateSpeaking && (
                                <div className="absolute top-8 right-8 z-20 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                    <motion.div
                                        animate={{ opacity: [1, 0.4, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                                    />
                                    <span className="text-[10px] font-black text-red-500 tracking-widest uppercase">REC</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="h-28 shrink-0 flex items-center justify-center px-4 relative z-40">
                        <div className="flex items-center gap-6 bg-[#0f172a]/95 border border-white/10 rounded-[2.5rem] p-4 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                            <div className="flex items-center gap-3 border-r border-white/10 pr-6 mr-2">
                                <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-300 group">
                                    <Settings size={24} className="group-hover:rotate-45 transition-transform" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-300 group">
                                    <MonitorUp size={24} className="group-hover:-translate-y-1 transition-transform" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-5">
                                <Button
                                    size="icon"
                                    onClick={() => setIsMicOn(!isMicOn)}
                                    className={`h-16 w-16 rounded-[1.5rem] transition-all duration-500 shadow-xl ${isMicOn ? 'bg-slate-800 text-white border border-white/10 hover:bg-slate-700' : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'}`}
                                >
                                    {isMicOn ? <Mic size={28} /> : <MicOff size={28} />}
                                </Button>
                                <Button
                                    size="icon"
                                    onClick={() => setIsCamOn(!isCamOn)}
                                    className={`h-16 w-16 rounded-[1.5rem] transition-all duration-500 shadow-xl ${isCamOn ? 'bg-slate-800 text-white border border-white/10 hover:bg-slate-700' : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'}`}
                                >
                                    {isCamOn ? <Video size={28} /> : <VideoOff size={28} />}
                                </Button>
                                <Button
                                    size="icon"
                                    onClick={handleEndCall}
                                    className="h-16 w-16 rounded-[1.5rem] bg-red-500 text-white hover:bg-red-600 shadow-2xl shadow-red-500/40 transition-all hover:scale-110 active:scale-95 flex items-center justify-center p-0"
                                >
                                    <PhoneOff size={28} fill="currentColor" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-5 border-l border-white/10 pl-6 ml-2">
                                {hasStarted && status === 'active' && (
                                    <Button
                                        onClick={handleManualNext}
                                        disabled={isBotSpeaking || isCandidateSpeaking}
                                        className="h-14 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        Next Question
                                        <ChevronRight size={18} />
                                    </Button>
                                )}
                                <div className="hidden lg:flex items-center gap-3 px-5 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                                    <Shield size={20} className="text-indigo-400" />
                                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.15em] whitespace-nowrap">Secured Line</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Transcription */}
                <aside className="w-[450px] border-l border-white/5 bg-[#070b14] flex flex-col hidden xl:flex shrink-0">
                    <div className="p-8 border-b border-white/5 bg-[#070b14]/50 backdrop-blur-xl sticky top-0 z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30">
                                    <Sparkles size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-lg tracking-tight text-white">Live Copilot</h3>
                                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Transcription & Analytics</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-black text-emerald-500 tracking-wider">ACTIVE</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide bg-[#070b14]">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-300 leading-relaxed text-center font-medium italic shadow-inner"
                        >
                            Session connected. Your responses are being transcribed in real-time.
                        </motion.div>

                        {transcription.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className={`space-y-2.5 ${msg.speaker === 'AI Bot' ? '' : 'flex flex-col items-end'}`}
                            >
                                <div className="flex items-center gap-3 px-2">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${msg.speaker === 'AI Bot' ? 'text-indigo-400 font-bold' : 'text-slate-500 font-bold'}`}>
                                        {msg.speaker === 'AI Bot' ? 'AI INTERVIEWER' : `${msg.name || 'INTERVIEWEE'} (YOU)`}
                                    </span>
                                    {msg.isLive && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-[8px] font-black text-red-500 border border-red-500/20 animate-pulse">
                                            LIVE
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-600 font-mono italic">{msg.time}</span>
                                </div>
                                <div className={`p-5 rounded-[2rem] text-[13px] leading-[1.6] max-w-[85%] shadow-2xl transition-all ${msg.speaker === 'AI Bot'
                                    ? 'bg-[#1e293b] text-slate-100 border border-white/5 rounded-tl-none font-medium'
                                    : 'bg-indigo-600 text-white rounded-tr-none font-bold shadow-indigo-600/20'
                                    }`}>
                                    {msg.text}
                                </div>
                            </motion.div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-8 border-t border-white/5 bg-[#020617] space-y-6">
                        <div className="flex items-center justify-center gap-3 text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] pt-2">
                            <Shield size={12} className="text-emerald-500" />
                            SECURE PRIVATE ROOM
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default InterviewRoom;
