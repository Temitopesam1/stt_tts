import AudioRecorder from '@/components/AudioRecorder';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Audio AI Chat
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Record your message and get an AI response
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <AudioRecorder />
        </div>
      </div>
    </main>
  );
}
