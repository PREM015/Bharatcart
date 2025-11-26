import * as React from 'react';
import { cn } from '@/utils/cn';

export interface SheetProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const Sheet = React.forwardRef<HTMLDivElement, SheetProps>(
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
Sheet.displayName = 'Sheet';

export { Sheet };
