import express from 'express';
import multer from 'multer';
import { 
    getCandidateMe, 
    getMyApplications, 
    getCandidateById, 
    updateCandidateMe, 
    importCandidates, 
    getDashboardMetrics, 
    parseResume, 
    createCandidate, 
    getAllCandidates,
    sendInvite
} from '../controllers/candidateController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/me', getCandidateMe);
router.get('/my-applications', getMyApplications);
router.get('/all', getAllCandidates); // Renamed from GET /api/candidates to avoid confusion if needed, but I'll stick to original paths if possible
router.get('/:candidateId', getCandidateById);
router.put('/me', updateCandidateMe);
router.post('/import', importCandidates);
router.get('/dashboard/metrics', getDashboardMetrics); // This path might need adjusting in server.js
router.post('/parse-resume', upload.single('resume'), parseResume);
router.post('/', createCandidate);
router.get('/', getAllCandidates);
router.post('/:candidateId/send-invite', sendInvite);

export default router;
