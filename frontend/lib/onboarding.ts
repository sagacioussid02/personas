/**
 * Onboarding utilities for persona creation flow
 */

export interface PersonaCreationPayload {
  userId: string;
  name: string;
  bio: string;
  expertise: string[];
  communicationStyle: string;
  values: string[];
}

export interface PersonaCreationResponse {
  success: boolean;
  error?: string;
  data?: {
    personaId: string;
    name: string;
    createdAt: string;
  };
}

/**
 * Submit persona creation to the backend API
 * @param payload - The persona data to submit
 * @returns Promise with success status and response data
 */
export async function submitPersonaCreation(
  payload: PersonaCreationPayload
): Promise<PersonaCreationResponse> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    const response = await fetch(`${apiUrl}/api/personas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.detail || `HTTP ${response.status}: Failed to create persona`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        personaId: data.id || data.persona_id,
        name: data.name,
        createdAt: data.created_at || new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to submit persona: ${message}`,
    };
  }
}

/**
 * Validate persona data before submission
 * @param data - The persona data to validate
 * @returns Object with isValid flag and error messages if any
 */
export function validatePersonaData(data: Partial<PersonaCreationPayload>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Twin name is required');
  }

  if (!data.bio || data.bio.trim().length === 0) {
    errors.push('Bio is required');
  } else if (data.bio.length < 20) {
    errors.push('Bio should be at least 20 characters');
  }

  if (!data.expertise || data.expertise.length === 0) {
    errors.push('At least one area of expertise is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format expertise array for display
 * @param expertise - Array of expertise strings
 * @returns Formatted string for display
 */
export function formatExpertise(expertise: string[]): string {
  if (expertise.length === 0) return '';
  if (expertise.length === 1) return expertise[0];
  if (expertise.length === 2) return expertise.join(' & ');
  return expertise.slice(0, -1).join(', ') + ', & ' + expertise[expertise.length - 1];
}

/**
 * Get confirmation message for persona creation
 * @param name - The persona name
 * @returns Confirmation message string
 */
export function getConfirmationMessage(name: string): string {
  return `Your personality twin "${name}" has been successfully created and is ready to chat!`;
}
