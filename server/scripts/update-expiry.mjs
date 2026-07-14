import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const INTERVIEW_ID = 'suresh-veeraboina-1778566359013';

const interviewSchema = new mongoose.Schema({
    interviewId: String,
    expiresAt: Date,
    status: String,
}, { strict: false });

const Interview = mongoose.model('Interview', interviewSchema);

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Set expiry to end of tomorrow (23:59:59)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const result = await Interview.updateOne(
        { interviewId: INTERVIEW_ID },
        { $set: { expiresAt: tomorrow } }
    );

    if (result.matchedCount === 0) {
        console.error(`❌ No interview found with id: ${INTERVIEW_ID}`);
    } else {
        console.log(`✅ Updated expiresAt to: ${tomorrow.toISOString()} (${tomorrow.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST)`);
    }

    await mongoose.disconnect();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
