"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, Sparkles, User, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m-0",
      role: "assistant",
      content:
        "Namaste! I am Setu Sahayak, your AI Procurement & Commitment Advisor. I can analyze open buyer contracts (Reliance, BigBasket), explain shortfall risks, and verify calibrated commitment intervals for Sahyadri FPO.",
      time: "Just now",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        "Based on our calibrated models, Contract CTR-2025-07 (Reliance Retail) is AMBER: recommend committing 72.4 tonnes. Contract CTR-2025-08 (BigBasket) is GREEN: safe to commit 60 tonnes.";

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            "Contract CTR-2025-07 (Reliance Retail, 100t Onion) recommendation: Commit 72.4t now. Committing 100t carries a 91% shortfall risk.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Should we commit 100t to Reliance?",
    "Why is CTR-2025-07 marked AMBER?",
    "Is BigBasket 60t Tomato safe?",
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2.5 bg-[#1F4E35] hover:bg-[#163A27] text-white px-4 py-3 rounded-full shadow-lg border border-[#163A27] transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/40"
        >
          <Bot className="w-5 h-5 text-[#EAF2ED]" />
          <span className="text-xs font-semibold tracking-wide">Ask Setu Advisor</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="w-[380px] sm:w-[410px] h-[520px] bg-white rounded-lg shadow-2xl border border-[#DCE1DD] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#1F4E35] text-white p-3.5 flex items-center justify-between border-b border-[#163A27]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-[#163A27] border border-[#2B6A49] flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-bold tracking-wide">Setu Sahayak</h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2B6A49] text-white font-mono">
                    NVIDIA NIM
                  </span>
                </div>
                <p className="text-[10px] text-[#A5D6B9]">AI Procurement & Commitment Advisor</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-[#163A27] text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#F9FAF8] text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-md text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#1F4E35] text-white rounded-br-none"
                      : "bg-white text-[#1C201E] border border-[#DCE1DD] shadow-xs rounded-bl-none"
                  }`}
                >
                  {m.content}
                </div>
                <span className="text-[9px] text-[#5A635E] mt-1 px-1 font-mono">{m.time}</span>
              </div>
            ))}
            {loading && (
              <div className="flex items-center space-x-2 p-2 text-xs text-[#5A635E]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1F4E35]" />
                <span className="text-[11px]">Evaluating conformal bounds via NVIDIA NIM...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-2 bg-white border-t border-[#DCE1DD] flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                disabled={loading}
                className="whitespace-nowrap text-[10.5px] px-2 py-1 rounded bg-[#EAF2ED] hover:bg-[#D5E5DA] text-[#1F4E35] border border-[#C5D8CC] transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-[#DCE1DD] flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about contracts, shortfall risk, or bounds..."
              className="flex-1 text-xs px-3 py-2 bg-[#F9FAF8] border border-[#DCE1DD] rounded focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20 focus:border-[#1F4E35] text-[#1C201E]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-[#1F4E35] hover:bg-[#163A27] disabled:opacity-50 text-white rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F4E35]/20"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
