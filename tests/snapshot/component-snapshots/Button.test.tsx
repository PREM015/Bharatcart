/**
 * Button Component Snapshot Test
 * Purpose: Ensures Button component doesn't change unexpectedly
 */

import React from 'react';
import { render } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button Component Snapshots', () => {
  it('renders primary button', () => {
    const { container } = render(<Button variant="primary">Click Me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders secondary button', () => {
    const { container } = render(<Button variant="secondary">Click Me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders disabled button', () => {
    const { container } = render(<Button disabled>Click Me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders loading button', () => {
    const { container } = render(<Button loading>Click Me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders button with icon', () => {
    const { container } = render(
      <Button icon={<span>🔍</span>}>Search</Button>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
