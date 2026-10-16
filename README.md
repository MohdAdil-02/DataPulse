# DataPulse

An AI-powered chatbot for data exploration. Upload a CSV or Excel file and ask questions in plain English. It answers with tables, charts, and ML insights.

**Stack:** MongoDB Atlas, Express, React (Vite), Node.js, Google Gemini API

## Setup

1. `cd server`, copy `.env.example` to `.env` and fill in your values, then `npm install` and `npm run dev`
2. `cd client`, create `.env` with `VITE_API_URL=http://localhost:5000/api`, then `npm install` and `npm run dev`
3. Open http://localhost:5173 and upload a CSV