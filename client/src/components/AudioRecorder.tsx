"use client"
import { useState, useRef } from 'react';
import { processAudio } from '@/services/audioService';

interface AudioState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  audioUrl: string | null;
}

export default function AudioRecorder() {
  const [state, setState] = useState<AudioState>({
    isRecording: false,
    isProcessing: false,
    error: null,
    audioUrl: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleAudioProcessing(audioBlob);
      };

      mediaRecorderRef.current.start();
      setState(prev => ({ ...prev, isRecording: true, error: null }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to access microphone. Please ensure permissions are granted.'
      }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setState(prev => ({ ...prev, isRecording: false }));
    }
  };

  const handleAudioProcessing = async (audioBlob: Blob) => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    try {
      const response = await processAudio(audioBlob);
      const audioUrl = `data:audio/mp3;base64,${response}`;
      setState(prev => ({
        ...prev,
        audioUrl,
        isProcessing: false
      }));

      // Auto-play the response
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to process audio. Please try again.',
        isProcessing: false
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={state.isRecording ? stopRecording : startRecording}
          className={`px-6 py-3 rounded-full font-semibold text-white transition-all ${state.isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
            }`}
          disabled={state.isProcessing}
        >
          {state.isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        {state.isProcessing && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
            <span className="text-gray-600">Processing audio...</span>
          </div>
        )}

        {state.error && (
          <div className="text-red-500 text-sm">{state.error}</div>
        )}

        {state.audioUrl && !state.error && (
          <div className="mt-4">
            <audio controls src={state.audioUrl} className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
