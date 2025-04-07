import { Injectable } from '@nestjs/common';
import * as speech from '@google-cloud/speech';
import * as textToSpeech from '@google-cloud/text-to-speech';
import { HfInference } from '@huggingface/inference';

@Injectable()
export class AudioService {
  private speechClient: speech.SpeechClient;
  private ttsClient: textToSpeech.TextToSpeechClient;
  private hf: HfInference;

  constructor() {
    // Initialize Google Cloud clients
    this.speechClient = new speech.SpeechClient();
    this.ttsClient = new textToSpeech.TextToSpeechClient();
    this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      // Convert audio buffer to base64
      const audioContent = audioBuffer.toString('base64');

      // Configure the request
      const request: speech.protos.google.cloud.speech.v1.IRecognizeRequest = {
        audio: {
          content: audioContent,
        },
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
        },
      };

      // Detects speech in the audio file
      const [response] = await this.speechClient.recognize(request);
      const transcription = response?.results
        ?.map((result) => {
          if (result?.alternatives) return result?.alternatives[0]?.transcript;
        })
        ?.join('\n');

      return transcription || 'No speech detected';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  async processText(text: string): Promise<string> {
    try {
      // Use a conversation model from Hugging Face
      const response = await this.hf.textGeneration({
        model: 'facebook/blenderbot-400M-distill',
        inputs: text,
        parameters: {
          max_length: 100,
          temperature: 0.7,
          top_p: 0.9,
          do_sample: true,
        },
      });

      // Extract and clean the response
      let aiResponse = response.generated_text;

      // Remove the input text if it's included in the response
      if (aiResponse.startsWith(text)) {
        aiResponse = aiResponse.slice(text.length).trim();
      }

      return aiResponse || "I'm not sure how to respond to that.";
    } catch (error) {
      console.error('Error processing text with AI:', error);
      return `I encountered an error while processing: ${text}`;
    }
  }

  async synthesizeSpeech(text: string): Promise<Buffer> {
    try {
      // Configure the request
      const request = {
        input: { text },
        voice: {
          languageCode: 'en-US',
          ssmlGender: 'NEUTRAL' as const,
        },
        audioConfig: { audioEncoding: 'MP3' as const },
      };

      // Performs the text-to-speech request
      const [response] = await this.ttsClient.synthesizeSpeech(request);
      return Buffer.from(response.audioContent as Uint8Array);
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      throw new Error('Failed to synthesize speech');
    }
  }

  async processAudio(audioBuffer: Buffer): Promise<Buffer> {
    // 1. Transcribe audio to text
    const transcription = await this.transcribeAudio(audioBuffer);

    // 2. Process the transcribed text
    const processedText = await this.processText(transcription);

    // 3. Synthesize text back to speech
    const audioResponse = await this.synthesizeSpeech(processedText);

    return audioResponse;
  }
}
