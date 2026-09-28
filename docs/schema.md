# Database Schema Specification

## Secure Student Grievance & Feedback Portal

### 1. Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ TICKETS : "submits"
    USERS ||--o{ RESPONSES : "authors"
    USERS ||--o{ AUDIT_LOGS : "triggers"
    TICKETS ||--o{ RESPONSES : "contains"

    USERS {
        INT id PK "AUTO_INCREMENT"
        ENUM role "student, admin"
        VARCHAR name "Student or Administrator Full Name"
        VARCHAR register_no UK "Register Number or Username"
        VARCHAR email UK "Institutional Email"
        VARCHAR department "Academic or Administrative Dept"
        VARCHAR password_hash "Bcrypt cost factor 12 hash"
        INT failed_attempts "Consecutive failed login counter"
        DATETIME locked_until "Account lockout expiration"
        DATETIME created_at "Registration timestamp"
    }

    TICKETS {
        INT id PK "AUTO_INCREMENT"
        VARCHAR ticket_code UK "Unique code: GRV-YYYY-XXXX / FBK-YYYY-XXXX"
        INT user_id FK "References USERS(id) ON DELETE CASCADE"
        ENUM type "grievance, feedback"
        ENUM category "academic, hostel, infrastructure, canteen, examination, library, transportation, other"
        VARCHAR subject "Concise title (5-200 chars)"
        TEXT description "Detailed issue narrative (10-5000 chars)"
        ENUM priority "low, medium, high, urgent"
        ENUM status "pending, in_review, resolved"
        DATETIME created_at "Submission timestamp"
        DATETIME updated_at "Last update timestamp"
    }

    RESPONSES {
        INT id PK "AUTO_INCREMENT"
        INT ticket_id FK "References TICKETS(id) ON DELETE CASCADE"
        INT admin_id FK "References USERS(id) ON DELETE CASCADE"
        TEXT message "Official response message (max 2000 chars)"
        DATETIME created_at "Response timestamp"
    }

    AUDIT_LOGS {
        INT id PK "AUTO_INCREMENT"
        INT user_id FK "Nullable: references USERS(id) ON DELETE SET NULL"
        VARCHAR action "Event name (e.g. LOGIN_SUCCESS, STATUS_CHANGE)"
        VARCHAR ip "Client IPv4 / IPv6 address"
        VARCHAR user_agent "Client User-Agent browser string"
        DATETIME created_at "Audit record timestamp"
    }

    SESSIONS {
        VARCHAR session_id PK "Session token identifier"
        INT expires "Epoch timestamp of session expiry"
        MEDIUMTEXT data "JSON serialized session store"
    }
```

---

### 2. Table Definitions

#### `users`
| Column | Type | Nullable | Constraints / Index | Description |
|---|---|---|---|---|
| `id` | `INT` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | Internal user ID |
| `role` | `ENUM('student','admin')` | No | Default: `'student'`, Indexed | Access control role |
| `name` | `VARCHAR(100)` | No | | Full name |
| `register_no` | `VARCHAR(50)` | No | `UNIQUE`, Indexed | Student registration number or admin username |
| `email` | `VARCHAR(150)` | No | `UNIQUE`, Indexed | Institutional email |
| `department` | `VARCHAR(100)` | No | | Department designation |
| `password_hash` | `VARCHAR(255)` | No | | Bcrypt cost factor 12 hash |
| `failed_attempts` | `INT` | No | Default: `0` | Consecutive failed login counter |
| `locked_until` | `DATETIME` | Yes | Default: `NULL` | Lockout expiration time (5 mins on 5 failures) |
| `created_at` | `DATETIME` | No | Default: `CURRENT_TIMESTAMP` | Account creation timestamp |

#### `tickets`
| Column | Type | Nullable | Constraints / Index | Description |
|---|---|---|---|---|
| `id` | `INT` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | Internal ticket ID |
| `ticket_code` | `VARCHAR(50)` | No | `UNIQUE`, Indexed | Standardized code (`GRV-YYYY-XXXX`) |
| `user_id` | `INT` | No | `FOREIGN KEY` -> `users(id)` | Ticket creator |
| `type` | `ENUM('grievance','feedback')` | No | Default: `'grievance'` | Submission classification |
| `category` | `ENUM(...)` | No | Indexed | Campus department category |
| `subject` | `VARCHAR(200)` | No | | Subject title |
| `description` | `TEXT` | No | | Detailed problem narrative |
| `priority` | `ENUM('low','medium','high','urgent')` | No | Default: `'medium'` | Urgency level |
| `status` | `ENUM('pending','in_review','resolved')` | No | Default: `'pending'`, Indexed | Workflow status |
| `created_at` | `DATETIME` | No | Default: `CURRENT_TIMESTAMP`, Indexed | Creation timestamp |
| `updated_at` | `DATETIME` | No | `ON UPDATE CURRENT_TIMESTAMP` | Last modified timestamp |

#### `responses`
| Column | Type | Nullable | Constraints / Index | Description |
|---|---|---|---|---|
| `id` | `INT` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | Response record ID |
| `ticket_id` | `INT` | No | `FOREIGN KEY` -> `tickets(id)` | Target ticket ID |
| `admin_id` | `INT` | No | `FOREIGN KEY` -> `users(id)` | Responding administrator |
| `message` | `TEXT` | No | | Resolution text |
| `created_at` | `DATETIME` | No | Default: `CURRENT_TIMESTAMP` | Response timestamp |

#### `audit_logs`
| Column | Type | Nullable | Constraints / Index | Description |
|---|---|---|---|---|
| `id` | `INT` | No | `PRIMARY KEY`, `AUTO_INCREMENT` | Audit log ID |
| `user_id` | `INT` | Yes | `FOREIGN KEY` -> `users(id)` | User trigger or null if unauthenticated |
| `action` | `VARCHAR(100)` | No | Indexed | Security action tag |
| `ip` | `VARCHAR(45)` | No | | Origin IP address |
| `user_agent` | `VARCHAR(255)` | Yes | | Client User-Agent |
| `created_at` | `DATETIME` | No | Default: `CURRENT_TIMESTAMP`, Indexed | Event timestamp |
