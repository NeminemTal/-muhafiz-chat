import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, ORDER_TOOL } from '../constants';

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  // CORS Headers - Dozvoli pristup sa Webflow-a
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle Preflight (OPTIONS request)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable is missing");
    }

    const { history, message } = req.body;

    const ai = new GoogleGenAI({ apiKey });
    
    // Create chat session
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        tools: [{ functionDeclarations: [ORDER_TOOL] }]
      },
      history: history || []
    });

    const response = await chat.sendMessage({ message });

    let toolCall = undefined;
    
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      if (call.name === "submit_order") {
        toolCall = {
          name: call.name,
          args: call.args
        };
      }
    }

    res.status(200).json({
      text: response.text,
      toolCall: toolCall
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ 
      text: "Mašallah, velika je gužva. Možete li mi to ponoviti, molim Vas?" 
    });
  }
}