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

      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href="/dodecahedron"
          className="inline-block rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
        >
          View 3D Dodecahedron
        </a>
        
        <a
          href="/emoji-to-ascii"
          className="inline-block rounded-lg bg-gradient-to-r from-green-600 to-teal-600 px-6 py-3 text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
        >
          Emoji to ASCII
        </a>
        
        <a
          href="/test-error"
          className="inline-block rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3 text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
        >
          Test Error Handling
        </a>
        
        <a
          href="/debug-page"
          className="inline-block rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
        >
          Debug Connection
        </a>
      </div>
      
      <div className="mt-12 max-w-lg">
        <h2 className="mb-2 text-xl font-semibold">Testing Error Handling</h2>
        <p className="text-gray-600 dark:text-gray-400">
          The Test Error Handling page lets you trigger different types of errors to test 
          the automatic error reporting system between Next.js and Claude.
        </p>
      </div>
    </main>
    </>
  );
}
