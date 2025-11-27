# ADR 002: Database Choice

**Status**: Accepted  
**Date**: 2024-01-01  
**Deciders**: Engineering Team, Database Architect

## Context

Need to select primary database for e-commerce platform storing:
- User accounts
- Products and inventory
- Orders and transactions
- Reviews and ratings

Options considered:
- PostgreSQL (relational)
- MongoDB (document)
- MySQL (relational)

## Decision

We will use **PostgreSQL** as the primary database, with **Redis** for caching and **Elasticsearch** for search.

## Rationale

### Why PostgreSQL:
- **ACID compliance** - Critical for financial transactions
- **JSON support** - Flexible schema when needed
- **Full-text search** - Built-in capabilities
- **Mature ecosystem** - Proven at scale
- **Great performance** - Handles complex queries
- **Free and open source**

### Why not MongoDB:
- Transactions were added later
- Less mature for financial data
- Eventual consistency issues

### Why not MySQL:
- Less advanced JSON support
- Weaker full-text search
- PostgreSQL has better features overall

## Consequences

### Positive:
- Strong data consistency guarantees
- Complex queries with JOINs
- Excellent tooling (pgAdmin, DataGrip)
- Great ORM support (Prisma)
- JSON flexibility when needed

### Negative:
- Vertical scaling limits (mitigated with read replicas)
- Learning curve for team unfamiliar with PostgreSQL
- More rigid schema than NoSQL

## Implementation Details

```sql
-- Example schema benefits
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  metadata JSONB,  -- Flexible data
  created_at TIMESTAMP DEFAULT NOW()
);

-- Complex query example
SELECT 
  u.name,
  COUNT(o.id) as order_count,
  SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id
HAVING SUM(o.total) > 1000;
```

## Alternatives Considered

### Redis for Primary DB:
- ❌ In-memory only (data loss risk)
- ✅ Will use for caching

### Elasticsearch for Primary DB:
- ❌ Not designed for transactional data
- ✅ Will use for product search

## Related

- ADR 003: Caching Strategy
- ADR 005: Search Implementation
