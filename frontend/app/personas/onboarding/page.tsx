'use client';

import React from 'react';
import PersonaOnboarding from '@/components/PersonaOnboarding';

export default function PersonaOnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">Create Your Personality Twin</h1>
          <p className="text-slate-300 mb-8">Capture your voice, judgment, and values to build a digital version of yourself.</p>
          <PersonaOnboarding />
        </div>
      </div>
    </div>
  );
}
