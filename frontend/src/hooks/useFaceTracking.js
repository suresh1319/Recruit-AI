import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export function useFaceTracking(videoRef, socketRef, interviewId, isCamOn, hasStarted) {
    const [faceStatus, setFaceStatus] = useState('detected');
    const [isModelLoading, setIsModelLoading] = useState(true);
    
    const faceLandmarkerRef = useRef(null);
    const activeFrameRef = useRef(null);
    const lastSentEventTimeRef = useRef({});

    const sendProctoringEvent = (type) => {
        if (!socketRef || !socketRef.current || !interviewId || !hasStarted) return;
        const socket = socketRef.current;
        const now = Date.now();
        const lastSent = lastSentEventTimeRef.current[type] || 0;
        if (now - lastSent > 3000) { // throttle to once every 3s
            lastSentEventTimeRef.current[type] = now;
            socket.emit('interview-event', {
                interviewId,
                type,
                timestamp: now
            });
        }
    };

    // Load FaceLandmarker model on mount
    useEffect(() => {
        let isMounted = true;
        
        async function initModel() {
            try {
                setIsModelLoading(true);
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
                );
                
                const landmarker = await FaceLandmarker.createFromOptions(
                    vision,
                    {
                        baseOptions: {
                            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
                        },
                        runningMode: "VIDEO",
                        numFaces: 2,
                        outputFaceBlendshapes: true,
                        outputFacialTransformationMatrixes: false
                    }
                );
                
                if (isMounted) {
                    faceLandmarkerRef.current = landmarker;
                    setIsModelLoading(false);
                    console.log('✅ MediaPipe Face Landmarker initialized successfully from CDN');
                }
            } catch (err) {
                console.error('Failed to initialize Face Landmarker:', err);
                if (isMounted) {
                    setIsModelLoading(false);
                }
            }
        }

        initModel();

        return () => {
            isMounted = false;
            if (faceLandmarkerRef.current) {
                faceLandmarkerRef.current.close();
            }
        };
    }, []);

    // Frame detection loop
    useEffect(() => {
        const videoElement = videoRef ? videoRef.current : null;

        if (isModelLoading || !faceLandmarkerRef.current || !videoElement || !isCamOn || !hasStarted) {
            if (activeFrameRef.current) {
                cancelAnimationFrame(activeFrameRef.current);
                activeFrameRef.current = null;
            }
            if (!isCamOn) {
                setFaceStatus('disabled');
            }
            return;
        }

        const faceLandmarker = faceLandmarkerRef.current;
        let consecutiveMisses = 0;

        function detect() {
            if (!videoElement || videoElement.paused || videoElement.ended) {
                activeFrameRef.current = requestAnimationFrame(detect);
                return;
            }

            try {
                // Ensure video is ready to play
                if (videoElement.readyState >= 2) {
                    const results = faceLandmarker.detectForVideo(
                        videoElement,
                        performance.now()
                    );

                    if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
                        consecutiveMisses++;
                        if (consecutiveMisses > 12) { // ~300ms buffer to avoid blinks or detection hitches
                            setFaceStatus('missing');
                            sendProctoringEvent('NO_FACE');
                        }
                    } else if (results.faceLandmarks.length > 1) {
                        consecutiveMisses = 0;
                        setFaceStatus('multiple');
                        sendProctoringEvent('MULTIPLE_FACES');
                    } else {
                        consecutiveMisses = 0;
                        const landmarks = results.faceLandmarks[0];
                        
                        // Check gaze yaw
                        const leftEye = landmarks[33];
                        const rightEye = landmarks[263];
                        const nose = landmarks[1];
                        
                        let currentStatus = 'detected';
                        
                        if (leftEye && rightEye && nose) {
                            const eyeDist = rightEye.x - leftEye.x;
                            const nosePos = (nose.x - leftEye.x) / eyeDist;
                            
                            if (nosePos < 0.35) {
                                currentStatus = 'looking_right';
                                sendProctoringEvent('LOOKING_AWAY');
                            } else if (nosePos > 0.65) {
                                currentStatus = 'looking_left';
                                sendProctoringEvent('LOOKING_AWAY');
                            }
                        }

                        // Check eyes blinking/closed
                        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
                            const blendshapes = results.faceBlendshapes[0]?.categories || [];
                            const blinkLeft = blendshapes.find(c => c.categoryName === 'eyeBlinkLeft')?.score || 0;
                            const blinkRight = blendshapes.find(c => c.categoryName === 'eyeBlinkRight')?.score || 0;
                            
                            if (blinkLeft > 0.82 && blinkRight > 0.82 && currentStatus === 'detected') {
                                currentStatus = 'eyes_closed';
                                sendProctoringEvent('EYES_CLOSED');
                            }
                        }

                        setFaceStatus(currentStatus);
                    }
                }
            } catch (err) {
                console.error('Error during face detection frame processing:', err);
            }

            activeFrameRef.current = requestAnimationFrame(detect);
        }

        activeFrameRef.current = requestAnimationFrame(detect);

        return () => {
            if (activeFrameRef.current) {
                cancelAnimationFrame(activeFrameRef.current);
                activeFrameRef.current = null;
            }
        };
    }, [isModelLoading, videoRef.current, isCamOn, hasStarted]);

    return { faceStatus, isModelLoading };
}
