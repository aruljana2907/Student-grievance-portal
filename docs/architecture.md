# System Architecture Documentation

## Secure Student Grievance & Feedback Portal

### 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph BrowserClient ["Frontend Client Tier"]
        UI["Vanilla JS + Bootstrap 5 + Chart.js"]
        Theme["Dark/Light Theme Engine"]
        CSRFHelper["CSRF Token Interceptor"]
        ToastSys["Accessible ARIA Live Toaster"]
    end

    subgraph SecurityPerimeter ["Security & Defense Perimeter"]
        HelmetHeaders["Helmet Security Headers\nStrict CSP, NoSniff, Frameguard"]
        RateLimit["express-rate-limit\nLogin (10/15m), Register (10/1h)"]
        BodyLimit["Body Limit Parser\nDoS Mitigation (100kb limit)"]
        CSRFValidation["csrf-csrf Protection\nDouble-Submit Cookie Verification"]
    end

    subgraph AppTier ["Express Application Tier"]
        SessionStore["express-session + MySQL Store\n30m Idle Timeout, SameSite=Strict"]
        AuthMiddleware["RBAC Authorization\nrequireAuth, requireRole('admin'|'student')"]
        Validator["express-validator\nInput Sanitization & Policy Enforcer"]
        RouterLayer["Express Route Controllers\n/api/auth, /api/tickets, /api/admin"]
        ServiceLayer["Service Layer (Business Logic)\nuserService, ticketService, auditService"]
    end

    subgraph DataTier ["Data Persistence Tier"]
        DBPool["mysql2/promise Connection Pool\nPrepared Statements Only"]
        AuditTrail["Audit Log Records\nActions, IPs, User Agents, Timestamps"]
        MySQLDB[("MySQL 8.0 Engine\nInnoDB, utf8mb4_unicode_ci")]
    end

    UI -->|HTTPS / REST API| HelmetHeaders
    HelmetHeaders --> RateLimit
    RateLimit --> BodyLimit
    BodyLimit --> SessionStore
    SessionStore --> CSRFValidation
    CSRFValidation --> RouterLayer
    RouterLayer --> AuthMiddleware
    AuthMiddleware --> Validator
    Validator --> ServiceLayer
    ServiceLayer --> AuditTrail
    ServiceLayer --> DBPool
    DBPool --> MySQLDB
```

---

### 2. Request-Response Lifecycle & Security Filtering

1. **Edge Protection (Helmet)**:
   - Enforces a Content Security Policy (CSP) permitting only trusted scripts (Bootstrap and Chart.js CDNs) and disallowing unauthorized framing (`frame-ancestors 'none'`).
   - Adds HTTP Strict Transport Security (HSTS), X-Content-Type-Options: `nosniff`, and disables cross-site embedding.

2. **Traffic Throttling (Rate Limiting)**:
   - Sensitive auth routes (`/api/auth/login` and `/api/auth/register`) are guarded by dedicated IP limiters to prevent automated brute-forcing or credential stuffing.

3. **Session Identification & Verification**:
   - `express-session` reads the `sgp_session_id` cookie (`httpOnly: true`, `sameSite: 'strict'`).
   - Rolling expiration refreshes the 30-minute idle window upon active requests.

4. **CSRF Verification**:
   - Every mutation request (`POST`, `PUT`, `DELETE`, `PATCH`) must present a valid double-submit CSRF cookie (`sgp_csrf`) paired with the `x-csrf-token` HTTP header signed by the server's secret.

5. **Role-Based Authorization & Ownership Validation**:
   - `requireAuth` verifies active session existence.
   - `requireRole('admin')` restricts admin endpoints.
   - `ticketService` enforces row-level ownership: students can only access tickets matching `req.session.user.id`.

6. **Prepared Statement Execution**:
   - All SQL statements use placeholder parameters (`?`) via `mysql2/promise`. Input is never interpolated directly into queries.
