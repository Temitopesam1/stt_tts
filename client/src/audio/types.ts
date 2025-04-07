
export interface AudioResponse {
  success: boolean;
  audio: string;
  mimeType: string;
}

export interface AudioState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  audioUrl: string | null;
}
