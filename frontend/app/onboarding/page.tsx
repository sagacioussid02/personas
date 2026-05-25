'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface OnboardingStep {
  step: number;
  title: string;
  fields: string[];
}

interface PersonaData {
  name: string;
  bio: string;
  expertise: string;
  voice_url?: string;
  core_values: string[];
  decision_style: string;
}

export default function OnboardingPage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  
  const [personaData, setPersonaData] = useState<PersonaData>({
    name: '',
    bio: '',
    expertise: '',
    core_values: [],
    decision_style: ''
  });

  const steps: OnboardingStep[] = [
    { step: 1, title: 'Basic Info', fields: ['name', 'bio', 'expertise'] },
    { step: 2, title: 'Voice Capture', fields: ['voice_sample'] },
    { step: 3, title: 'Values & Judgment', fields: ['core_values', 'decision_style'] },
    { step: 4, title: 'Review & Confirm', fields: ['confirm'] }
  ];

  const startOnboarding = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      
      if (!response.ok) throw new Error('Failed to start onboarding');
      
      const data = await response.json();
      setSessionId(data.session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setPersonaData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVoiceUpload = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file');
      return;
    }
    
    setVoiceFile(file);
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/onboarding/voice-upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Voice upload failed');
      
      const data = await response.json();
      setVoiceUrl(data.voice_url);
      setPersonaData(prev => ({
        ...prev,
        voice_url: data.voice_url
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice upload failed');
    } finally {
      setLoading(false);
    }
  };

  const submitStep = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/onboarding/step/${currentStep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: currentStep,
          data: personaData
        })
      });
      
      if (!response.ok) throw new Error('Step submission failed');
      
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        await createPersona();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createPersona = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/onboarding/create-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personaData)
      });
      
      if (!response.ok) throw new Error('Persona creation failed');
      
      const data = await response.json();
      router.push(`/chat?persona_id=${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Persona creation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please sign in to create a persona</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={startOnboarding}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Starting...' : 'Start Creating Your Persona'}
        </button>
      </div>
    );
  }

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {steps.map((s) => (
              <div
                key={s.step}
                className={`flex-1 h-2 mx-1 rounded ${
                  s.step <= currentStep ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {currentStepData.title}
          </h1>
          <p className="text-slate-400">
            Step {currentStep} of {steps.length}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 text-red-100 rounded-lg">
            {error}
          </div>
        )}

        {/* Step content */}
        <div className="bg-slate-800 rounded-lg p-8 mb-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white mb-2">Name</label>
                <input
                  type="text"
                  value={personaData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-white mb-2">Bio</label>
                <textarea
                  value={personaData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Tell us about yourself"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-white mb-2">Expertise</label>
                <input
                  type="text"
                  value={personaData.expertise}
                  onChange={(e) => handleInputChange('expertise', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Your areas of expertise"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white mb-4">Upload Voice Sample</label>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => e.target.files && handleVoiceUpload(e.target.files[0])}
                    className="hidden"
                    id="voice-input"
                  />
                  <label htmlFor="voice-input" className="cursor-pointer">
                    <p className="text-slate-400 mb-2">
                      {voiceFile ? voiceFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-slate-500 text-sm">MP3, WAV, or M4A (max 10MB)</p>
                  </label>
                </div>
                {voiceUrl && (
                  <p className="text-green-400 mt-4">✓ Voice uploaded successfully</p>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-white mb-2">Core Values</label>
                <input
                  type="text"
                  value={personaData.core_values.join(', ')}
                  onChange={(e) => handleInputChange('core_values', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g., Innovation, Integrity, Impact (comma-separated)"
                />
              </div>
              <div>
                <label className="block text-white mb-2">Decision-Making Style</label>
                <textarea
                  value={personaData.decision_style}
                  onChange={(e) => handleInputChange('decision_style', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="How do you typically make decisions?"
                  rows={4}
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-slate-700 rounded-lg p-6">
                <h3 className="text-white font-bold mb-4">Review Your Persona</h3>
                <div className="space-y-3 text-slate-300">
                  <p><strong>Name:</strong> {personaData.name}</p>
                  <p><strong>Bio:</strong> {personaData.bio}</p>
                  <p><strong>Expertise:</strong> {personaData.expertise}</p>
                  {voiceUrl && <p><strong>Voice:</strong> ✓ Uploaded</p>}
                  <p><strong>Values:</strong> {personaData.core_values.join(', ')}</p>
                  <p><strong>Decision Style:</strong> {personaData.decision_style}</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                Click "Create Persona" to complete onboarding and start chatting with your twin.
              </p>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1 || loading}
            className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={submitStep}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : currentStep === 4 ? 'Create Persona' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
