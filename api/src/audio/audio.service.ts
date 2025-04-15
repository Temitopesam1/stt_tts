import { Injectable } from '@nestjs/common';
import * as speech from '@google-cloud/speech';
import * as textToSpeech from '@google-cloud/text-to-speech';
import { HfInference } from '@huggingface/inference';
import * as path from 'path';
import { OpenAI } from 'openai';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

@Injectable()
export class AudioService {
  private speechClient: speech.SpeechClient;
  private ttsClient: textToSpeech.TextToSpeechClient;
  private hf: HfInference;
  private openai: OpenAI;
  private speechConfig: sdk.SpeechConfig;

  constructor() {
    const keyFilePath = path.resolve(
      process.env.GOOGLE_APPLICATION_CREDENTIALS!,
    );
    // Initialize Google Cloud clients
    this.speechClient = new speech.SpeechClient();
    this.ttsClient = new textToSpeech.TextToSpeechClient();

    this.speechClient = new speech.SpeechClient({
      keyFilename: keyFilePath,
    });
    this.ttsClient = new textToSpeech.TextToSpeechClient({
      keyFilename: keyFilePath,
    });
    this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.SPEECH_KEY as string,
      process.env.SPEECH_REGION as string
    );

  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      const audioContent = audioBuffer.toString('base64');
      let transcription = "Very briefly, "

      const request: speech.protos.google.cloud.speech.v1.IRecognizeRequest = {
        audio: {
          content: audioContent,
        },
        config: {
          // WebM typically uses OggOpus encoding
          encoding: 'WEBM_OPUS',
          // Default sample rate for WebM
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          // Add these for better results
          model: 'default',
          useEnhanced: true,
        },
      };

      const [response] = await this.speechClient.recognize(request);

      if (!response.results || response.results.length === 0) {
        return 'No speech detected';
      }

      transcription += response.results
        .map((result) => result.alternatives?.[0]?.transcript || '')
        .filter((text) => text.length > 0)
        .join('\n');

      return transcription || 'No speech detected';
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  // async processText(text: string): Promise<string> {
  //   try {
  //     // Use a conversation model from Hugging Face
  //     const response = await this.hf.textGeneration({
  //       model: 'facebook/blenderbot-400M-distill',
  //       inputs: text,
  //       parameters: {
  //         max_length: 100,
  //         temperature: 0.7,
  //         top_p: 0.9,
  //         do_sample: true,
  //       },
  //     });

  //     // Extract and clean the response
  //     let aiResponse = response.generated_text;

  //     // Remove the input text if it's included in the response
  //     if (aiResponse.startsWith(text)) {
  //       aiResponse = aiResponse.slice(text.length).trim();
  //     }

  //     return aiResponse || "I'm not sure how to respond to that.";
  //   } catch (error) {
  //     console.error('Error processing text with AI:', error);
  //     return `I encountered an error while processing: ${text}`;
  //   }
  // }



  async processText(text: string): Promise<string> {
  try {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o', // or 'gpt-3.5-turbo'
      messages: [{ role: 'user', content: text }],
      temperature: 0.7,
      max_tokens: 100,
      top_p: 0.9,
    });

    const aiResponse = completion.choices[0].message.content?.trim();
    return aiResponse || "I'm not sure how to respond to that.";
  } catch (error) {
    console.error('Error processing text with OpenAI:', error);
    return `I encountered an error while processing: ${text}`;
  }
  }

  // async synthesizeSpeech(text: string): Promise<Buffer> {
  //   try {
  //     // Configure the request
  //     const request = {
  //       input: { text },
  //       voice: {
  //         languageCode: 'en-US',
  //         ssmlGender: 'NEUTRAL' as const,
  //       },
  //       audioConfig: { audioEncoding: 'MP3' as const },
  //     };

  //     // Performs the text-to-speech request
  //     const [response] = await this.ttsClient.synthesizeSpeech(request);
  //     return Buffer.from(response.audioContent as Uint8Array);
  //   } catch (error) {
  //     console.error('Error synthesizing speech:', error);
  //     throw new Error('Failed to synthesize speech');
  //   }
  // }


  async synthesizeSpeech(text: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {

      // Example: Nigerian English voice
      this.speechConfig.speechSynthesisVoiceName = 'en-NG-EzinneNeural';
      this.speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);

      synthesizer.speakTextAsync(
        text,
        result => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(Buffer.from(result.audioData));
          } else {
            reject(new Error(`Speech synthesis failed. Reason: ${sdk.ResultReason[result.reason]}`));
          }
          synthesizer.close();
        },
        error => {
          synthesizer.close();
          reject(error);
        }
      );
    });
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
