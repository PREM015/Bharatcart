import * as React from 'react';
import { cn } from '@/utils/cn';

export interface CalendarProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
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
Calendar.displayName = 'Calendar';

export { Calendar };
