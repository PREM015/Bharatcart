import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'page',
  description: 'Browse our page',
};

export default function pagePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">page</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Product grid */}
      </div>
    </div>
  );
}
