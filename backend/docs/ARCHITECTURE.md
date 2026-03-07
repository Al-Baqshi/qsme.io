# QSME Backend — Clean Architecture

## Layout

```
app/
  domain/                    # No dependency on infrastructure
    entities/                # Domain entities & DTOs (overlay, quantity, context)
    value_objects/           # Enums, Confidence, NormalizedPoint, PageScale, etc.
    contracts/               # Protocol interfaces (repositories, storage, pdf)

  application/               # Use cases; depends only on domain
    quantity_engine.py       # Deterministic quantity computation
    services/                # (Future: app services that use contracts)
    agents/                  # (Future: trade agents, AI assist)

  infrastructure/            # Implements domain contracts
    database/                # Connection, ORM models, (repositories)
      connection.py
      models.py
    storage/                 # (Future: file storage backend)
    pdf_processing/          # (Future: extractor, page classifier)
    workers/                 # (Future: extraction worker)

  interfaces/                # Entry points
    api/                     # (Future: FastAPI app, routers moved here)

  # Current entry and HTTP layer (still under app root)
  main.py                    # FastAPI app, includes routers
  routers/                   # HTTP endpoints
  schemas/                   # Re-exports from domain (single source of truth)
  services/                  # Application services (use domain + infra)
  models/                    # Re-exports from infrastructure.database
  database.py                # Re-exports from infrastructure.database
```

## Rules

- **Domain** has no dependency on infrastructure or interfaces. Only stdlib and pydantic.
- **Application** depends only on domain (entities, value_objects, contracts). No SQLAlchemy, FastAPI, or file I/O.
- **Infrastructure** implements domain contracts (e.g. repositories, storage, pdf extraction) and may depend on domain types.
- **Interfaces** (API, CLI) depend on application and infrastructure; they wire concrete implementations into application services.

## Current state

- **Domain**: `domain/entities`, `domain/value_objects`, `domain/contracts` are in place. Overlay and quantity types live here; schemas re-export from domain.
- **Application**: `application/quantity_engine.py` is the canonical quantity engine; `app.services.quantity_service` uses it.
- **Infrastructure**: `infrastructure/database/` holds the real DB connection and ORM models. `app.database` and `app.models` re-export from here for backward compatibility.
- **Interfaces**: Routers remain under `app/routers`; `main.py` composes the app. A future step is to move them under `interfaces/api/` and inject application services via dependencies.

## Dependency direction

```
  interfaces (api)
       ↓
  application (services, quantity_engine)
       ↓
  domain (entities, value_objects, contracts)
       ↑
  infrastructure (database, storage, pdf_processing)
```

Infrastructure must not be imported by domain. Application and interfaces may depend on domain and (for interfaces) on infrastructure to obtain concrete implementations.
