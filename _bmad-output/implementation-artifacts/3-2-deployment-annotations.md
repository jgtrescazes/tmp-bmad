# Story 3.2: Annotations Déploiements sur les Graphes

Status: done

## Story

As a **Tech Lead**,
I want **voir les déploiements annotés automatiquement sur les graphes d'évolution**,
So that **je peux corréler l'impact d'une MEP avec les métriques**.

## Acceptance Criteria

1. **Given** des déploiements existent **When** je visualise un graphe **Then** les déploiements apparaissent comme marqueurs verticaux sur la timeline (FR20)
2. **Given** je survole un marqueur **When** le tooltip s'affiche **Then** il montre sha court, message, auteur, date (FR21)

## Tasks / Subtasks

- [x] Task 1: Composable useDeployments (AC: #1)
  - [x] 1.1 Créer `app/composables/useDeployments.ts` — fetch deployments pour la période sélectionnée via PostgREST
  - [x] 1.2 Retourner les déploiements formatés pour ECharts markLine
- [x] Task 2: Intégrer dans MetricChart (AC: #1, #2)
  - [x] 2.1 Ajouter prop `deployments` au composant `app/components/metrics/MetricChart.vue`
  - [x] 2.2 Convertir les déploiements en ECharts markLine (lignes verticales)
  - [x] 2.3 Configurer le tooltip personnalisé pour les marqueurs MEP (sha court, message, auteur, date)
- [x] Task 3: Tests (AC: #1, #2)
  - [x] 3.1 Tests `useDeployments` (fetch, formatage, filtrage par période)
  - [x] 3.2 Tests `MetricChart` avec annotations (markLine présentes, tooltip configuré)

## Dev Notes

### PostgREST query for deployments

```typescript
const { data } = await supabase
  .from('deployments')
  .select('id, sha, short_sha, message, author, pr_number, deployed_at')
  .eq('repository_id', repositoryId)
  .gte('deployed_at', periodStart)
  .lte('deployed_at', periodEnd)
  .order('deployed_at', { ascending: true })
```

### ECharts markLine API

```typescript
// Convert deployments to ECharts markLine data
function deploymentsToMarkLine(deployments: Deployment[]) {
  return {
    markLine: {
      silent: false, // Enable hover interaction
      symbol: ['none', 'none'],
      lineStyle: {
        type: 'dashed',
        color: '#888',
        width: 1,
      },
      label: {
        show: false, // Use tooltip instead
      },
      data: deployments.map(d => ({
        xAxis: d.deployed_at,
        name: d.short_sha,
      })),
    },
  }
}
```

### Tooltip formatter for deployment markers

```typescript
// Custom tooltip formatter that detects markLine hover
tooltip: {
  formatter(params) {
    if (params.componentType === 'markLine') {
      const deployment = deployments.find(d => d.short_sha === params.name)
      if (deployment) {
        const date = new Intl.DateTimeFormat('fr-FR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(deployment.deployed_at))
        return `
          <strong>Déploiement ${deployment.short_sha}</strong><br/>
          ${deployment.message}<br/>
          <em>${deployment.author}</em> — ${date}
        `
      }
    }
    // Default tooltip for data points
    return defaultFormatter(params)
  }
}
```

### Deployments table schema reminder

```sql
-- Columns available from deployments table:
-- id, repository_id, sha, short_sha (generated), message, author, pr_number, deployed_at, created_at
```

### References

- [Source: prd.md#FR20] — Déploiements annotés sur les graphes
- [Source: prd.md#FR21] — Tooltip avec détails du déploiement
- [Source: epics.md#Epic 3] — Story annotations déploiements
- [Source: architecture.md#Data Model] — Table deployments

## Dev Agent Record

### Implementation Summary (2026-03-09)

**Files Created:**
- `app/composables/useDeployments.ts` - Deployments composable with useDeployments, deploymentsToMarkLine, createDeploymentTooltipFormatter
- `tests/unit/composables/useDeployments.test.ts` - 18 tests for deployments logic

**Files Modified:**
- `app/components/metrics/MetricChart.client.vue` - Added deployments prop, markLine injection, custom tooltip formatter
- `app/pages/stability.vue` - Integrated useDeployments and passed to chart

**Tests:** 315 tests passing

**Decisions:**
- MetricChart accepts optional `deployments` prop and automatically injects markLine into first series
- Tooltip shows deployment details (sha, message, author, date, PR#) on markLine hover
- Long commit messages truncated to 50 chars in tooltip
- Deployments ordered by deployedAt ascending
