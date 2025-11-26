import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function AdminLayout({ children, className }: AdminLayoutProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
