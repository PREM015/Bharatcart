import * as React from 'react';
import { cn } from '@/utils/cn';

export interface CollapsibleProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
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
Collapsible.displayName = 'Collapsible';

export { Collapsible };
