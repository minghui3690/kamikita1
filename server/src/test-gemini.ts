
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("API_KEY not found in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);


// ... (keep imports)

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  
  try {
    console.log("Fetching models from:", url.replace(API_KEY || '', 'HIDDEN_KEY'));
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
        console.log("AVAILABLE MODELS:");
        data.models.forEach((m: any) => {
            console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
        });
    } else {
        console.log("No models returned or error:", data);
    }

  } catch (error: any) {
    console.error("Fetch Error:", error.message);
  }
}

listModels();

