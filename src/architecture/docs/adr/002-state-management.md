# ADR 002: State Management Strategy

**Status:** Accepted  
**Date:** 2024-01-20  
**Deciders:** Frontend Team  
**Tags:** frontend, state-management

## Context

The e-commerce application requires managing complex state across multiple components including:
- User authentication and session
- Shopping cart
- Product catalog
- Search filters
- UI state (modals, notifications)
- Real-time updates (inventory, prices)

## Decision

We will use a hybrid state management approach:

### 1. Server State: React Query (TanStack Query)
For all server-side data (products, orders, user data).

**Rationale:**
- Automatic caching with intelligent refetching
- Background updates
- Optimistic updates
- Request deduplication
- Pagination and infinite scroll support
- Built-in loading and error states

**Example:**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['product', productId],
  queryFn: () => fetchProduct(productId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### 2. Client State: Zustand
For client-side application state (cart, UI state).

**Rationale:**
- Minimal boilerplate compared to Redux
- No providers needed
- TypeScript support
- DevTools integration
- Simple API
- Small bundle size (1.2KB)

**Example:**
```typescript
const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  })),
}));
```

### 3. URL State: Next.js Router
For search filters, pagination, sorting.

**Rationale:**
- Shareable URLs
- Browser back/forward support
- SSR compatibility
- SEO benefits

**Example:**
```typescript
const searchParams = useSearchParams();
const category = searchParams.get('category');
const sort = searchParams.get('sort');
```

### 4. Form State: React Hook Form
For all forms (checkout, profile, product filters).

**Rationale:**
- Performance (minimal re-renders)
- Built-in validation
- Easy integration with UI libraries
- TypeScript support
- Small bundle size

**Example:**
```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(checkoutSchema)
});
```

## Consequences

### Positive
- Clear separation of concerns
- Reduced boilerplate
- Better performance
- Easier testing
- Type safety throughout

### Negative
- Multiple state management patterns to learn
- Need clear guidelines on when to use each

### Mitigation
- Document state management guidelines
- Provide code examples and templates
- Code review enforcement

## Alternatives Considered

### Redux Toolkit
- **Pros**: Most popular, huge ecosystem
- **Cons**: Verbose, complex setup, unnecessary for our use case

### MobX
- **Pros**: Simple, reactive
- **Cons**: Less predictable, smaller community

### Recoil
- **Pros**: From Facebook, atomic state
- **Cons**: Still experimental, API changes

### Jotai
- **Pros**: Atomic state, minimal
- **Cons**: Newer, smaller ecosystem

## Implementation Guidelines

### Server State (React Query)
```typescript
// Use for: API calls, database queries
queryClient.setQueryData(['products'], products);
```

### Client State (Zustand)
```typescript
// Use for: Cart, UI state, preferences
const useStore = create((set) => ({
  cart: [],
  addToCart: (item) => set((state) => /* ... */)
}));
```

### URL State (Router)
```typescript
// Use for: Filters, pagination, search
router.push({ query: { category: 'electronics' } });
```

### Form State (React Hook Form)
```typescript
// Use for: All forms
const { register } = useForm();
```

## Review Date

2024-07-20 (6 months)
