import dotenv from 'dotenv';
dotenv.config();

const fix = async () => {
  try {
    const { default: connectDB } = await import('./src/db/connect.js');
    const { default: Candidate } = await import('./src/models/Candidate.js');
    
    await connectDB();
    const c = await Candidate.findById("69afe3323cf073f78e6c1020");
    if(c) {
      c.status = 'pending';
      c.interviewLink = null;
      await c.save();
      console.log("Fixed candidate!");
    } else {
      console.log("Candidate not found.");
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
};
fix();
