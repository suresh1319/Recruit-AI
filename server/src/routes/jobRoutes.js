import express from 'express';
import { 
    createJob, 
    generateJobDetails, 
    getAllJobs, 
    getPublicJobs, 
    applyToJob, 
    getMatchedCandidates, 
    getJobById, 
    updateJob, 
    matchCandidates
} from '../controllers/jobController.js';

const router = express.Router();

router.post('/', createJob);
router.post('/generate', generateJobDetails);
router.get('/', getAllJobs);
router.get('/public', getPublicJobs);
router.post('/:jobId/apply', applyToJob);
router.get('/:jobId/matched-candidates', getMatchedCandidates);
router.get('/:jobId', getJobById);
router.patch('/:jobId', updateJob);
router.post('/:jobId/match-candidates', matchCandidates);

export default router;
