'use client';

import React, { useState } from 'react';

interface VoiceCaptureProps {
  onSubmit: (data: { voiceNotes: string }) => void;
  initialData?: {
    voiceNotes: string;
  };
}

const VoiceCapture: React.FC<VoiceCaptureProps> = ({ onSubmit, initialData }) => {
  const [voiceNotes, setVoiceNotes] = useState(initialData?.voiceNotes || '');
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!voiceNotes.trim()) {
      setError('Please provide voice and judgment notes');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({ voiceNotes });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold mb-6">Voice & Judgment</h2>
      <p className="text-slate-600 mb-6">
        Help us understand your unique voice, perspective, and how you approach problems. This is what makes your twin authentic.
      </p>

      <div className="mb-6">
        <label htmlFor="voiceNotes" className="block text-sm font-medium text-slate-700 mb-2">
          Your Voice & Judgment *
        </label>
        <p className="text-xs text-slate-500 mb-3">
          Consider: How do you communicate? What's your perspective on key issues? How do you approach challenges?
        </p>
        <textarea
          id="voiceNotes"
          value={voiceNotes}
          onChange={(e) => setVoiceNotes(e.target.value)}
          placeholder="Share your unique perspective, communication style, and how you approach decision-making. Include examples of how you've handled key situations."
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error ? 'border-red-500' : 'border-slate-300'
          }`}
          rows={8}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        <p className="text-xs text-slate-500 mt-2">
          {voiceNotes.length} characters (aim for 200+)
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Tips for great voice capture:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Be specific with examples from your experience</li>
          <li>Share your philosophy on key topics in your field</li>
          <li>Describe your communication style and tone</li>
          <li>Mention how you handle disagreement or failure</li>
          <li>Include any unique perspectives or contrarian views</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Next
        </button>
      </div>
    </form>
  );
};

export default VoiceCapture;
