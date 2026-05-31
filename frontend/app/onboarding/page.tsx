'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingStep {
  step: number;
  title: string;
  description: string;
}

interface PersonaData {
  name: string;
  title: string;
  bio: string;
  voice_examples: string[];
  core_values: string[];
  decision_examples: string[];
  context_urls: string[];
}

const STEPS: OnboardingStep[] = [
  { step: 1, title: 'Basic Info', description: 'Tell us about yourself' },
  { step: 2, title: 'Voice & Style', description: 'How do you communicate?' },
  { step: 3, title: 'Values & Decisions', description: 'What drives your choices?' },
  { step: 4, title: 'Context', description: 'Add supporting materials' },
  { step: 5, title: 'Review', description: 'Confirm your twin' },
];

export default function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PersonaData>({
    name: '',
    title: '',
    bio: '',
    voice_examples: ['', '', ''],
    core_values: ['', '', ''],
    decision_examples: ['', ''],
    context_urls: [''],
  });

  const handleInputChange = (field: keyof PersonaData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleArrayChange = (field: keyof PersonaData, index: number, value: string) => {
    const arr = Array.isArray(formData[field]) ? [...(formData[field] as string[])] : [];
    arr[index] = value;
    handleInputChange(field, arr);
  };

  const validateStep = (): boolean => {
    setError(null);
    switch (currentStep) {
      case 1:
        if (!formData.name.trim()) {
          setError('Name is required');
          return false;
        }
        if (!formData.title.trim()) {
          setError('Title is required');
          return false;
        }
        if (!formData.bio.trim()) {
          setError('Bio is required');
          return false;
        }
        return true;
      case 2:
        const filledVoiceExamples = (formData.voice_examples as string[]).filter(v => v.trim()).length;
        if (filledVoiceExamples < 2) {
          setError('Please provide at least 2 voice examples');
          return false;
        }
        return true;
      case 3:
        const filledValues = (formData.core_values as string[]).filter(v => v.trim()).length;
        const filledDecisions = (formData.decision_examples as string[]).filter(v => v.trim()).length;
        if (filledValues < 2) {
          setError('Please provide at least 2 core values');
          return false;
        }
        if (filledDecisions < 1) {
          setError('Please provide at least 1 decision example');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        title: formData.title,
        bio: formData.bio,
        voice_examples: (formData.voice_examples as string[]).filter(v => v.trim()),
        core_values: (formData.core_values as string[]).filter(v => v.trim()),
        decision_examples: (formData.decision_examples as string[]).filter(v => v.trim()),
        context_urls: (formData.context_urls as string[]).filter(v => v.trim()),
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/personas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create persona (${response.status})`);
      }

      const result = await response.json();
      router.push(`/personas/${result.persona_id}?initialized=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {STEPS.map(s => (
              <div
                key={s.step}
                className={`flex flex-col items-center ${
                  s.step <= currentStep ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 ${
                    s.step < currentStep
                      ? 'bg-green-500 text-white'
                      : s.step === currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {s.step < currentStep ? '✓' : s.step}
                </div>
                <span className="text-xs font-medium text-center">{s.title}</span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Form content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">{STEPS[currentStep - 1].title}</h1>
          <p className="text-gray-600 mb-6">{STEPS[currentStep - 1].description}</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Sarah Chen"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title / Role *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Founder & CEO"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio *
                </label>
                <textarea
                  value={formData.bio}
                  onChange={e => handleInputChange('bio', e.target.value)}
                  placeholder="A brief overview of your background and expertise..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 2: Voice & Style */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Provide 3-5 example statements that reflect how you communicate and think:
              </p>
              {(formData.voice_examples as string[]).map((example, idx) => (
                <div key={idx}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Example {idx + 1}
                  </label>
                  <textarea
                    value={example}
                    onChange={e => handleArrayChange('voice_examples', idx, e.target.value)}
                    placeholder="e.g., 'I believe in shipping fast and iterating based on user feedback'"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Values & Decisions */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Core Values *</p>
                <p className="text-xs text-gray-500 mb-3">
                  What principles guide your decisions?
                </p>
                {(formData.core_values as string[]).map((value, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={value}
                    onChange={e => handleArrayChange('core_values', idx, e.target.value)}
                    placeholder={`Value ${idx + 1}`}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                  />
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Decision Examples *</p>
                <p className="text-xs text-gray-500 mb-3">
                  Describe a tough decision and how you approached it:
                </p>
                {(formData.decision_examples as string[]).map((example, idx) => (
                  <textarea
                    key={idx}
                    value={example}
                    onChange={e => handleArrayChange('decision_examples', idx, e.target.value)}
                    placeholder={`Decision example ${idx + 1}`}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Context */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Add links to articles, interviews, or resources that represent your thinking:
              </p>
              {(formData.context_urls as string[]).map((url, idx) => (
                <div key={idx}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link {idx + 1}
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={e => handleArrayChange('context_urls', idx, e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  handleInputChange('context_urls', [
                    ...(formData.context_urls as string[]),
                    '',
                  ])
                }
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add another link
              </button>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Review Your Twin</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Name:</span> {formData.name}
                  </p>
                  <p>
                    <span className="font-medium">Title:</span> {formData.title}
                  </p>
                  <p>
                    <span className="font-medium">Voice examples:</span>{' '}
                    {(formData.voice_examples as string[]).filter(v => v.trim()).length}
                  </p>
                  <p>
                    <span className="font-medium">Core values:</span>{' '}
                    {(formData.core_values as string[]).filter(v => v.trim()).length}
                  </p>
                  <p>
                    <span className="font-medium">Decision examples:</span>{' '}
                    {(formData.decision_examples as string[]).filter(v => v.trim()).length}
                  </p>
                  <p>
                    <span className="font-medium">Context links:</span>{' '}
                    {(formData.context_urls as string[]).filter(v => v.trim()).length}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Click "Create Twin" below to initialize your persona. Your twin will be ready to
                chat in moments.
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Twin...' : 'Create Twin'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}