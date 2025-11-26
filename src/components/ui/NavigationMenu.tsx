import * as React from 'react';
import { cn } from '@/utils/cn';

export interface NavigationMenuProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const NavigationMenu = React.forwardRef<HTMLDivElement, NavigationMenuProps>(
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
NavigationMenu.displayName = 'NavigationMenu';

export { NavigationMenu };
