import * as React from 'react';
import { cn } from '@/utils/cn';

export interface AspectRatioProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
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
AspectRatio.displayName = 'AspectRatio';

export { AspectRatio };
