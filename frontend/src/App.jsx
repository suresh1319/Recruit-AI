import { Routes, Route } from "react-router-dom"
import LandingPage from './LandingPage'
import SignInPage from "./pages/SignInPage"
import SignUpPage from './pages/SignUpPage';
import Dashboard from './pages/Dashboard';
import InterviewPage from './pages/InterviewPage';
import InterviewRoom from './pages/InterviewRoom';
import CandidateDetails from './pages/CandidateDetails';
import CandidateDashboard from './pages/CandidateDashboard';
import JobDetails from './pages/JobDetails';
import JobCandidatesDashboard from './pages/JobCandidatesDashboard';
import CompanyVerificationPage from './pages/CompanyVerificationPage';
import AdminVerificationPage from './pages/AdminVerificationPage';
import SyncUser from './components/SyncUser';
import { Toaster } from 'sonner';

function App() {
  return (
    <div>
      <Toaster position="top-right" richColors />
      <SyncUser />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />

        {/* Public Interview Routes */}
        <Route path="/interview/:interviewId" element={<InterviewPage />} />
        <Route path="/interview/:interviewId/room" element={<InterviewRoom />} />

        {/* Protected Dashboard Route */}
        <Route
          path="/dashboard"
          element={<Dashboard />} />

        <Route path="/verify-company" element={<CompanyVerificationPage />} />
        <Route path="/admin/verify" element={<AdminVerificationPage />} />

        {/* Candidate Portal Route */}
        <Route
          path="/candidate-dashboard"
          element={<CandidateDashboard />} />

        <Route
          path="/candidate/:id"
          element={<CandidateDetails />} />

        <Route
          path="/report/:interviewId"
          element={<CandidateDetails />} />

        <Route path="/job/:id" element={<JobDetails />} />
        <Route path="/job/:id/candidates" element={<JobCandidatesDashboard />} />
      </Routes>
    </div>
  )
}

export default App
