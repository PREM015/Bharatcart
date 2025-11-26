import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'page',
};

export default function pagePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-center text-3xl font-bold">page</h2>
        {/* Auth form */}
      </div>
    </div>
  );
}
