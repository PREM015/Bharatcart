import { ReactNode } from 'react';

interface AccountLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function AccountLayout({ children, className }: AccountLayoutProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
