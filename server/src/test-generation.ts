
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("API_KEY not found in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const CANDIDATES = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-pro", 
    "gemini-pro-latest",
    "gemini-1.0-pro",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-flash-lite-latest"
];

async function testModels() {
  console.log("Starting Model Functionality Test...");
  
  for (const modelName of CANDIDATES) {
      process.stdout.write(`Testing ${modelName}... `);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Test.");
        const response = result.response.text();
        console.log(`✅ SUCCESS! Response: ${response.substring(0, 20)}...`);
        console.log(`\n>>> WE FOUND A WORKING MODEL: ${modelName} <<<\n`);
        return; // Stop after first success
      } catch (error: any) {
          if (error.message.includes("404")) {
              console.log("❌ Not Found (404)");
          } else {
              console.log(`❌ Error: ${error.message.substring(0, 50)}...`);
          }
      }
  }
  console.log("All candidates failed.");
}

testModels();
