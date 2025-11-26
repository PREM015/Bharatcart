import * as React from 'react';
import { cn } from '@/utils/cn';

export interface MenuProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const Menu = React.forwardRef<HTMLDivElement, MenuProps>(
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
Menu.displayName = 'Menu';

export { Menu };
