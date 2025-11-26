import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'page | Seller Center',
};

export default function SellerpagePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">page</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Seller page content</p>
      </div>
    </div>
  );
}
