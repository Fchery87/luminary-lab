**
---
title: Data Model
owner: architect
version: 1.0
date: 2025-12-13
status: draft
---

### 1. ER Diagram (Mermaid)
```mermaid
erDiagram
    USER ||--o{ PROJECT : creates
    USER ||--o{ USER_SUBSCRIPTION : has
    PROJECT ||--|| ORIGINAL_IMAGE : contains
    PROJECT ||--o{ PROCESSED_IMAGE : generates
    SYSTEM_STYLE ||--o{ PROCESSED_IMAGE : applied_to
    SUBSCRIPTION_PLAN ||--o{ USER_SUBSCRIPTION : defines
    USER {
        uuid id PK
        varchar email UK
        varchar display_name
        varchar password_hash
        timestamp created_at
    }
    PROJECT {
        uuid id PK
        uuid user_id FK
        uuid original_image_id FK
        varchar name
        timestamp created_at
    }
    IMAGE {
        uuid id PK
        uuid project_id FK
        uuid style_id FK NULL
        varchar type ENUM
        varchar storage_key
        varchar filename
        integer size_bytes
        varchar mime_type
        timestamp created_at
    }
    SYSTEM_STYLE {
        uuid id PK
        varchar name
        varchar model_identifier
        jsonb configuration
        boolean is_active
    }
    USER_SUBSCRIPTION {
        uuid id PK
        uuid user_id FK
        uuid plan_id FK
        varchar status ENUM
        timestamp current_period_end
        timestamp created_at
    }
    SUBSCRIPTION_PLAN {
        uuid id PK
        varchar name
        integer monthly_upload_limit
    }
```

### 2. Table Schemas
**users**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| display_name | VARCHAR(100) | |
| password_hash | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**projects**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK(users.id), NOT NULL |
| original_image_id | UUID | FK(images.id), UNIQUE, NOT NULL |
| name | VARCHAR(200) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**images**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| project_id | UUID | FK(projects.id), NOT NULL |
| style_id | UUID | FK(system_styles.id) |
| type | VARCHAR(20) | NOT NULL, CHECK(type IN ('original', 'processed')) |
| storage_key | VARCHAR(500) | NOT NULL |
| filename | VARCHAR(255) | NOT NULL |
| size_bytes | INTEGER | NOT NULL |
| mime_type | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**system_styles**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(100) | UNIQUE, NOT NULL |
| model_identifier | VARCHAR(100) | NOT NULL |
| configuration | JSONB | NOT NULL |
| is_active | BOOLEAN | NOT NULL, DEFAULT true |

**user_subscriptions**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK(users.id), UNIQUE, NOT NULL |
| plan_id | UUID | FK(subscription_plans.id), NOT NULL |
| status | VARCHAR(20) | NOT NULL, CHECK(status IN ('active', 'past_due', 'canceled')) |
| current_period_end | TIMESTAMPTZ | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**subscription_plans**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(50) | UNIQUE, NOT NULL |
| monthly_upload_limit | INTEGER | NOT NULL |

### 3. Key Indexes
- `idx_users_email` on users(email)
- `idx_projects_user_id` on projects(user_id)
- `idx_images_project_id` on images(project_id)
- `idx_images_type_project_id` on images(type, project_id)
- `idx_user_subscriptions_user_id` on user_subscriptions(user_id)
- `idx_user_subscriptions_status` on user_subscriptions(status)
- `idx_user_subscriptions_current_period_end` on user_subscriptions(current_period_end)

### 4. Enums
```sql
-- Handled via CHECK constraints in table definitions above
-- No separate ENUM types required for initial deployment
```