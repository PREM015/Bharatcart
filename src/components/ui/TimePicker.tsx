import * as React from 'react';
import { cn } from '@/utils/cn';

export interface TimePickerProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const TimePicker = React.forwardRef<HTMLDivElement, TimePickerProps>(
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
TimePicker.displayName = 'TimePicker';

export { TimePicker };
