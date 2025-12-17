import { GoogleGenAI } from "@google/genai";
import { ChatResponse, Message, Sender } from '../types';
import { SYSTEM_INSTRUCTION, ORDER_TOOL, BACKEND_URL } from '../constants';

// Određivanje API URL-a
// Ako je definisan BACKEND_URL, koristi njega.
// Ako nije, koristi relativnu putanju (ovo radi ako je frontend na istoj domeni kao backend).
const BASE = BACKEND_URL ? BACKEND_URL.replace(/\/$/, "") : ""; 
const API_URL = `${BASE}/api/chat`;

export const sendMessageToBackend = async (history: Message[], newMessage: string): Promise<ChatResponse> => {
  try {
    console.log("Muhafiz Chat: Connecting to", API_URL);

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

    // Provjera da li je odgovor OK i da li je JSON
    const contentType = response.headers.get("content-type");
    if (response.ok && contentType && contentType.includes("application/json")) {
        return await response.json();
    }
    
    // Ako server vrati grešku (npr. 500 ili 404)
    const errorText = await response.text();
    throw new Error(`Server Error (${response.status}): ${errorText}`);

  } catch (error: any) {
    console.warn("Backend connection failed:", error);

    // FALLBACK: Pokušaj klijentske strane (samo ako postoji API_KEY u env varijablama)
    // Ovo je korisno za lokalno testiranje ili ako server padne.
    try {
      let apiKey = "";
      try {
        if (typeof process !== "undefined" && process.env) {
            apiKey = process.env.API_KEY || "";
        }
      } catch (e) {}
      
      if (!apiKey) {
        // Ako nema ključa, vraćamo korisniku grešku
        return {
          text: "⚠️ Oprostite, trenutno imam poteškoća sa povezivanjem na server. Molim pokušajte ponovo malo kasnije.",
        };
      }

      console.log("Using Client-Side Fallback");
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
      console.error("Critical Failure:", clientError);
      return {
        text: "Došlo je do greške u sistemu. Molim osvježite stranicu.",
      };
    }
  }
};