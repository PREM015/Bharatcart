# Theme Customization Guide

**Purpose**: Customize UI themes and branding  
**Level**: Beginner to Intermediate

## Overview

BharatCart uses Tailwind CSS with a custom design system for theming.

## Quick Start

### 1. Edit Theme Colors

```typescript
// tailwind.config.ts

export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        secondary: {
          500: '#3b82f6',
          600: '#2563eb',
        },
      },
    },
  },
};
```

### 2. Update Global Styles

```css
/* src/app/globals.css */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
  }
}
```

### 3. Create Custom Theme

```typescript
// src/config/themes.ts

export const themes = {
  default: {
    name: 'Default',
    colors: {
      primary: '#ef4444',
      secondary: '#3b82f6',
      accent: '#10b981',
    },
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#dc2626',
      secondary: '#2563eb',
      accent: '#059669',
    },
  },
  ocean: {
    name: 'Ocean',
    colors: {
      primary: '#0ea5e9',
      secondary: '#06b6d4',
      accent: '#14b8a6',
    },
  },
};
```

## Typography

### Custom Fonts

```typescript
// src/app/layout.tsx

import { Inter, Poppins } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const poppins = Poppins({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

### Font Sizes

```typescript
// tailwind.config.ts

export default {
  theme: {
    fontSize: {
      'xs': ['0.75rem', { lineHeight: '1rem' }],
      'sm': ['0.875rem', { lineHeight: '1.25rem' }],
      'base': ['1rem', { lineHeight: '1.5rem' }],
      'lg': ['1.125rem', { lineHeight: '1.75rem' }],
      'xl': ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    },
  },
};
```

## Component Styling

### Button Variants

```typescript
// src/components/ui/button.tsx

import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

## Layout Customization

### Header

```typescript
// src/components/layout/header.tsx

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center">
        <Logo />
        <Navigation />
        <div className="ml-auto flex items-center space-x-4">
          <SearchBar />
          <CartButton />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
```

### Footer

```typescript
// src/components/layout/footer.tsx

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <FooterColumn title="Shop" links={shopLinks} />
          <FooterColumn title="Support" links={supportLinks} />
          <FooterColumn title="Company" links={companyLinks} />
          <FooterColumn title="Legal" links={legalLinks} />
        </div>
      </div>
    </footer>
  );
}
```

## Dark Mode

### Implementation

```typescript
// src/components/theme-provider.tsx

'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

### Toggle Button

```typescript
// src/components/theme-toggle.tsx

'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-md p-2 hover:bg-accent"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}
```

## Responsive Design

### Breakpoints

```typescript
// tailwind.config.ts

export default {
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
};
```

### Mobile-First Approach

```typescript
<div className="
  grid 
  grid-cols-1 
  gap-4 
  sm:grid-cols-2 
  md:grid-cols-3 
  lg:grid-cols-4
">
  {/* Content */}
</div>
```

## Animation

### Transitions

```typescript
// tailwind.config.ts

export default {
  theme: {
    extend: {
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
    },
  },
};
```

### Keyframes

```typescript
// tailwind.config.ts

export default {
  theme: {
    extend: {
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
};
```

## Best Practices

1. **Consistency**: Use design tokens for colors, spacing
2. **Accessibility**: Maintain color contrast ratios
3. **Performance**: Minimize custom CSS, use Tailwind utilities
4. **Mobile-First**: Design for mobile, then scale up
5. **Testing**: Test themes across different devices
