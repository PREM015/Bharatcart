# ADR 001: Microservices vs Monolith

**Status**: Accepted  
**Date**: 2024-01-01  
**Deciders**: Engineering Team

## Context

We need to decide on the architectural approach for BharatCart e-commerce platform. The choice is between:
- Monolithic architecture
- Microservices architecture

## Decision

We will use a **modular monolith** approach initially, with the option to extract services later.

## Rationale

### Pros of Monolith:
- Faster development initially
- Simpler deployment
- Easier debugging and testing
- Lower operational complexity
- Better for small team

### Cons of Microservices (at this stage):
- Increased complexity
- Network latency
- Distributed transactions challenges
- Requires DevOps expertise
- Overhead for small team

## Consequences

### Positive:
- Faster time to market
- Lower infrastructure costs
- Easier to maintain with current team size
- Can refactor to microservices later if needed

### Negative:
- Potential scaling limitations
- Tight coupling initially
- Longer deployment times as codebase grows

## Migration Path

If we need to move to microservices:
1. Extract payment service first (PCI compliance)
2. Extract search/analytics (different scaling needs)
3. Extract notification service
4. Keep core e-commerce as monolith

## Related

- ADR 002: Database Choice
- ADR 003: Authentication Strategy
