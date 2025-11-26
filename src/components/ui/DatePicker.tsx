import * as React from 'react';
import { cn } from '@/utils/cn';

export interface DatePickerProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
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
DatePicker.displayName = 'DatePicker';

export { DatePicker };
