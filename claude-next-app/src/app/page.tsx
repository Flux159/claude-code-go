'use client';

import { ErrorCatcher } from './components/ErrorCatcher';

export default function Home() {
  // Add ErrorCatcher to ensure error monitoring is active
  return (
    <>
      <ErrorCatcher pageName="HomePage" />
      <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="mb-4 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 bg-clip-text text-4xl font-bold text-transparent">
        Claude Go
      </h1>
      <p className="mb-4 max-w-md text-xl">
        This is a sample Next.js application that you can edit live using
        Claude.
      </p>
      <p className="mb-6 max-w-lg text-lg text-gray-600 dark:text-gray-400">
        Try asking Claude to modify this page, add new features, or create
        entirely new components!
      </p>

      <div className="mt-8">
        <button 
          onClick={() => alert('Hello World')}
          className="rounded-lg bg-yellow-500 px-6 py-3 text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
        >
          Hello World Button
        </button>
      </div>
    </main>
    </>
  );
}
