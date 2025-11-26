'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Errorpage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4"></h1>
        <p className="text-xl mb-8">Something went wrong</p>
        <div className="space-x-4">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 rounded-lg inline-block"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
