import * as React from 'react';
import { cn } from '@/utils/cn';

export interface ToggleGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
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
ToggleGroup.displayName = 'ToggleGroup';

export { ToggleGroup };
