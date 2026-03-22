'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, Upload, Loader2 } from 'lucide-react';

interface FormData {
  name: string;
  title: string;
  bio: string;
  skills: string;
  experience: string;
  achievements: string;
  communicationStyle: string;
  email: string;
}

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Skills & Experience' },
  { id: 3, label: 'Personality' },
  { id: 4, label: 'Done' },
];

const empty: FormData = {
  name: '',
  title: '',
  bio: '',
  skills: '',
  experience: '',
  achievements: '',
  communicationStyle: '',
  email: '',
};

export default function CreatePage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(empty);
  const [submitted, setSubmitted] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLinkedInUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setParseError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/parse-linkedin`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to parse PDF');
      }
      const data = await res.json();
      setForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        title: data.title || prev.title,
        bio: data.bio || prev.bio,
        skills: data.skills || prev.skills,
        experience: data.experience || prev.experience,
        achievements: data.achievements || prev.achievements,
        communicationStyle: data.communicationStyle || prev.communicationStyle,
      }));
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse PDF');
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const canAdvance = () => {
    if (step === 1) return form.name.trim() && form.title.trim() && form.bio.trim();
    if (step === 2) return form.skills.trim() && form.experience.trim();
    if (step === 3) return form.communicationStyle.trim();
    return true;
  };

  const handleSubmit = () => {
    // TODO: send to backend
    console.log('Submitting twin data:', form);
    setSubmitted(true);
    setStep(4);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <a href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Sidd&apos;s Twin
            </a>
            <h1 className="text-3xl font-bold text-gray-800">Create Your AI Twin</h1>
            <p className="text-gray-500 mt-1">Fill in your details and we&apos;ll build a personalized AI twin for you.</p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step > s.id ? 'bg-purple-600 text-white' :
                  step === s.id ? 'bg-purple-100 text-purple-700 border-2 border-purple-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-sm ${step === s.id ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{s.label}</span>
                {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200 mx-1" />}
              </div>
            ))}
          </div>

          {/* Form card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Tell us about yourself</h2>

                {/* LinkedIn PDF upload */}
                <div className="border-2 border-dashed border-purple-200 rounded-lg p-4 bg-purple-50">
                  <p className="text-sm font-medium text-purple-700 mb-2">Have a LinkedIn PDF? Auto-fill from it</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Export your profile from LinkedIn → Me → View Profile → More → Save to PDF
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleLinkedInUpload}
                    className="hidden"
                    id="linkedin-upload"
                  />
                  <label
                    htmlFor="linkedin-upload"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors w-fit ${
                      parsing
                        ? 'bg-purple-200 text-purple-500 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {parsing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Upload LinkedIn PDF</>
                    )}
                  </label>
                  {parseError && <p className="text-xs text-red-500 mt-2">{parseError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set('name')}
                    placeholder="e.g. Jane Smith"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professional Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={set('title')}
                    placeholder="e.g. Senior Software Engineer at Acme"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Bio *</label>
                  <textarea
                    value={form.bio}
                    onChange={set('bio')}
                    rows={4}
                    placeholder="A few sentences about who you are, what you do, and what drives you..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (to receive your twin link)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Skills &amp; Experience</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Skills *</label>
                  <textarea
                    value={form.skills}
                    onChange={set('skills')}
                    rows={3}
                    placeholder="e.g. Python, Machine Learning, System Design, Product Strategy..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Experience *</label>
                  <textarea
                    value={form.experience}
                    onChange={set('experience')}
                    rows={5}
                    placeholder="List your roles and what you did. e.g.&#10;- Acme Corp (2021–now): Led backend team, scaled API to 10M req/day&#10;- Startup X (2018–2021): Built ML pipeline from scratch..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notable Achievements</label>
                  <textarea
                    value={form.achievements}
                    onChange={set('achievements')}
                    rows={3}
                    placeholder="e.g. Published paper at NeurIPS, grew team from 3 to 20, raised $5M seed..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 resize-none"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Personality &amp; Style</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Communication Style *</label>
                  <textarea
                    value={form.communicationStyle}
                    onChange={set('communicationStyle')}
                    rows={5}
                    placeholder="How do you talk? e.g. Direct and concise, love analogies, use humor, avoid jargon, always ask follow-up questions, prefer big-picture thinking before details..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">This shapes how your twin talks — be as specific as you like.</p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">You&apos;re on the list!</h2>
                <p className="text-gray-500 max-w-sm mx-auto">
                  We&apos;ve received your details. We&apos;ll build your AI twin and {form.email ? `send the link to ${form.email}` : 'have it ready for you'} soon.
                </p>
              </div>
            )}

            {/* Navigation */}
            {step < 4 && (
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(s => s - 1)}
                  disabled={step === 1}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-0 transition-opacity"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                {step < 3 ? (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    disabled={!canAdvance()}
                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!canAdvance()}
                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Submit <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
