# AI Recruiter Voice Agent - Workflow Implementation

## Overview
This application implements an end-to-end AI-powered recruitment workflow that automates candidate screening, interviewing, and selection.

## Workflow Steps

### 1. **Create Job Posting**
- Recruiter creates a new job posting with title, description, and requirements
- Job is stored in MongoDB with status 'active'
- **Endpoint**: `POST /api/jobs`

### 2. **AI Match Candidates**
- AI analyzes all pending candidates against job requirements
- Uses Gemini AI to calculate match scores (0-100)
- Candidates with score > 70 are marked as 'matched'
- **Endpoint**: `POST /api/jobs/:jobId/match-candidates`

### 3. **Send Interview Invites**
- Recruiter sends screening interview invites to matched candidates
- System generates unique interview link for each candidate
- Candidate status updated to 'invited'
- **Endpoint**: `POST /api/candidates/:candidateId/send-invite`

### 4. **Candidate Takes AI Interview**
- Candidate clicks link and enters interview portal
- AI voice agent asks pre-defined questions
- Real-time voice transcription using Deepgram
- Responses saved to database
- **Endpoints**: 
  - `GET /api/interviews/:interviewId`
  - `POST /api/interviews/:interviewId/start`
  - `POST /api/interviews/:interviewId/transcript`

### 5. **AI Generates Report**
- After interview completion, AI analyzes transcript
- Generates comprehensive evaluation summary
- Identifies strengths and weaknesses
- **Endpoint**: `POST /api/interviews/:interviewId/analyze`

### 6. **Auto-Select Best Candidates**
- AI automatically selects top candidates (score >= 80)
- Marks candidates as 'selected' with autoSelected flag
- Recruiter can manually review and send to next round
- **Endpoint**: `POST /api/jobs/:jobId/auto-select`

## Database Models

### Candidate
```javascript
{
  name: String,
  email: String,
  phone: String,
  role: String,
  status: ['pending', 'matched', 'invited', 'called', 'selected', 'rejected'],
  matchScore: Number,
  autoSelected: Boolean,
  interviewLink: String,
  skills: [String],
  experienceSummary: String
}
```

### Job
```javascript
{
  title: String,
  description: String,
  requirements: [String],
  status: ['active', 'closed'],
  candidatesMatched: [ObjectId]
}
```

### Interview
```javascript
{
  interviewId: String,
  jobTitle: String,
  candidateName: String,
  status: ['available', 'ongoing', 'completed'],
  transcript: [{speaker, text, time}],
  analysis: String
}
```

## Frontend Components

### Dashboard Tabs
1. **Home** - Overview metrics and workflow visualization
2. **Jobs** - Create jobs and trigger AI matching
3. **Candidates** - View, search, filter, and send invites
4. **Schedules** - Track interviews and view AI reports

### Key Features
- Search and filter candidates
- Grid/List view toggle
- Pagination (6 items per page)
- Delete candidates
- Send interview invites
- View AI analysis reports

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Create new job |
| GET | `/api/jobs` | Get all jobs |
| POST | `/api/jobs/:jobId/match-candidates` | AI match candidates to job |
| POST | `/api/jobs/:jobId/auto-select` | Auto-select best candidates |
| POST | `/api/candidates` | Add new candidate |
| GET | `/api/candidates` | Get all candidates |
| POST | `/api/candidates/:candidateId/send-invite` | Send interview invite |
| GET | `/api/interviews/all` | Get all interviews |
| POST | `/api/interviews/:interviewId/analyze` | Generate AI report |

## Technology Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Google Gemini AI (candidate matching & analysis)
- Deepgram (voice transcription)
- Murf AI (text-to-speech)
- Socket.io (real-time audio streaming)

### Frontend
- React + Vite
- Tailwind CSS + shadcn/ui
- Clerk (authentication)
- Framer Motion (animations)

## Running the Application

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
```
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
MURF_API_KEY=your_murf_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
PORT=5001
```

### Frontend (.env)
```
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
```

## Workflow Diagram

```
Recruiter → Create Job → AI Match Candidates → Send Invites
                                                     ↓
                                          Candidate Interview
                                                     ↓
                                            AI Generate Report
                                                     ↓
                                            Auto-Select Best
                                                     ↓
                                          Recruiter Final Review
```

## Future Enhancements
- Email notifications for invites
- Calendar integration for scheduling
- Multi-language support
- Custom question templates
- Advanced analytics dashboard
- Bulk candidate import
- Integration with ATS systems
