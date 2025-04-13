import Link from 'next/link';

export default function Home() {
  return (
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
      
      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/neon-gallery"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
        >
          <h2 className="mb-3 text-2xl font-semibold flex items-center gap-2">
            Neon Gallery{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none text-purple-500">
              →
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-70">
            Explore a collection of neon-styled ASCII art and emojis.
          </p>
        </Link>
      </div>
    </main>
  );
}
