import { GoogleGenAI } from "@google/genai";
import { ChatResponse, Message, Sender } from '../types';
import { SYSTEM_INSTRUCTION, ORDER_TOOL, BACKEND_URL } from '../constants';

// Koristimo Vercel API putanju.
// Ako je BACKEND_URL postavljen, koristimo njega (za Webflow).
// Ako nije, pretpostavljamo da smo na istoj domeni (za lokalni test/Vercel preview).
const BASE = BACKEND_URL ? BACKEND_URL.replace(/\/$/, "") : ""; 
const API_URL = `${BASE}/api/chat`;

export const sendMessageToBackend = async (history: Message[], newMessage: string): Promise<ChatResponse> => {
  try {
    // Provjera konfiguracije za Webflow
    if (!BACKEND_URL && typeof window !== 'undefined' && window.location.hostname.includes('webflow.io')) {
       throw new Error("WEBFLOW_CONFIG_MISSING");
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history: history.map(msg => ({
          role: msg.sender === Sender.USER ? 'user' : 'model',
          parts: [{ text: msg.text }]
        })),
        message: newMessage
      }),
    });

    const contentType = response.headers.get("content-type");
    if (response.ok && contentType && contentType.includes("application/json")) {
        return await response.json();
    }
    
    throw new Error(`Backend unavailable (Status: ${response.status}) at ${API_URL}`);

  } catch (error: any) {
    console.warn("Backend failed, attempting Client-Side Fallback:", error);

    // Specijalna poruka ako korisnik nije konfigurisao URL
    if (error.message === "WEBFLOW_CONFIG_MISSING") {
        return {
            text: "⚠️ KONFIGURACIJA POTREBNA:\n\nAplikacija se vrti na Webflow-u, ali nije povezana sa backendom.\n\nMolim vas otvorite fajl 'constants.ts' i u varijablu 'BACKEND_URL' upišite link vašeg Vercel projekta (npr. https://moj-projekat.vercel.app)."
        };
    }

    // Client-Side Fallback (Samo ako postoji API ključ lokalno)
    try {
      let apiKey = "";
      try {
        if (typeof process !== "undefined" && process.env) {
            apiKey = process.env.API_KEY || "";
        }
      } catch (e) {}
      
      if (!apiKey) {
        return {
          text: `⚠️ GREŠKA U POVEZIVANJU:\n\nSistem ne može kontaktirati "Muhafiz" server na adresi:\n${API_URL}\n\n1. Ako ste upravo deployali, sačekajte minutu.\n2. Provjerite da li je BACKEND_URL u 'constants.ts' ispravan.`,
        };
      }

      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          tools: [{ functionDeclarations: [ORDER_TOOL] }]
        },
        history: history.map(msg => ({
          role: msg.sender === Sender.USER ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }))
      });

      const response = await chat.sendMessage({ message: newMessage });

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

      return {
        text: response.text || "...",
        toolCall: toolCall
      };
      
    } catch (clientError: any) {
      console.error("Gemini Client Error:", clientError);
      return {
        text: "Oprostite, došlo je do greške u komunikaciji. Pokušajte ponovo kasnije.",
      };
    }
  }
};