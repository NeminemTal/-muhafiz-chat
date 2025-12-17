import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender } from '../types';
import { sendMessageToBackend } from '../services/chatService';
import { WHATSAPP_NUMBER } from '../constants';

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-open logic (30 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messages.length === 0 && !isOpen) {
        setIsOpen(true);
        addBotMessage("Selam alejkum i dobro nam došli. Kako ste danas? Je li vas umorio dunjaluk?");
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [messages.length, isOpen]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBotMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: Sender.BOT,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: Sender.USER,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Send entire history plus new message to backend
      const response = await sendMessageToBackend(messages, userMsg.text);

      if (response.text) {
        addBotMessage(response.text);
      }

      // Handle Order Tool Call -> Redirect to WhatsApp
      if (response.toolCall && response.toolCall.name === 'submit_order') {
        const { name, address, phone } = response.toolCall.args;
        const waText = `Selam alejkum, želim naručiti Cennetul Esma Štit.\n\nIme: ${name}\nAdresa: ${address}\nTelefon: ${phone}\nPlaćanje: Pouzećem`;
        const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;
        
        // Add a system message with a button
        const linkMsg: Message = {
            id: Date.now().toString() + '_sys',
            text: "LINK_ACTION::" + waLink,
            sender: Sender.BOT,
            timestamp: new Date()
        };
        setMessages((prev) => [...prev, linkMsg]);
      }

    } catch (error) {
      console.error("Error sending message", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render text with specific highlighting for key terms
  const renderText = (text: string) => {
    if (text.startsWith("LINK_ACTION::")) {
        const url = text.split("::")[1];
        return (
            <div className="mt-2">
                <p className="mb-2">Hvala Vam. Kliknite na dugme ispod da potvrdite narudžbu putem WhatsApp-a:</p>
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block bg-[#25D366] text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-[#128C7E] transition-colors"
                >
                    POTVRDI NARUDŽBU (WhatsApp)
                </a>
            </div>
        );
    }
    // Bold specific terms for emphasis
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-islamic-green">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-full sm:w-[400px] h-[600px] max-h-[80vh] bg-paper-beige rounded-xl shadow-2xl flex flex-col overflow-hidden border-2 border-islamic-green">
          
          {/* Header */}
          <div className="bg-islamic-green p-4 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-gold-accent overflow-hidden">
                {/* Placeholder for "Hamza" avatar */}
                 <img src="https://picsum.photos/100/100" alt="Muhafiz Hamza" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-xl">Muhafiz Hamza</h3>
                <p className="text-sm text-gold-accent">Duhovni Skrbnik</p>
              </div>
            </div>
            <button 
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gold-accent transition-colors text-3xl leading-none"
                aria-label="Zatvori chat"
            >
              &times;
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-paper-beige">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-2xl text-lg leading-relaxed shadow-sm ${
                    msg.sender === Sender.USER
                      ? 'bg-islamic-green text-white rounded-tr-none'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
                  }`}
                >
                  {renderText(msg.text)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm">
                  <span className="animate-pulse text-islamic-green font-semibold">Hamza piše...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Napišite svoju poruku ovdje..."
                className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-islamic-green text-lg resize-none h-[60px]"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputText.trim()}
                className="bg-islamic-green text-white px-6 rounded-lg font-bold hover:bg-[#004d00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg uppercase tracking-wide"
              >
                Pošalji
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center justify-center transition-all duration-300 transform hover:scale-105"
        >
          <div className="bg-white text-islamic-green py-2 px-4 rounded-lg shadow-lg mr-4 border border-islamic-green hidden group-hover:block">
            <p className="font-bold text-lg">Trebate li savjet, dušo?</p>
          </div>
          <div className="w-16 h-16 bg-islamic-green rounded-full flex items-center justify-center shadow-2xl border-2 border-gold-accent relative">
             <span className="text-3xl">🛡️</span>
             <span className="absolute -top-1 -right-1 bg-red-600 w-4 h-4 rounded-full"></span>
          </div>
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
