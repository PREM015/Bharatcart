import * as React from 'react';
import { cn } from '@/utils/cn';

export interface CommandProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const Command = React.forwardRef<HTMLDivElement, CommandProps>(
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
Command.displayName = 'Command';

export { Command };
