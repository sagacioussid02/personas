"use client";

import React, { useState, useRef, useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  parseErrorResponse,
  toFriendlyError,
  getRetryAfterDelay,
  FriendlyError,
} from "@/lib/error-handler";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatPageProps {
  params?: {
    twinId?: string;
  };
}

/**
 * Chat page component for conversing with a personality twin.
 *
 * Features:
 * - Real-time message display
 * - Friendly error handling for known serverless failure modes
 * - Automatic retry with exponential backoff
 * - Conversation history
 */
export default function ChatPage({ params }: ChatPageProps) {
  const twinId = params?.twinId || "default";
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string, attemptNumber = 0) => {
    if (!text.trim()) return;

    // Add user message immediately
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            twin_id: twinId,
            message: text,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await parseErrorResponse(response);
        if (errorData) {
          const friendlyError = toFriendlyError(errorData);
          setError(friendlyError);

          // Auto-retry for transient errors
          if (
            friendlyError.type === "lambda_cold_start" ||
            friendlyError.type === "bedrock_throttle"
          ) {
            if (attemptNumber < 3) {
              const delayMs = getRetryAfterDelay(response, errorData);
              setTimeout(() => {
                sendMessage(text, attemptNumber + 1);
              }, delayMs);
              return;
            }
          }
        } else {
          setError({
            type: "unknown",
            title: "Error",
            message: `HTTP ${response.status}: ${response.statusText}`,
            actionLabel: "Retry",
            isDismissible: true,
          });
        }
        return;
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setRetryCount(0);
    } catch (err) {
      setError({
        type: "unknown",
        title: "Connection Error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to connect to the service.",
        actionLabel: "Retry",
        isDismissible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === "user");
      if (lastUserMessage) {
        setMessages((prev) => prev.filter((m) => m.id !== lastUserMessage.id));
        sendMessage(lastUserMessage.content);
      }
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Chat with {twinId}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Conversing with a personality twin powered by AI
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-4">👋</div>
                <p className="text-gray-600">Start a conversation with {twinId}</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.role === "user" ? "text-blue-100" : "text-gray-600"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <div className="px-6 py-4 bg-yellow-50 border-t border-yellow-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900">{error.title}</h3>
                <p className="text-sm text-yellow-800 mt-1">{error.message}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-yellow-600 hover:text-yellow-900"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleRetry}
                className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded"
              >
                {error.actionLabel}
              </button>
              {error.isDismissible && (
                <button
                  onClick={() => setError(null)}
                  className="text-sm bg-gray-300 hover:bg-gray-400 text-gray-900 px-3 py-1 rounded"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )}

        {/* Input form */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-6 py-2 rounded-lg transition"
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </ErrorBoundary>
  );
}
