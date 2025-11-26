import { ReactNode } from 'react';

interface CheckoutLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function CheckoutLayout({ children, className }: CheckoutLayoutProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
