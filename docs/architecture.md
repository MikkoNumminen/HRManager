# Architecture

## Request flow

```mermaid
graph LR
    Browser -->|HTTP| Proxy["proxy.ts<br/>(CSP + nonce)"]
    Proxy -->|Next.js App Router| Next["Next.js"]
    Next -->|auth()| Auth["NextAuth v5<br/>(JWT)"]
    Next -->|Server Component| SC["Page (async)"]
    SC -->|read| Q["features/*/queries.ts<br/>Zod-validated"]
    SC -->|props| CC["Client Component<br/>(React 19)"]
    CC -->|action=| SA["features/*/actions.ts"]
    SA -->|requirePermission| RBAC["permissions.ts"]
    SA -->|$transaction| Prisma
    SA -->|after()| Audit["auditLog.ts"]
    Audit -->|deferred write| Mongo[(MongoDB)]
    Q -->|audit reads| Mongo
    Q --> Prisma
    Prisma --> PG[(PostgreSQL)]
```

## Data model

```mermaid
erDiagram
    Person ||--o{ TeamMember : "belongs to"
    Team ||--o{ TeamMember : "has"
    Person ||--o{ Team : "manages"
    Person ||--o{ Department : "heads"
    Department ||--o{ Team : "contains"
    User ||--o{ UserPermission : "has"
    Permission ||--o{ UserPermission : "grants"

    Person {
        uuid id PK
        string name
        string position
        string email "partial unique"
        datetime deletedAt
    }

    Team {
        uuid teamId PK
        string teamName "partial unique"
        uuid teamManagerId FK
        uuid departmentId FK
        datetime deletedAt
    }

    Department {
        uuid id PK
        string name "partial unique"
        string description
        uuid headId FK
        datetime deletedAt
    }

    TeamMember {
        uuid id PK
        uuid personId FK
        uuid teamId FK
        datetime deletedAt
    }

    RateLimit {
        uuid id PK
        string identifier
        string action
        int count
        datetime windowStart
    }

    User {
        uuid id PK
        string email UK
        string name
        string role
    }

    Permission {
        uuid id PK
        string key UK
        string description
    }

    UserPermission {
        uuid id PK
        uuid userId FK
        uuid permissionId FK
        boolean granted
    }

    AuditLog["AuditLog (MongoDB)"] {
        ObjectId _id PK
        string userId
        string userEmail
        string action
        string entityType
        string entityId
        string before
        string after
        string sessionId
        datetime createdAt
    }
```

## RBAC resolution

```mermaid
flowchart TD
    A[Incoming request] --> B{Authenticated?}
    B -->|No| C[Guest permissions<br/>read-only]
    B -->|Yes| D{Role?}
    D -->|superuser| E[All 38 permissions<br/>immutable]
    D -->|administrator / user| F[Load role defaults]
    F --> G{User overrides?}
    G -->|Yes| H[Apply grant/deny<br/>overrides per key]
    G -->|No| I[Use role defaults]
    H --> J[Resolved permissions]
    I --> J
    E --> J
    C --> J
    J --> K[Embed in JWT token]
```

## Server action lifecycle

```mermaid
sequenceDiagram
    participant C as Client Component
    participant SA as features/*/actions.ts
    participant RBAC as permissions.ts
    participant TX as prisma.$transaction
    participant AL as auditLog.ts
    participant PG as PostgreSQL
    participant Mongo as MongoDB

    C->>SA: FormData via action= prop
    SA->>RBAC: requirePermission(key)
    RBAC-->>SA: allowed / throw

    SA->>SA: Validate & sanitize input
    SA->>TX: Begin transaction

    TX->>PG: Read before-state
    PG-->>TX: Entity snapshot

    TX->>PG: Mutate (create/update/delete)
    PG-->>TX: Result

    TX-->>SA: Commit
    SA->>SA: revalidatePath()
    SA-->>C: Updated UI via React re-render

    Note over SA,Mongo: Deferred via after() — non-blocking
    SA->>AL: deferAudit(entries)
    AL->>Mongo: insertMany(audit docs)
    Mongo-->>AL: OK
```

## Auth flow

```mermaid
sequenceDiagram
    participant U as User
    participant NA as NextAuth
    participant DB as PostgreSQL
    participant JWT as JWT Token

    U->>NA: Sign in (Google / GitHub / Demo)
    NA->>DB: Find or create User
    Note over NA,DB: First user → superuser role

    NA->>DB: Load user + permission overrides
    DB-->>NA: User record + overrides
    NA->>NA: resolvePermissions(role, overrides)
    NA->>JWT: Embed userId, role, permissions
    JWT-->>U: Session cookie

    Note over U,JWT: Subsequent requests use<br/>JWT — no DB lookup needed
```
