'use client';

import { useState, useEffect } from 'react';
import { useAuth, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import PersonaAvatar from '@/components/persona-avatar';
import Twin from '@/components/twin';
import { Sparkles } from 'lucide-react';

interface PublicPersona {
  twin_id: string;
  name: string;
  title: string;
  tagline: string;
  era: string;
  image_url?: string;
  chat_url: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function PersonasLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return <img src="/personas-logo.svg" alt="" aria-hidden="true" className={className} />;
}

function StreamingTagline() {
  const [taglines, setTaglines] = useState<string[]>([]);
  const [displayText, setDisplayText] = useState('');
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch taglines from backend on mount
  useEffect(() => {
    const fetchTaglines = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/taglines`);
        const data = await response.json();
        setTaglines(data.taglines || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching taglines:', error);
        // Fallback taglines
        setTaglines([
          "Coffee with this guy",
          "Resumes are old school",
          "Your digital brainpower unleashed",
          "The future of collaboration is here",
          "AI that gets you",
          "Your second brain in action",
          "Talk to your smarter self",
          "Meet Sidd 2.0",
          "Intelligence amplified",
          "Your AI just leveled up"
        ]);
        setIsLoading(false);
      }
    };

    fetchTaglines();
  }, []);

  // Streaming effect for taglines
  useEffect(() => {
    if (taglines.length === 0) return;

    const currentTagline = taglines[taglineIndex];
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex <= currentTagline.length) {
        setDisplayText(currentTagline.substring(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setTaglineIndex((prev) => (prev + 1) % taglines.length);
          setDisplayText('');
        }, 2000);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [taglineIndex, taglines]);

  return (
    <span className="inline-block font-semibold text-base text-gray-500">
      {isLoading ? '' : displayText}
      <span className="animate-pulse text-purple-400">|</span>
    </span>
  );
}

export default function Home() {
  const { isSignedIn } = useAuth();
  const [publicPersonas, setPublicPersonas] = useState<PublicPersona[]>([]);

  useEffect(() => {
    fetch(`${API}/public-personas`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.personas) setPublicPersonas(data.personas); })
      .catch((error) => {
        console.error('Failed to load public personas:', error);
      });
  }, []);

  const marqueePersonas = publicPersonas.length > 0 ? [...publicPersonas, ...publicPersonas] : [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.18),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_42%,_#f8fafc_100%)] relative overflow-x-hidden">
      {/* Crayon doodle background */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 w-full h-full opacity-[0.055] animate-crayon-drift"
        xmlns="http://www.w3.org/2000/svg"
        style={{ zIndex: 0 }}
      >
        {/* wavy scribble lines */}
        <path d="M-10 80 Q60 60 120 90 Q180 120 240 85 Q300 55 360 90 Q420 120 480 80 Q540 45 600 85 Q660 115 720 75 Q780 40 840 80 Q900 115 960 78 Q1020 45 1100 82" stroke="#7c3aed" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M-10 200 Q80 175 160 210 Q240 240 320 198 Q400 160 480 205 Q560 245 640 195 Q720 150 800 198 Q880 240 960 192 Q1040 150 1100 200" stroke="#f97316" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M-10 330 Q70 305 150 340 Q230 370 310 328 Q390 288 470 332 Q550 372 630 325 Q710 282 790 330 Q870 372 950 322 Q1030 278 1100 330" stroke="#0ea5e9" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M-10 460 Q90 435 180 465 Q270 495 360 455 Q450 415 540 460 Q630 500 720 452 Q810 408 900 455 Q990 498 1100 452" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M-10 590 Q100 560 200 595 Q300 628 400 585 Q500 545 600 590 Q700 632 800 582 Q900 538 1100 585" stroke="#f43f5e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M-10 720 Q110 690 220 722 Q330 755 440 712 Q550 672 660 718 Q770 758 880 710 Q990 665 1100 715" stroke="#a855f7" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M-10 850 Q90 820 190 855 Q290 888 390 845 Q490 805 590 848 Q690 888 790 842 Q890 800 1100 848" stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* stars */}
        <text x="68" y="148" fontSize="22" fill="#f97316" style={{fontFamily:'sans-serif'}}>★</text>
        <text x="310" y="42" fontSize="16" fill="#7c3aed" style={{fontFamily:'sans-serif'}}>★</text>
        <text x="540" y="270" fontSize="20" fill="#0ea5e9" style={{fontFamily:'sans-serif'}}>★</text>
        <text x="820" y="130" fontSize="18" fill="#10b981" style={{fontFamily:'sans-serif'}}>★</text>
        <text x="970" y="410" fontSize="22" fill="#f43f5e" style={{fontFamily:'sans-serif'}}>★</text>
        <text x="190" y="500" fontSize="16" fill="#a855f7" style={{fontFamily:'sans-serif'}}>★</text>
        <text x="700" y="640" fontSize="20" fill="#f59e0b" style={{fontFamily:'sans-serif'}}>★</text>
        <text x="420" y="780" fontSize="18" fill="#0ea5e9" style={{fontFamily:'sans-serif'}}>★</text>
        {/* small circles / dots */}
        <circle cx="140" cy="310" r="7" fill="none" stroke="#f97316" strokeWidth="2.5" />
        <circle cx="460" cy="145" r="9" fill="none" stroke="#7c3aed" strokeWidth="2.5" />
        <circle cx="750" cy="380" r="7" fill="none" stroke="#10b981" strokeWidth="2.5" />
        <circle cx="930" cy="240" r="10" fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
        <circle cx="280" cy="660" r="8" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
        <circle cx="620" cy="510" r="6" fill="none" stroke="#a855f7" strokeWidth="2.5" />
        <circle cx="1050" cy="570" r="9" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
        {/* loose spirals / loops */}
        <path d="M50 420 Q65 405 80 420 Q95 435 80 450 Q60 465 45 445 Q32 425 55 410 Q78 397 92 418" stroke="#7c3aed" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M870 680 Q885 665 900 680 Q915 695 900 710 Q880 725 865 705 Q852 685 875 670 Q898 657 912 678" stroke="#f97316" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M340 250 Q355 235 370 250 Q385 265 370 280 Q350 295 335 275 Q322 255 345 240 Q368 227 382 248" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* zigzag */}
        <path d="M600 350 l12-18 l12 18 l12-18 l12 18 l12-18 l12 18" stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M180 740 l10-16 l10 16 l10-16 l10 16 l10-16 l10 16" stroke="#0ea5e9" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* squiggly underlines */}
        <path d="M200 56 Q208 50 216 56 Q224 62 232 56 Q240 50 248 56 Q256 62 264 56 Q272 50 280 56" stroke="#f43f5e" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M740 820 Q748 814 756 820 Q764 826 772 820 Q780 814 788 820 Q796 826 804 820 Q812 814 820 820" stroke="#a855f7" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <div className="relative z-10">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl shadow-md shadow-sky-200/60 overflow-hidden">
            <PersonasLogo className="w-full h-full" />
          </div>
          <span className="font-bold text-gray-800 tracking-tight">Personas</span>
        </div>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <Link href="/dashboard" className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors">Dashboard</Link>
              <UserButton />
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
              <Link href="/sign-up" className="text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity font-medium">Get started</Link>
            </>
          )}
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 flex-wrap justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-200 bg-white/70 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Your judgment, on demand
              </div>
              <span className="text-gray-300 text-xs hidden sm:inline">&middot;</span>
              <span className="text-xs text-gray-500">Start with Sidd&apos;s persona, then build one trained on your own voice.</span>
              <Link href="/create" className="text-xs text-sky-700 hover:text-sky-900 font-medium underline underline-offset-2">Create your own →</Link>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mt-4 mb-2 tracking-tight">
              Meet personas that think like real people
            </h1>
            <div className="text-center mb-2 h-7">
              <StreamingTagline />
            </div>
          </div>

          {/* Horizontal personas strip */}
          {publicPersonas.length > 0 && (
            <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-5 pt-4 pb-3 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-500">Public personas</p>
                  <h2 className="text-sm font-semibold text-gray-800 mt-0.5">Borrow a point of view</h2>
                </div>
                <p className="text-xs text-gray-400 hidden sm:block">Free preview: 5 questions · Sign up for unlimited access</p>
              </div>
              <div className="overflow-hidden relative">
                <div className="pointer-events-none absolute left-0 inset-y-0 w-8 bg-gradient-to-r from-indigo-50/60 to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 inset-y-0 w-8 bg-gradient-to-l from-indigo-50/60 to-transparent z-10" />
                <div className="flex animate-marquee-x" style={{ width: 'max-content' }}>
                  {marqueePersonas.map((p, index) => (
                    <Link
                      key={`${p.twin_id}-${index}`}
                      href={p.chat_url}
                      className="group flex-shrink-0 mr-3 flex items-center gap-3 rounded-xl border border-indigo-100 bg-white px-4 py-2.5 hover:border-indigo-300 hover:shadow-sm transition-all"
                      style={{ minWidth: '200px' }}
                    >
                      <PersonaAvatar
                        name={p.name}
                        seed={p.twin_id}
                        imageUrl={p.image_url}
                        className="w-9 h-9 shrink-0"
                        textClassName="text-xs"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 truncate">{p.era}</p>
                        <span className="text-xs text-indigo-500 group-hover:text-indigo-700 font-medium">Chat →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main chat */}
          <section className="space-y-4">
            <div className="bg-white/60 border border-white rounded-3xl p-3 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur-sm">
              <div className="h-[420px]">
                <Twin />
              </div>
            </div>

          </section>

          <footer className="mt-8 text-center text-sm text-gray-500 space-y-2">
            <p>Personas turns expertise into a living conversation.</p>
            <p className="text-xs text-gray-400 pt-4">© 2026 Binosus LLC · All rights reserved</p>
          </footer>
        </div>
      </div>
      </div>{/* end z-10 wrapper */}
    </main>
  );
}
