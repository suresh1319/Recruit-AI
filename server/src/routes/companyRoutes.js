import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    submitVerification,
    getCompanyStatus,
    getMyCompany,
    getAllCompanies,
    reviewCompany,
    seedMockData,
    updateCompanyProfile
} from '../controllers/companyController.js';

const router = express.Router();

// Multy-upload disk storage configuration for company documents
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/company_docs';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadDocs = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, or PDF files are allowed!'));
        }
    }
});

const uploadFields = uploadDocs.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'coi', maxCount: 1 },
    { name: 'gstCert', maxCount: 1 }
]);

router.post('/verify', uploadFields, submitVerification);
router.get('/status', getCompanyStatus);
router.get('/my-company', getMyCompany);
router.get('/all', getAllCompanies);
router.patch('/:id/review', reviewCompany);
router.post('/seed-mock-data', seedMockData);
router.put('/update-profile', updateCompanyProfile);

export default router;
