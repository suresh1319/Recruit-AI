import express from 'express';
import { 
    getAllInterviews, 
    getInterviewById, 
    startInterview, 
    getQuestions, 
    updateTranscript, 
    analyzeInterview 
} from '../controllers/interviewController.js';

const router = express.Router();

router.get('/all', getAllInterviews);
router.get('/:interviewId', getInterviewById);
router.post('/:interviewId/start', startInterview);
router.get('/:interviewId/questions', getQuestions);
router.post('/:interviewId/transcript', updateTranscript);
router.post('/:interviewId/analyze', analyzeInterview);

export default router;
