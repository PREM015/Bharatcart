import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'page | Admin Dashboard',
  description: 'Admin page management',
};

export default function AdminpagePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">page</h1>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Admin page content</p>
      </div>
    </div>
  );
}
