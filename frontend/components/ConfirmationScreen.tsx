'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import '../styles/confirmation.css';

interface ConfirmationScreenProps {
  twinName: string;
  onProceed?: () => void;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  twinName,
  onProceed,
}) => {
  const router = useRouter();
  const { user } = useUser();

  const handleProceedToChat = () => {
    if (onProceed) {
      onProceed();
    }
    router.push('/chat');
  };

  return (
    <div className="confirmation-container">
      <div className="confirmation-card">
        <div className="confirmation-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="32" cy="32" r="30" stroke="#10b981" strokeWidth="2" />
            <path
              d="M20 32L28 40L44 24"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="confirmation-title">Twin Initialized Successfully</h1>

        <p className="confirmation-message">
          Your personality twin <strong>{twinName}</strong> has been created and is ready to chat.
        </p>

        <div className="confirmation-details">
          <div className="detail-item">
            <span className="detail-label">Twin Name:</span>
            <span className="detail-value">{twinName}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Status:</span>
            <span className="detail-value status-active">Active</span>
          </div>
        </div>

        <div className="confirmation-actions">
          <button
            className="btn btn-primary"
            onClick={handleProceedToChat}
            aria-label="Start chatting with your twin"
          >
            Start Chatting with Your Twin
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => router.push('/dashboard')}
            aria-label="Go to dashboard"
          >
            Go to Dashboard
          </button>
        </div>

        <p className="confirmation-footer">
          You can always refine your twin's personality and context from your dashboard.
        </p>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
