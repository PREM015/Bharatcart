# ADR 003: Authentication & Authorization Strategy

**Status:** Accepted  
**Date:** 2024-01-25  
**Deciders:** Security Team, Backend Team  
**Tags:** security, authentication, authorization

## Context

E-commerce platform requires secure authentication and authorization supporting:
- Traditional email/password login
- Social login (Google, Facebook, Apple)
- Passwordless authentication
- Biometric authentication (mobile)
- Multi-factor authentication (2FA)
- Session management
- Role-based access control (RBAC)

## Decision

### Authentication Strategy

#### 1. Primary Method: JWT (JSON Web Tokens)

**Access Tokens:**
- Short-lived (15 minutes)
- Stateless
- Contains user claims (id, email, role)
- Signed with RS256 (asymmetric)

**Refresh Tokens:**
- Long-lived (30 days)
- Stored in database
- Rotated on use
- Can be revoked

**Implementation:**
```typescript
// Access Token
const accessToken = jwt.sign(
  { userId, email, role },
  privateKey,
  { algorithm: 'RS256', expiresIn: '15m' }
);

// Refresh Token
const refreshToken = await generateRefreshToken(userId);
await storeRefreshToken(refreshToken, userId);
```

#### 2. Session Storage: Redis

**Rationale:**
- Fast in-memory access
- TTL support for auto-expiration
- Atomic operations
- Pub/Sub for logout broadcast

**Structure:**
```typescript
session:{sessionId} = {
  userId: number,
  email: string,
  role: string,
  deviceId: string,
  createdAt: timestamp,
  expiresAt: timestamp
}
```

#### 3. Passwordless Options

**Magic Link:**
- Email-based, one-time use links
- 15-minute expiration
- Stored in database with token hash

**WebAuthn/Passkeys:**
- FIDO2 standard
- Biometric or security key
- Most secure option
- No password to steal

**OTP (One-Time Password):**
- 6-digit codes
- SMS or Email delivery
- 10-minute expiration

#### 4. Social Authentication (OAuth 2.0)

**Providers:**
- Google OAuth 2.0
- Facebook Login
- Apple Sign In
- GitHub (for developers)

**Flow:**
1. User clicks social login
2. Redirect to provider
3. User authorizes
4. Receive authorization code
5. Exchange for access token
6. Fetch user profile
7. Create/update user account
8. Generate our JWT tokens

### Authorization Strategy

#### 1. Role-Based Access Control (RBAC)

**Roles:**
- `guest` - Unauthenticated users
- `customer` - Registered customers
- `vendor` - Product vendors
- `support` - Customer support
- `admin` - System administrators
- `super_admin` - Full access

**Permissions:**
```typescript
const permissions = {
  customer: [
    'products:read',
    'cart:manage',
    'orders:create',
    'orders:read:own'
  ],
  vendor: [
    'products:manage:own',
    'orders:read:own',
    'analytics:read:own'
  ],
  admin: [
    'products:manage:all',
    'orders:manage:all',
    'users:manage',
    'analytics:read:all'
  ]
};
```

#### 2. Attribute-Based Access Control (ABAC)

For fine-grained permissions:
```typescript
canAccess = (user, resource, action) => {
  if (action === 'order:update') {
    return resource.userId === user.id || user.role === 'admin';
  }
};
```

#### 3. API Security

**Rate Limiting:**
- Per IP: 100 requests/minute
- Per User: 1000 requests/minute
- Per API Key: 10000 requests/minute

**CORS:**
```typescript
cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  maxAge: 86400
})
```

**CSRF Protection:**
- SameSite cookies
- CSRF tokens for state-changing operations

## Implementation

### Middleware
```typescript
// Authentication middleware
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, publicKey);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Authorization middleware
export const authorize = (...roles: string[]) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};
```

### Usage
```typescript
router.get('/admin/users',
  authenticate,
  authorize('admin', 'super_admin'),
  getUsersHandler
);
```

## Security Measures

1. **Password Security:**
   - Bcrypt hashing (cost factor: 12)
   - Minimum 8 characters
   - Complexity requirements
   - Breach database checking

2. **Token Security:**
   - Signed with RS256
   - Short expiration
   - Refresh token rotation
   - Blacklist on logout

3. **Session Security:**
   - HttpOnly cookies
   - Secure flag (HTTPS only)
   - SameSite=Strict
   - Regular cleanup

4. **Monitoring:**
   - Failed login attempts
   - Suspicious activity detection
   - Session anomaly detection
   - Audit logs

## Compliance

- **GDPR**: User data access and deletion
- **PCI DSS**: No storage of payment credentials
- **OWASP**: Following top 10 security practices
- **SOC 2**: Audit logging and access controls

## Consequences

### Positive
- Secure and scalable
- Multiple auth options
- Good user experience
- Compliance ready

### Negative
- Complex implementation
- Multiple auth flows to maintain
- Token refresh complexity

### Mitigation
- Comprehensive documentation
- Automated testing
- Security audits
- Team training

## Review Date

2024-04-25 (Quarterly review for security updates)
