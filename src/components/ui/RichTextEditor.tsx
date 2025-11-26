import * as React from 'react';
import { cn } from '@/utils/cn';

export interface RichTextEditorProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
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
RichTextEditor.displayName = 'RichTextEditor';

export { RichTextEditor };
