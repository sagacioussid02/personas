'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import ConfirmationScreen from '@/components/ConfirmationScreen';
import { submitPersonaCreation } from '@/lib/onboarding';

type OnboardingStep = 'intake' | 'confirmation';

interface PersonaData {
  name: string;
  bio: string;
  expertise: string[];
  communicationStyle: string;
  values: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('intake');
  const [personaData, setPersonaData] = useState<PersonaData>({
    name: '',
    bio: '',
    expertise: [],
    communicationStyle: '',
    values: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoaded) {
    return (
      <div className="onboarding-loading">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  const handleInputChange = (field: keyof PersonaData, value: string | string[]) => {
    setPersonaData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!personaData.name.trim()) {
        throw new Error('Twin name is required');
      }
      if (!personaData.bio.trim()) {
        throw new Error('Bio is required');
      }
      if (personaData.expertise.length === 0) {
        throw new Error('At least one area of expertise is required');
      }

      // Submit persona creation to backend
      const response = await submitPersonaCreation({
        userId: user.id,
        ...personaData,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create persona');
      }

      // Move to confirmation step
      setCurrentStep('confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmationProceed = () => {
    // Any additional tracking or state cleanup can happen here
    console.log('User confirmed persona creation and proceeding to chat');
  };

  if (currentStep === 'confirmation') {
    return (
      <ConfirmationScreen
        twinName={personaData.name}
        onProceed={handleConfirmationProceed}
      />
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <h1 className="onboarding-title">Create Your Personality Twin</h1>
        <p className="onboarding-subtitle">
          Tell us about yourself so we can create an AI version that captures your unique voice and judgment.
        </p>

        <form onSubmit={handleSubmitPersona} className="onboarding-form">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Twin Name *</label>
            <input
              id="name"
              type="text"
              placeholder="e.g., My AI Twin"
              value={personaData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio *</label>
            <textarea
              id="bio"
              placeholder="Tell us about yourself, your background, and what makes you unique..."
              value={personaData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              required
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="expertise">Areas of Expertise *</label>
            <input
              id="expertise"
              type="text"
              placeholder="e.g., Product Strategy, AI, Startups (comma-separated)"
              value={personaData.expertise.join(', ')}
              onChange={(e) =>
                handleInputChange(
                  'expertise',
                  e.target.value.split(',').map((s) => s.trim())
                )
              }
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="communicationStyle">Communication Style</label>
            <select
              id="communicationStyle"
              value={personaData.communicationStyle}
              onChange={(e) => handleInputChange('communicationStyle', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select a style...</option>
              <option value="direct">Direct & Concise</option>
              <option value="conversational">Conversational & Warm</option>
              <option value="analytical">Analytical & Detailed</option>
              <option value="storytelling">Storytelling & Narrative</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="values">Core Values</label>
            <input
              id="values"
              type="text"
              placeholder="e.g., Integrity, Innovation, Impact (comma-separated)"
              value={personaData.values.join(', ')}
              onChange={(e) =>
                handleInputChange(
                  'values',
                  e.target.value.split(',').map((s) => s.trim())
                )
              }
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Your Twin...' : 'Create Twin'}
          </button>
        </form>

        <p className="onboarding-footer">
          You can refine and update your twin's personality anytime after creation.
        </p>
      </div>
    </div>
  );
}
