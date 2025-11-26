import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'page | My Account',
};

export default function pagePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">page</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>User page content</p>
      </div>
    </div>
  );
}
