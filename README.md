# Recruit-AI 🚀
**Recruit-AI** is an advanced, AI-powered recruitment and technical screening platform designed to streamline the hiring process. By integrating state-of-the-art Generative AI (Google Gemini) and real-time audio analysis (Deepgram), it automates candidate screening, resume parsing, and technical interviews.

---

## ✨ Key Features

### 🤖 **AI-Driven Technical Interviews**
- **Autonomous Interviewer**: Conducts real-time, voice-activated technical screenings using Gemini AI.
- **Smart Transcription**: Low-latency speech-to-text integration via **Deepgram SDK**.
- **Automated Feedback**: Generates detailed "Screening Feedback Reports" with technical scores (0-100) and final readiness verdicts.

### 📄 **Resume Intelligence**
- **Automated Parsing**: Extracts structured data (skills, projects, experience) from PDF resumes with high accuracy.
- **Job Matching Index**: Dynamically calculates candidate-to-role compatibility scores based on job descriptions and extracted resume data.

### 📊 **Recruiter Dashboard**
- **Centralized Management**: Track all candidate applications, interview results, and matching metrics in one place.
- **Analytics Visualization**: Interactive charts for screening rates and activity trends using **Recharts**.

### ⚡ **Modern Experience**
- **Premium UI**: Built with **React**, **Tailwind CSS 4**, **Shadcn UI**, and **Framer Motion** for a fluid, high-end user experience.
- **Secure Access**: Enterprise-grade authentication powered by **Clerk**.

---

## 🛠️ Technical Stack

### **Frontend**
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS 4, Shadcn UI
- **Animations**: Framer Motion
- **Auth**: Clerk React SDK
- **Data Viz**: Recharts

### **Backend**
- **Runtime**: Node.js (Express)
- **Database**: MongoDB (Mongoose)
- **Real-time**: Socket.io
- **AI Models**: Google Gemini AI (@google/genai)
- **Voice-to-Text**: Deepgram SDK

---

## 🚀 Getting Started

### **Prerequisites**
- **Node.js**: v18+
- **MongoDB**: A running instance or Atlas connection string.
- **API Keys**: Google GenAI, Deepgram, Clerk, and Gmail (for notifications).

### **Setup Instructions**

1. **Clone the repository**:
   ```bash
   git clone https://github.com/suresh1319/Recruit-AI.git
   cd Recruit-AI
   ```

2. **Backend Setup**:
   ```bash
   cd server
   npm install
   # Create a .env file based on .env.example
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   # Create a .env file with Clerk and API URLs
   npm run dev
   ```

---

## 📂 Project Structure
- `frontend/`: React application with Shadcn components and Interview modules.
- `server/`: Express backend with controllers for Candidates, Jobs, and AI Interview logic.
- `server/src/controllers/`: Core business logic for AI analysis and matching.

---

## 📄 License
This project is licensed under the ISC License.
