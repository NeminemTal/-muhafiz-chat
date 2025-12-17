import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, ORDER_TOOL } from '../../constants';

export default async (req: Request) => {
  // CORS headers for Webflow embed (Allow requests from anywhere)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY is missing in Netlify Environment Variables");
      throw new Error("API_KEY environment variable is missing");
    }

    const body = await req.json();
    const { history, message } = body;

    const ai = new GoogleGenAI({ apiKey });
    
    // Create chat session with history
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        tools: [{ functionDeclarations: [ORDER_TOOL] }]
      },
      history: history || []
    });

    // Generate response
    const response = await chat.sendMessage({ message });

    let toolCall = undefined;
    
    // Check for tool calls (Order submission)
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      if (call.name === "submit_order") {
        toolCall = {
          name: call.name,
          args: call.args
        };
      }
    }

    return new Response(JSON.stringify({
      text: response.text,
      toolCall: toolCall
    }), {
      headers: { "Content-Type": "application/json", ...headers }
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return new Response(JSON.stringify({ 
      text: "Mašallah, trenutno imamo poteškoća sa serverom. Molim pokušajte ponovo za par trenutaka." 
    }), { status: 500, headers });
  }
};