import * as React from 'react';
import { cn } from '@/utils/cn';

export interface SeparatorProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('', className)}
        {...props}
      />
    );
  }
);
Separator.displayName = 'Separator';

export { Separator };
