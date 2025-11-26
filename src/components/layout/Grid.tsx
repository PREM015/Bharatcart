import { ReactNode } from 'react';

interface GridProps {
  children: ReactNode;
  className?: string;
}

export default function Grid({ children, className }: GridProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
