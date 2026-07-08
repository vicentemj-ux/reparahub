# Versionado — ReparaHub

> Criterios oficiales, comandos y rollback. Documento de referencia para el equipo.
> La versión activa se sincroniza en `package.json` (fuente técnica), `docs/PROJECT_CONTEXT.md` (narrativa de producto) y `CHANGELOG.md` (historial). El script `scripts/bump-version.mjs` mantiene los tres sincronizados.

---

## 1. Formato SemVer

`MAJOR.MINOR.PATCH` (semver.org).

| Nivel | Significado | Ejemplos |
|---|---|---|
| **MAJOR** | Cambios de arquitectura o modelo de negocio que requieren migración amplia o cambios de operación. | cambio de base de auth, cambio de plataforma principal, reestructura multi-tenant |
| **MINOR** | Nuevas capacidades funcionales completas y listas para cliente, sin romper operación actual. | lanzamiento de POS Kiosko PRO, nuevo módulo core estable, nuevo flujo de escáner de códigos |
| **PATCH** | Correcciones, hardening, performance y ajustes UX sin cambio estructural de producto. | fix de runtime, ajuste de copy, bugfix de tracking, índice de BD |

---

## 2. Conventional Commits (obligatorio)

Cada commit debe usar uno de estos prefijos. Esto permite al script `bump-version.mjs` generar el CHANGELOG automáticamente agrupando por tipo.

| Prefijo | Nivel típico | Aparece en CHANGELOG como |
|---|---|---|
| `feat:` o `feat(area):` | MINOR (a veces MAJOR) | ### Features |
| `fix:` o `fix(area):` | PATCH | ### Fixes |
| `perf:` o `perf(area):` | PATCH | ### Performance |
| `refactor:` | PATCH (sin cambio visible) | ### Refactors |
| `docs:` | — (no versiona) | ### Docs |
| `chore:` o `infra:` o `build:` | — (no versiona) | ### Infra |
| `BREAKING CHANGE:` en footer | MAJOR | warning en changelog |

**Reglas:**
- Scope entre paréntesis opcional: `feat(inventario): ...`.
- Mensaje en imperativo, minúscula después del prefijo, sin punto final.
- Línea de summary < 72 caracteres.
- Body opcional con `Descripción más larga y referencia a issues.`
- Footer `BREAKING CHANGE: <descripción>` para rupturas.

**Referencia visual (commits recientes del proyecto):**
```
fix(inventario): modal de producto con X grande y botones centrados
docs(features): normalizar UTF-8 espanol y eliminar caracteres chinos
feat(inventario): version mobile-first con KPIs colapsables y FAB de Nuevo Producto
```

---

## 3. Comandos de release

```bash
pnpm version:bump patch    # bugfix
pnpm version:bump minor    # nueva feature
pnpm version:bump major    # breaking change

# Con mensaje personalizado (sobrescribe el auto-generado desde git log)
pnpm version:bump patch --message "fix(scanner): EAN-8 no se detectaba"
```

**Lo que hace el script:**
1. Lee la versión actual de `package.json`.
2. Calcula la nueva según el nivel.
3. Genera el bloque de CHANGELOG desde `git log <último-tag>..HEAD` agrupado por tipo de commit.
4. Si se pasa `--message`, lo usa como nota destacada de la release.
5. Actualiza `package.json:version`.
6. Actualiza `docs/PROJECT_CONTEXT.md` (sección "Version activa" y fecha).
7. Prepende el nuevo bloque a `CHANGELOG.md`.
8. Crea un commit `chore(release): vX.Y.Z`.
9. Crea un git tag `vX.Y.Z` con mensaje "Release vX.Y.Z".
10. Imprime: `Próximo paso: git push origin main --tags`.

---

## 4. Criterios de decisión (cheat-sheet)

| Situación | Nivel | Ejemplo |
|---|---|---|
| Fix bug que rompe algo | PATCH | "scanner no detecta EAN-8" |
| Fix UX o copy | PATCH | "X más grande en modal" |
| Optimización de query | PATCH | "índice en producto.codigo_barras" |
| Refactor sin cambio visible | PATCH | "extraer helper compartido" |
| Nueva feature completa | MINOR | "lector de códigos de barras" |
| Nuevo módulo completo | MINOR | "Mercado, Chat Taller" |
| Cambio de BD que requiere migración manual | MAJOR | "cambio de Prisma a Drizzle" |
| Cambio de auth/SSO | MAJOR | "migrar a Clerk" |
| Eliminar feature pública | MAJOR | "remover plan Free" |

> **Duda entre MINOR y MAJOR:** si la feature se puede activar/desactivar sin migración → MINOR. Si requiere migración de datos o cambio operativo → MAJOR.

---

## 5. Rollback (3 caminos)

### Camino A — Volver a un tag estable (recomendado para disaster)

```bash
git reset --hard v2.1.0
git push origin main --force-with-lease
```

> ⚠️ Solo usar si nadie más ha pull-eado del remoto. En equipo coordinado, preferir Camino B.

### Camino B — Revert de commits puntuales (seguro, historial intacto)

```bash
git revert <commit-hash>          # un commit
git revert <hash1> <hash2> ...    # varios
git push origin main
```

El tag `v2.1.0-checkpoint-pre-barcode` queda como punto de retorno seguro entre releases grandes.

### Camino C — Feature flag (kill-switch sin redeploy)

Para apagar una feature nueva sin tocar git:
- `lib/runtime-flags.ts` → `BARCODE_SCANNER_ENABLED = false`
- Commit y push (Vercel redespliega en < 2 min).
- El componente lee el flag y no renderiza el botón.

Usar este camino cuando:
- La feature funciona pero tiene un bug en producción que se descubre tarde.
- Se necesita apagar algo antes de hacer el revert formal.

---

## 6. Tags de checkpoint para features grandes

Antes de implementar una feature que toca múltiples archivos y módulos (ej. el escáner de códigos), se crea un tag `vX.Y.Z-checkpoint-pre-<feature>` con el estado estable.

```bash
git tag -a v2.1.0-checkpoint-pre-barcode -m "Estado estable antes de integrar scanner"
```

Si la implementación daña cosas o se decide revertir:
```bash
git reset --hard v2.1.0-checkpoint-pre-barcode
git tag -d v2.1.0-checkpoint-pre-barcode
```

> Este patrón ya se aplicó el 2026-06-02 antes de la integración del escáner. Ver `git log --oneline --decorate`.

---

## 7. Plantilla de release notes (cuando se necesite)

Para comunicados externos o a clientes, generar después del bump:

```markdown
## vX.Y.Z — YYYY-MM-DD

**Highlights:**
- <1 frase de feature principal>
- <1 frase de mejora>

**Cambios por área:**
- Inventario: <bullets>
- Ventas (POS): <bullets>
- Reparaciones: <bullets>
- Sistema: <bullets>

**Acciones requeridas:** <ninguna | migrar X | actualizar Y>
```

---

*Documento vivo. Última revisión: 2026-06-02. Mantener criterio simple — el script automatiza lo automatizable, el humano decide el nivel.*
