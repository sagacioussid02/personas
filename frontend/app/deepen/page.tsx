'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import type { KeyboardEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Send, Sparkles, CheckCircle2 } from 'lucide-react';
import AppNav from '@/components/app-nav';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  savedTopic?: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function DeepenChat() {
  const searchParams = useSearchParams();
  const twin_id = searchParams.get('twin_id');
  const router = useRouter();
  const { getToken, isSignedIn, isLoaded } = useAuth();

  const [twinName, setTwinName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [topicAnswerSoFar, setTopicAnswerSoFar] = useState('');
  const [topicsSavedThisSession, setTopicsSavedThisSession] = useState(0);
  const [topicsRemainingEstimate, setTopicsRemainingEstimate] = useState(0);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [loadError, setLoadError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  // Redirect if not signed in once auth loads
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in');
  }, [isLoaded, isSignedIn, router]);

  // Validate twin_id is present
  useEffect(() => {
    if (isLoaded && !twin_id) setLoadError('No twin ID provided.');
  }, [isLoaded, twin_id]);

  // Load twin name for the header
  useEffect(() => {
    if (!twin_id) return;
    fetch(`${API}/twin/${twin_id}`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(data => setTwinName(data.name || ''))
      .catch(() => setLoadError("Couldn't load twin."));
  }, [twin_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-redirect countdown once interview is done
  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) { window.location.href = '/dashboard'; return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [done, countdown]);

  // Kick off the session automatically once we have auth — useRef guards against
  // the double-invoke that React Strict Mode causes in development.
  useEffect(() => {
    if (
      !isSignedIn ||
      !twin_id ||
      loadError ||
      startedRef.current ||
      messages.length > 0 ||
      done
    ) {
      return;
    }
    startedRef.current = true;
    callDeepen('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, twin_id, loadError]);

  const callDeepen = async (userText: string) => {
    if (!twin_id || loadError) {
      return;
    }
    if (sending) return;
    setSending(true);

    const token = await getToken();
    if (!token) { setSending(false); router.push('/sign-in'); return; }

    const newHistory = userText
      ? [...messages, { id: crypto.randomUUID(), role: 'user' as const, content: userText }]
      : messages;

    if (userText) {
      setMessages(newHistory);
      setInput('');
    }

    try {
      const res = await fetch(`${API}/twin/${twin_id}/deepen/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          history: newHistory.map(m => ({ role: m.role, content: m.content })),
          topic_answer_so_far: topicAnswerSoFar,
        }),
      });

      if (res.status === 429) {
        setMessages(prev => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: "You've hit today's usage limit for this account. Please try again tomorrow." },
        ]);
        return;
      }
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();

      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: data.message, savedTopic: !!data.topic_just_saved },
      ]);

      // A saved topic means the interview has moved on to a new (or no)
      // topic — reset the accumulated answer so the next turn starts fresh
      // instead of carrying over the just-saved topic's content.
      setTopicAnswerSoFar(data.topic_just_saved ? '' : (data.topic_answer_so_far || ''));
      if (data.topic_just_saved) setTopicsSavedThisSession(prev => prev + 1);
      setTopicsRemainingEstimate(data.topics_remaining_estimate || 0);

      if (data.done) setDone(true);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || sending || done) return;
    callDeepen(input.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!isLoaded || (!isSignedIn && !loadError)) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200" />
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{loadError}</p>
          <button onClick={() => router.push('/dashboard')} className="text-purple-600 underline text-sm">Back to dashboard</button>
        </div>
      </main>
    );
  }

  const firstName = twinName.split(' ')[0] || 'your twin';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <AppNav />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Deepen {firstName}&apos;s twin</h1>
              <p className="text-sm text-gray-500">
                As many questions as it takes to sharpen how your twin reasons — each answer is saved as soon as it&apos;s specific enough
              </p>
            </div>
          </div>

          {/* Progress — saved traits this session, plus a rough sense of what's left */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-4 px-1">
            <span>
              {topicsSavedThisSession > 0
                ? `${topicsSavedThisSession} trait${topicsSavedThisSession === 1 ? '' : 's'} saved this session`
                : 'Nothing saved yet — keep answering'}
            </span>
            {!done && topicsRemainingEstimate > 0 && (
              <span className="text-gray-400">~{topicsRemainingEstimate} more worth covering</span>
            )}
          </div>

          {/* Chat */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col" style={{ height: '480px' }}>
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-xl">
              <p className="font-semibold text-sm">Depth interview</p>
              <p className="text-xs text-purple-100 mt-0.5">Your answers will improve how your twin handles hard questions</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-lg p-3 text-sm ${m.role === 'user' ? 'bg-slate-700 text-white' : 'bg-gray-50 border border-gray-200 text-gray-800'}`}>
                    {m.savedTopic && (
                      <p className="flex items-center gap-1 text-xs text-purple-600 font-medium mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {done ? (
              <div className="border-t border-gray-100 p-6 bg-purple-50 rounded-b-xl text-center">
                <CheckCircle2 className="w-10 h-10 text-purple-500 mx-auto mb-3" />
                <p className="text-base font-semibold text-purple-800 mb-2">Nothing more to cover right now</p>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-xs text-gray-400">
                    {topicsSavedThisSession} trait{topicsSavedThisSession === 1 ? '' : 's'} saved this session
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {firstName}&apos;s answers are saved and will make future chats sharper and higher fidelity.
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Redirecting to dashboard in {countdown}s…
                </p>
                <button
                  onClick={() => { window.location.href = '/dashboard'; }}
                  className="px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Go to dashboard now
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-100 p-4">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your answer… (Shift+Enter for new line)"
                    rows={3}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 text-sm resize-none"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}

export default function DeepenPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200" />
        </div>
      </main>
    }>
      <DeepenChat />
    </Suspense>
  );
}
