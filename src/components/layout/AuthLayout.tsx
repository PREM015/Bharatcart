import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
