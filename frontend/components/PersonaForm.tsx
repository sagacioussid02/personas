'use client';

import React, { useState } from 'react';

interface PersonaFormProps {
  onSubmit: (data: { name: string; bio: string; expertise: string[] }) => void;
  initialData?: {
    name: string;
    bio: string;
    expertise: string[];
  };
}

const PersonaForm: React.FC<PersonaFormProps> = ({ onSubmit, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [expertise, setExpertise] = useState<string[]>(initialData?.expertise || []);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!bio.trim()) {
      newErrors.bio = 'Bio is required';
    }
    if (expertise.length === 0) {
      newErrors.expertise = 'Add at least one area of expertise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddExpertise = () => {
    if (expertiseInput.trim() && !expertise.includes(expertiseInput.trim())) {
      setExpertise([...expertise, expertiseInput.trim()]);
      setExpertiseInput('');
    }
  };

  const handleRemoveExpertise = (item: string) => {
    setExpertise(expertise.filter((e) => e !== item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({ name, bio, expertise });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold mb-6">Basic Information</h2>

      <div className="mb-6">
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
          Full Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.name ? 'border-red-500' : 'border-slate-300'
          }`}
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div className="mb-6">
        <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-2">
          Bio / Background *
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself, your background, and what makes you unique"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.bio ? 'border-red-500' : 'border-slate-300'
          }`}
          rows={5}
        />
        {errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio}</p>}
      </div>

      <div className="mb-6">
        <label htmlFor="expertise" className="block text-sm font-medium text-slate-700 mb-2">
          Areas of Expertise *
        </label>
        <div className="flex gap-2 mb-3">
          <input
            id="expertise"
            type="text"
            value={expertiseInput}
            onChange={(e) => setExpertiseInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddExpertise();
              }
            }}
            placeholder="e.g., Product Management, AI/ML, Startups"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAddExpertise}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
          >
            Add
          </button>
        </div>
        {errors.expertise && <p className="text-red-500 text-sm mb-3">{errors.expertise}</p>}
        <div className="flex flex-wrap gap-2">
          {expertise.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleRemoveExpertise(item)}
                className="text-blue-600 hover:text-blue-800 font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
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

export default PersonaForm;
