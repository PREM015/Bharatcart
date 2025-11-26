import { ReactNode } from 'react';

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white">
        {/* Admin sidebar */}
      </aside>
      <div className="flex-1">
        <header className="bg-white shadow">
          {/* Admin header */}
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
