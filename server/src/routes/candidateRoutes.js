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
    sendInvite,
    updateCandidate
} from '../controllers/candidateController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Static/specific routes MUST come before dynamic /:candidateId
// to prevent Express from treating path segments as candidateId values.
router.get('/me', getCandidateMe);
router.get('/my-applications', getMyApplications);
router.get('/all', getAllCandidates);
router.get('/dashboard/metrics', getDashboardMetrics);
router.post('/parse-resume', upload.single('resume'), parseResume);
router.post('/import', importCandidates);
router.put('/me', updateCandidateMe);
router.get('/', getAllCandidates);   // GET /api/candidates — used by CandidatesTab
router.post('/', createCandidate);

// Dynamic route — must be last among GETs to avoid shadowing static routes above
router.get('/:candidateId', getCandidateById);
router.patch('/:candidateId', updateCandidate);
router.post('/:candidateId/send-invite', sendInvite);

export default router;
