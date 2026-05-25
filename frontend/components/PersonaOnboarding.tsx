'use client';

import React, { useState } from 'react';
import PersonaForm from './PersonaForm';
import VoiceCapture from './VoiceCapture';
import { submitPersona } from '@/lib/api/personaAPI';

type Step = 'basic' | 'voice' | 'values' | 'review';

interface PersonaData {
  name: string;
  bio: string;
  expertise: string[];
  voiceNotes: string;
  coreValues: string[];
  decisionStyle: string;
}

const PersonaOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [personaData, setPersonaData] = useState<PersonaData>({
    name: '',
    bio: '',
    expertise: [],
    voiceNotes: '',
    coreValues: [],
    decisionStyle: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const steps: Step[] = ['basic', 'voice', 'values', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);

  const handleBasicInfoSubmit = (data: { name: string; bio: string; expertise: string[] }) => {
    setPersonaData((prev) => ({ ...prev, ...data });
    setCurrentStep('voice');
  };

  const handleVoiceCaptureSubmit = (data: { voiceNotes: string }) => {
    setPersonaData((prev) => ({ ...prev, ...data });
    setCurrentStep('values');
  };

  const handleValuesSubmit = (data: { coreValues: string[]; decisionStyle: string }) => {
    setPersonaData((prev) => ({ ...prev, ...data });
    setCurrentStep('review');
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await submitPersona(personaData);
      setSuccess(true);
      // Redirect after success
      setTimeout(() => {
        window.location.href = '/personas';
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create persona');
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  index <= currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    index < currentStepIndex ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Basic Info</span>
          <span>Voice & Judgment</span>
          <span>Values</span>
          <span>Review</span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          Persona created successfully! Redirecting...
        </div>
      )}

      {/* Step content */}
      <div className="mb-8">
        {currentStep === 'basic' && (
          <PersonaForm onSubmit={handleBasicInfoSubmit} initialData={personaData} />
        )}
        {currentStep === 'voice' && (
          <VoiceCapture onSubmit={handleVoiceCaptureSubmit} initialData={personaData} />
        )}
        {currentStep === 'values' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Core Values & Decision Style</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const coreValues = formData.getAll('coreValues') as string[];
                const decisionStyle = formData.get('decisionStyle') as string;
                handleValuesSubmit({ coreValues, decisionStyle });
              }}
            >
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Core Values (select at least 3)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Innovation',
                    'Integrity',
                    'Collaboration',
                    'Excellence',
                    'Transparency',
                    'Resilience',
                    'Empathy',
                    'Growth',
                  ].map((value) => (
                    <label key={value} className="flex items-center">
                      <input
                        type="checkbox"
                        name="coreValues"
                        value={value}
                        defaultChecked={personaData.coreValues.includes(value)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="ml-2 text-slate-700">{value}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Decision-Making Style
                </label>
                <textarea
                  name="decisionStyle"
                  defaultValue={personaData.decisionStyle}
                  placeholder="Describe how you typically make decisions. Do you rely on data, intuition, consultation, or a mix?"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        )}
        {currentStep === 'review' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Review Your Persona</h2>
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-semibold text-slate-700">Name</h3>
                <p className="text-slate-600">{personaData.name}</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Bio</h3>
                <p className="text-slate-600">{personaData.bio}</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Expertise</h3>
                <p className="text-slate-600">{personaData.expertise.join(', ')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Voice & Judgment</h3>
                <p className="text-slate-600">{personaData.voiceNotes}</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Core Values</h3>
                <p className="text-slate-600">{personaData.coreValues.join(', ')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Decision Style</h3>
                <p className="text-slate-600">{personaData.decisionStyle}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={goToPreviousStep}
                className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Persona'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonaOnboarding;
