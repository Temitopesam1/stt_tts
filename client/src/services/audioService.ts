const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AudioResponse {
  success: boolean;
  audio: string;
  mimeType: string;
}

export async function processAudio(audioBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(`${API_URL}/audio/process`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to process audio');
    }

    const data: AudioResponse = await response.json();

    if (!data.success || !data.audio) {
      throw new Error('Invalid response from server');
    }

    return data.audio;
  } catch (error) {
    console.error('Error processing audio:', error);
    throw error;
  }
}
