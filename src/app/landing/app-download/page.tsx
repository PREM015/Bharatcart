import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'page',
  description: 'Learn more about page',
};

export default function pageLanding() {
  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">page</h1>
          <p className="text-xl">Landing page content</p>
        </div>
      </section>
    </div>
  );
}
