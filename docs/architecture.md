# Architecture

## Request flow

```mermaid
graph LR
    Browser -->|HTTP| Next["Next.js App Router"]
    Next -->|auth()| Auth["NextAuth v5<br/>(JWT)"]
    Next -->|Server Component| SC["Page (async)"]
    SC -->|read| Q["queries.ts<br/>Zod-validated"]
    SC -->|props| CC["Client Component<br/>(React 19)"]
    CC -->|action=| SA["serverActions.ts"]
    SA -->|requirePermission| RBAC["permissions.ts"]
    SA -->|$transaction| Prisma
    SA -->|logAudit| Audit["auditLog.ts"]
    Audit -->|same tx| Prisma
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
        string email UK
    }

    Team {
        uuid teamId PK
        string teamName UK
        uuid teamManagerId FK
        uuid departmentId FK
    }

    Department {
        uuid id PK
        string name UK
        string description
        uuid headId FK
    }

    TeamMember {
        uuid id PK
        uuid personId FK
        uuid teamId FK
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

    AuditLog {
        uuid id PK
        string userId
        string userEmail
        string action
        string entityType
        string entityId
        json before
        json after
        datetime createdAt
    }
```

## RBAC resolution

```mermaid
flowchart TD
    A[Incoming request] --> B{Authenticated?}
    B -->|No| C[Guest permissions<br/>read-only]
    B -->|Yes| D{Role?}
    D -->|superuser| E[All 23 permissions<br/>immutable]
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
    participant SA as Server Action
    participant RBAC as permissions.ts
    participant TX as prisma.$transaction
    participant AL as auditLog.ts
    participant DB as PostgreSQL

    C->>SA: FormData via action= prop
    SA->>RBAC: requirePermission(key)
    RBAC-->>SA: allowed / throw

    SA->>SA: Validate & sanitize input
    SA->>TX: Begin transaction

    TX->>DB: Read before-state
    DB-->>TX: Entity snapshot

    TX->>DB: Mutate (create/update/delete)
    DB-->>TX: Result

    TX->>AL: logAudit(before, after, tx)
    AL->>DB: Insert AuditLog row
    DB-->>AL: OK

    TX-->>SA: Commit
    SA->>SA: revalidatePath()
    SA-->>C: Updated UI via React re-render
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
