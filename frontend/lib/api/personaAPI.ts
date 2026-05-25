/**
 * Persona API client for communicating with the FastAPI backend.
 * Handles persona creation, retrieval, and updates.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PersonaData {
  name: string;
  bio: string;
  expertise: string[];
  voiceNotes: string;
  coreValues: string[];
  decisionStyle: string;
}

export interface PersonaResponse {
  id: string;
  name: string;
  bio: string;
  expertise: string[];
  voiceNotes: string;
  coreValues: string[];
  decisionStyle: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Submit a new persona to the backend.
 * @param data - The persona data to submit
 * @returns The created persona with ID and timestamps
 * @throws Error if the request fails
 */
export async function submitPersona(data: PersonaData): Promise<PersonaResponse> {
  const response = await fetch(`${API_URL}/personas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to create persona: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Retrieve a persona by ID.
 * @param personaId - The ID of the persona to retrieve
 * @returns The persona data
 * @throws Error if the request fails or persona is not found
 */
export async function getPersona(personaId: string): Promise<PersonaResponse> {
  const response = await fetch(`${API_URL}/personas/${personaId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to retrieve persona: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Retrieve all personas for the current user.
 * @returns Array of persona data
 * @throws Error if the request fails
 */
export async function listPersonas(): Promise<PersonaResponse[]> {
  const response = await fetch(`${API_URL}/personas`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to retrieve personas: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update an existing persona.
 * @param personaId - The ID of the persona to update
 * @param data - The updated persona data
 * @returns The updated persona
 * @throws Error if the request fails
 */
export async function updatePersona(
  personaId: string,
  data: Partial<PersonaData>
): Promise<PersonaResponse> {
  const response = await fetch(`${API_URL}/personas/${personaId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to update persona: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Delete a persona by ID.
 * @param personaId - The ID of the persona to delete
 * @throws Error if the request fails
 */
export async function deletePersona(personaId: string): Promise<void> {
  const response = await fetch(`${API_URL}/personas/${personaId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete persona: ${response.statusText}`);
  }
}
