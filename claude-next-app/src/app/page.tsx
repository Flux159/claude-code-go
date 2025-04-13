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
      <p className="max-w-lg text-lg text-gray-600 dark:text-gray-400">
        Try asking Claude to modify this page, add new features, or create
        entirely new components!
      </p>
    </main>
  );
}
