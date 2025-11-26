import * as React from 'react';
import { cn } from '@/utils/cn';

export interface TreeProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const Tree = React.forwardRef<HTMLDivElement, TreeProps>(
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
Tree.displayName = 'Tree';

export { Tree };
