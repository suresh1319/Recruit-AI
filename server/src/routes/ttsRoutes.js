import express from 'express';

const router = express.Router();

router.post('/stream', async (req, res) => {
    try {
        const { text, voiceId = 'Matthew' } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const murfResponse = await fetch('https://global.api.murf.ai/v1/speech/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.MURF_API_KEY
            },
            body: JSON.stringify({
                text,
                voice_id: voiceId,
                model: 'FALCON',
                sample_rate: 24000,
                format: 'PCM'
            })
        });

        if (!murfResponse.ok) return res.status(murfResponse.status).json(await murfResponse.json());

        res.setHeader('Content-Type', 'audio/pcm');
        res.setHeader('Transfer-Encoding', 'chunked');
        const reader = murfResponse.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();
    } catch (error) {
        console.error('TTS Proxy error:', error);
        res.status(500).json({ error: 'Failed to stream audio' });
    }
});

export default router;
