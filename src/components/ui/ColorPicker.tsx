import * as React from 'react';
import { cn } from '@/utils/cn';

export interface ColorPickerProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
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
ColorPicker.displayName = 'ColorPicker';

export { ColorPicker };
