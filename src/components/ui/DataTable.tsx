import * as React from 'react';
import { cn } from '@/utils/cn';

export interface DataTableProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const DataTable = React.forwardRef<HTMLDivElement, DataTableProps>(
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
DataTable.displayName = 'DataTable';

export { DataTable };
