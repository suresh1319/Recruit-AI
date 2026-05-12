import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
export const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
