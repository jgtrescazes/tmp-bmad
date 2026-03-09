# Recherche API - Outils de Monitoring

**Date:** 2026-03-09
**Objectif:** Disponibilité et documentation technique des APIs pour le dashboard de monitoring

---

## Synthèse exécutive

| Outil | API disponible | Auth | Rate Limits | Difficulté |
|-------|----------------|------|-------------|------------|
| ✅ Sentry | REST API v0 | Bearer Token | Standard | ⭐ Facile |
| ✅ GitHub | REST API v3 | Token/OAuth | 5000/h auth | ⭐ Facile |
| ✅ Dependabot | Via GitHub API | Token GitHub | Inclus GitHub | ⭐ Facile |
| ✅ Jira | REST API v3 | Basic Auth/OAuth2 | Standard | ⭐⭐ Moyen |
| ✅ Debugbear | REST API | API Key | Standard | ⭐ Facile |
| ⚠️ Treo.sh | REST API | API Key | À vérifier | ⭐⭐ Moyen |
| ✅ Google Search Console | REST API | OAuth2 | Quotas Google | ⭐⭐⭐ Complexe |
| ✅ Datadog | REST API | API Key + App Key | Standard | ⭐⭐ Moyen |

**Verdict global:** Toutes les APIs sont disponibles et exploitables. GSC est le plus complexe (OAuth2 Google).

---

## Fiches techniques détaillées

### 1. Sentry

**Documentation:** [docs.sentry.io/api](https://docs.sentry.io/api/)

| Aspect | Détail |
|--------|--------|
| **Version API** | v0 (stable pour endpoints publics) |
| **Auth** | Bearer Token (recommandé) |
| **Création token** | User Settings > Personal Tokens |
| **Format** | `Authorization: Bearer {TOKEN}` |
| **Base URL** | `https://sentry.io/api/0/` |

#### Endpoints pour vos besoins

| Besoin | Endpoint | Méthode |
|--------|----------|---------|
| **Nouvelles erreurs** | `/projects/{org}/{project}/issues/` | GET |
| **Erreurs résolues** | `/projects/{org}/{project}/issues/?query=is:resolved` | GET |
| **Statistiques** | `/projects/{org}/{project}/stats/` | GET |
| **Détail d'une issue** | `/issues/{issue_id}/` | GET |

#### Paramètres de requête utiles

```
?statsPeriod=24h|14d|30d     # Période de stats
?query=is:unresolved         # Filtre par statut
?query=is:resolved           # Erreurs résolues
?query=firstSeen:>2026-02-01 # Nouvelles depuis date
```

#### Exemples concrets

**Nouvelles erreurs du mois:**
```bash
curl -H "Authorization: Bearer {TOKEN}" \
  "https://sentry.io/api/0/projects/{org}/{project}/issues/?statsPeriod=30d&query=is:unresolved"
```

**Erreurs résolues du mois:**
```bash
curl -H "Authorization: Bearer {TOKEN}" \
  "https://sentry.io/api/0/projects/{org}/{project}/issues/?statsPeriod=30d&query=is:resolved"
```

**Statistiques d'événements:**
```bash
curl -H "Authorization: Bearer {TOKEN}" \
  "https://sentry.io/api/0/projects/{org}/{project}/stats/?stat=received&resolution=1d"
```

#### Réponse type (issues)

```json
{
  "id": "123456",
  "title": "TypeError: Cannot read property 'x' of undefined",
  "count": 42,
  "userCount": 15,
  "firstSeen": "2026-02-15T10:30:00Z",
  "lastSeen": "2026-03-08T14:22:00Z",
  "status": "unresolved",
  "stats": {
    "24h": [[1709900400, 5], [1709904000, 3], ...]
  }
}
```

#### Calcul "Temps de traitement"

⚠️ **Note:** Le "Time to Resolution" n'est pas directement disponible via API (plan Business/Enterprise requis).
**Alternative:** Calculer `lastSeen - firstSeen` pour les issues résolues, ou utiliser les dates de résolution Jira.

**Sources:**
- [Sentry API Reference](https://docs.sentry.io/api/)
- [List Project Issues](https://docs.sentry.io/api/events/list-a-projects-issues/)
- [Retrieve Event Counts](https://docs.sentry.io/api/projects/retrieve-event-counts-for-a-project/)

---

### 2. GitHub (Releases/MEP)

**Documentation:** [docs.github.com/en/rest](https://docs.github.com/en/rest)

| Aspect | Détail |
|--------|--------|
| **Version API** | REST v3 |
| **Auth** | Personal Access Token ou GitHub App |
| **Rate Limits** | 60/h (non auth) / 5000/h (auth) |
| **Format** | `Authorization: Bearer {TOKEN}` |
| **Base URL** | `https://api.github.com` |

#### Endpoints pour vos besoins (Annotations MEP)

| Besoin | Endpoint | Méthode |
|--------|----------|---------|
| **Liste releases** | `/repos/{owner}/{repo}/releases` | GET |
| **Dernière release** | `/repos/{owner}/{repo}/releases/latest` | GET |
| **Liste tags** | `/repos/{owner}/{repo}/tags` | GET |
| **Commits** | `/repos/{owner}/{repo}/commits` | GET |

#### Exemples concrets

**Lister les releases (pour overlay MEP):**
```bash
curl -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/releases?per_page=30"
```

**Lister les tags:**
```bash
curl -H "Authorization: Bearer {TOKEN}" \
  "https://api.github.com/repos/{owner}/{repo}/tags?per_page=50"
```

**Commits sur une période:**
```bash
curl -H "Authorization: Bearer {TOKEN}" \
  "https://api.github.com/repos/{owner}/{repo}/commits?since=2026-02-01T00:00:00Z&until=2026-03-01T00:00:00Z"
```

#### Réponse type (releases)

```json
{
  "id": 123456789,
  "tag_name": "v2.4.1",
  "name": "Release 2.4.1 - Hotfix checkout",
  "body": "## Changelog\n- Fix checkout error...",
  "created_at": "2026-03-05T14:30:00Z",
  "published_at": "2026-03-05T15:00:00Z",
  "author": {
    "login": "dev-username"
  }
}
```

#### Pour le dashboard

Utilisez `published_at` ou `created_at` pour positionner les markers MEP sur les courbes.

**Sources:**
- [REST API Releases](https://docs.github.com/en/rest/releases/releases)
- [REST API Tags](https://docs.github.com/en/rest/git/tags)
- [REST API Commits](https://docs.github.com/en/rest/commits/commits)

---

### 3. Dependabot (via GitHub API)

**Documentation:** [docs.github.com/en/rest/dependabot/alerts](https://docs.github.com/en/rest/dependabot/alerts)

| Aspect | Détail |
|--------|--------|
| **Accès** | Via GitHub REST API |
| **Auth** | Token GitHub avec scope `security_events` |
| **Nouveauté 2026** | Assignation d'alertes via API |

#### Endpoints pour vos besoins

| Besoin | Endpoint | Méthode |
|--------|----------|---------|
| **Alertes repo** | `/repos/{owner}/{repo}/dependabot/alerts` | GET |
| **Alertes org** | `/orgs/{org}/dependabot/alerts` | GET |
| **Détail alerte** | `/repos/{owner}/{repo}/dependabot/alerts/{alert_number}` | GET |

#### Filtres disponibles

| Paramètre | Valeurs | Usage |
|-----------|---------|-------|
| `state` | open, dismissed, fixed | Filtrer par statut |
| `severity` | low, medium, high, critical | Filtrer par criticité |
| `sort` | created, updated | Tri |
| `direction` | asc, desc | Ordre |
| `per_page` | 1-100 | Pagination |

#### Exemples concrets

**Vulnérabilités critiques ouvertes:**
```bash
curl -H "Authorization: Bearer {TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/{owner}/{repo}/dependabot/alerts?state=open&severity=critical,high"
```

**Vulnérabilités résolues (fixées):**
```bash
curl -H "Authorization: Bearer {TOKEN}" \
  "https://api.github.com/repos/{owner}/{repo}/dependabot/alerts?state=fixed&per_page=100"
```

**Toutes les alertes de l'organisation:**
```bash
curl -H "Authorization: Bearer {TOKEN}" \
  "https://api.github.com/orgs/{org}/dependabot/alerts?state=open"
```

#### Réponse type

```json
{
  "number": 42,
  "state": "open",
  "dependency": {
    "package": {
      "ecosystem": "npm",
      "name": "lodash"
    },
    "manifest_path": "package.json"
  },
  "security_advisory": {
    "severity": "critical",
    "summary": "Prototype Pollution in lodash",
    "cve_id": "CVE-2021-23337"
  },
  "security_vulnerability": {
    "severity": "critical",
    "vulnerable_version_range": "< 4.17.21",
    "first_patched_version": {
      "identifier": "4.17.21"
    }
  },
  "created_at": "2026-02-10T08:00:00Z",
  "fixed_at": null
}
```

#### Pour le dashboard

- **Ouvertes vs Résolues:** Compter `state=open` vs `state=fixed`
- **Par criticité:** Filtrer par `severity`
- **Temps de correction:** Calculer `fixed_at - created_at` pour les alertes fixées

**Sources:**
- [Dependabot Alerts API](https://docs.github.com/en/rest/dependabot/alerts)
- [Viewing Dependabot Alerts](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/viewing-and-updating-dependabot-alerts)

---

### 4. Jira

**Documentation:** [developer.atlassian.com/cloud/jira/platform/rest/v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

| Aspect | Détail |
|--------|--------|
| **Version API** | v3 (Cloud) |
| **Auth** | Basic Auth avec API Token (recommandé) ou OAuth 2.0 |
| **Création token** | [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens) |
| **Base URL** | `https://{your-domain}.atlassian.net/rest/api/3/` |
| **Endpoint recherche** | `/rest/api/3/search/jql` (GET ou POST) |

**⚠️ Note:** Tokens API expirent entre mars et mai 2026 - à renouveler.

#### Endpoints pour vos besoins

| Besoin | Endpoint | Méthode |
|--------|----------|---------|
| **Recherche JQL** | `/rest/api/3/search/jql` | GET/POST |
| **Détail ticket** | `/rest/api/3/issue/{issueIdOrKey}` | GET |
| **Changelog ticket** | `/rest/api/3/issue/{issueIdOrKey}/changelog` | GET |

#### Requêtes JQL utiles

| Besoin | JQL |
|--------|-----|
| **Bugs créés ce mois** | `project=PROJ AND type=Bug AND created >= startOfMonth()` |
| **Bugs résolus ce mois** | `project=PROJ AND type=Bug AND resolved >= startOfMonth()` |
| **Bugs créés mois dernier** | `project=PROJ AND type=Bug AND created >= startOfMonth(-1) AND created < startOfMonth()` |
| **Tickets liés Sentry** | `project=PROJ AND labels = sentry` |
| **En cours** | `project=PROJ AND status = "In Progress"` |

#### Exemples concrets

**Bugs résolus ce mois (encodé URL):**
```bash
curl -u email@domain.com:{API_TOKEN} \
  "https://{domain}.atlassian.net/rest/api/3/search/jql?jql=project%3DPROJ%20AND%20type%3DBug%20AND%20resolved%20%3E%3D%20startOfMonth()&fields=key,summary,status,resolutiondate,created"
```

**Bugs créés ce mois (POST - plus propre):**
```bash
curl -X POST \
  -u email@domain.com:{API_TOKEN} \
  -H "Content-Type: application/json" \
  "https://{domain}.atlassian.net/rest/api/3/search/jql" \
  -d '{
    "jql": "project=PROJ AND type=Bug AND created >= startOfMonth()",
    "fields": ["key", "summary", "status", "created", "resolutiondate"],
    "maxResults": 100
  }'
```

**Tickets liés à Sentry (via label ou lien):**
```bash
curl -u email@domain.com:{API_TOKEN} \
  "https://{domain}.atlassian.net/rest/api/3/search/jql?jql=project%3DPROJ%20AND%20labels%20%3D%20sentry"
```

#### Réponse type

```json
{
  "total": 15,
  "issues": [
    {
      "key": "PROJ-123",
      "fields": {
        "summary": "Fix checkout error on mobile",
        "status": {
          "name": "Done"
        },
        "created": "2026-02-15T10:30:00.000+0000",
        "resolutiondate": "2026-02-20T14:00:00.000+0000",
        "issuetype": {
          "name": "Bug"
        }
      }
    }
  ]
}
```

#### Pour le dashboard

- **Tickets ouverts:** JQL `status != Done`
- **Tickets fermés ce mois:** JQL `resolved >= startOfMonth()`
- **Temps de résolution:** `resolutiondate - created`
- **Vélocité:** Nombre de tickets résolus par semaine/mois

**Sources:**
- [Jira REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Search JQL](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/)
- [JQL Examples](https://developer.atlassian.com/server/jira/platform/jira-rest-api-example-query-issues-6291606/)

---

### 5. Debugbear

**Documentation:** [debugbear.com/docs/api](https://www.debugbear.com/docs/api)

| Aspect | Détail |
|--------|--------|
| **Auth** | API Key (Project Key ou Admin Key) |
| **Création key** | Dashboard > Integrations > API Keys |
| **Format** | Module Node.js (recommandé) ou REST |
| **Métriques** | 130+ métriques synthétiques |

#### Métriques Core Web Vitals disponibles

| Métrique | Description | Seuil Google |
|----------|-------------|--------------|
| **LCP** | Largest Contentful Paint | < 2.5s ✅ |
| **INP** | Interaction to Next Paint (remplace FID) | < 200ms ✅ |
| **CLS** | Cumulative Layout Shift | < 0.1 ✅ |
| **FCP** | First Contentful Paint | < 1.8s |
| **TTFB** | Time to First Byte | < 800ms |
| **TBT** | Total Blocking Time | < 200ms |

#### Utilisation Node.js (recommandé)

```javascript
const debugbear = require('debugbear');
debugbear.setApiKey('YOUR_API_KEY');

// Récupérer les données d'une page
const pageData = await debugbear.pages.get(pageId);

// Récupérer l'historique des tests
const history = await debugbear.pages.getResults(pageId, {
  from: '2026-02-01',
  to: '2026-03-01'
});

// Déclencher un nouveau test
const result = await debugbear.analyze(pageId);
```

#### Données récupérables

```javascript
// Structure de réponse
{
  "pageId": "abc123",
  "url": "https://example.com/",
  "results": [
    {
      "timestamp": "2026-03-08T10:00:00Z",
      "metrics": {
        "largestContentfulPaint": 2100,  // ms
        "cumulativeLayoutShift": 0.05,
        "interactionToNextPaint": 150,   // ms
        "firstContentfulPaint": 1200,
        "timeToFirstByte": 450,
        "totalBlockingTime": 180
      },
      "scores": {
        "performance": 85,
        "accessibility": 92,
        "bestPractices": 100,
        "seo": 98
      }
    }
  ]
}
```

#### Export CSV

DebugBear permet aussi l'export CSV de toutes les données collectées pour import dans votre SGBD.

#### Pour le dashboard

- **LCP moyen:** Moyenne de `largestContentfulPaint` sur la période
- **CLS moyen:** Moyenne de `cumulativeLayoutShift`
- **INP moyen:** Moyenne de `interactionToNextPaint`
- **Tendance:** Comparer moyennes M vs M-1
- **Alertes:** Détecter si valeurs > seuils Google

**Sources:**
- [DebugBear API Documentation](https://www.debugbear.com/docs/api)
- [Core Web Vitals Metrics](https://www.debugbear.com/docs/core-web-vitals-metrics)
- [Synthetic Monitoring Metrics](https://www.debugbear.com/docs/synthetic-monitoring-metrics)

---

### 6. Treo.sh

**Documentation:** [treo.sh](https://treo.sh/) (documentation limitée)

| Aspect | Détail |
|--------|--------|
| **API** | REST API JSON disponible |
| **Export** | CSV ou API pour intégration |
| **Données** | Lighthouse + CrUX (Chrome UX Report) |
| **Intégrations** | GitHub, Slack, CI/CD |

#### Fonctionnalités

| Type | Description |
|------|-------------|
| **Lighthouse** | Tests synthétiques automatisés |
| **CrUX Data** | Données réelles utilisateurs Chrome |
| **Scores** | Performance, Accessibility, SEO, Best Practices, PWA |

#### Utilisation API

```bash
# Appel API après chaque déploiement (CI/CD)
curl -X POST "https://treo.sh/api/v1/analyze" \
  -H "Authorization: Bearer {API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/"}'
```

#### Données disponibles

- **Scores Lighthouse:** Performance, Accessibility, SEO, Best Practices
- **Core Web Vitals:** LCP, CLS, FID/INP (via CrUX)
- **Comparaison automatique** avec runs précédents
- **Alertes régression** configurables

#### Export

- **CSV:** Export manuel depuis dashboard
- **API JSON:** Récupération programmatique des données

#### Pour le dashboard

⚠️ **Documentation API limitée** - Recommandations :
1. Tester l'API avec un compte trial
2. Contacter support Treo pour documentation complète
3. Alternative : utiliser l'export CSV et l'importer périodiquement

**Sources:**
- [Treo.sh](https://treo.sh/)
- [Treo Medium - Introduction](https://medium.com/@treo/treo-lighthouse-as-a-service-55cb9b72e8c3)
- [Treo GitHub](https://github.com/treosh)

---

### 7. Google Search Console

**Documentation:** [developers.google.com/webmaster-tools](https://developers.google.com/webmaster-tools)

| Aspect | Détail |
|--------|--------|
| **Version API** | v1 |
| **Auth** | OAuth 2.0 (⚠️ le plus complexe) |
| **Base URL** | `https://www.googleapis.com/webmasters/v3/` |
| **Rate Limits** | URL Inspection: 2000/jour, 600/min |

#### Configuration OAuth 2.0 (prérequis)

1. Créer projet sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activer "Search Console API"
3. Créer credentials OAuth 2.0 (type "Application Web")
4. Configurer les URI de redirection
5. Implémenter le flow d'autorisation pour obtenir access_token

#### Endpoints pour vos besoins

| Besoin | Endpoint | Méthode |
|--------|----------|---------|
| **Search Analytics** | `/sites/{siteUrl}/searchAnalytics/query` | POST |
| **URL Inspection** | `/v1/urlInspection/index:inspect` | POST |
| **Liste sites** | `/sites` | GET |
| **Sitemaps** | `/sites/{siteUrl}/sitemaps` | GET |

#### Exemples concrets

**Données Search Analytics (clics, impressions):**
```bash
curl -X POST \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fexample.com/searchAnalytics/query" \
  -d '{
    "startDate": "2026-02-01",
    "endDate": "2026-02-28",
    "dimensions": ["date"],
    "rowLimit": 100
  }'
```

**Inspection URL (statut indexation):**
```bash
curl -X POST \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect" \
  -d '{
    "inspectionUrl": "https://example.com/page",
    "siteUrl": "https://example.com/"
  }'
```

#### Réponse Search Analytics

```json
{
  "rows": [
    {
      "keys": ["2026-02-15"],
      "clicks": 1250,
      "impressions": 45000,
      "ctr": 0.0278,
      "position": 8.5
    }
  ]
}
```

#### Réponse URL Inspection

```json
{
  "inspectionResult": {
    "indexStatusResult": {
      "verdict": "PASS",
      "coverageState": "Indexed, not submitted in sitemap",
      "robotsTxtState": "ALLOWED",
      "indexingState": "INDEXING_ALLOWED",
      "lastCrawlTime": "2026-03-01T10:30:00Z"
    }
  }
}
```

#### Pour le dashboard

| Métrique | Source | Calcul |
|----------|--------|--------|
| **Erreurs indexation** | URL Inspection | Compter `verdict != PASS` |
| **Pages indexées** | URL Inspection | Compter `coverageState = Indexed` |
| **Clics/Impressions** | Search Analytics | Somme sur période |
| **Position moyenne** | Search Analytics | Moyenne `position` |

⚠️ **Limitation:** L'API URL Inspection a des quotas stricts (2000/jour). Pour un grand site, prioriser les pages importantes.

**Sources:**
- [Search Console API](https://developers.google.com/webmaster-tools)
- [URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult)
- [Search Analytics Query](https://developers.google.com/webmaster-tools/v1/api_reference_index)

---

### 8. Datadog APM

**Documentation:** [docs.datadoghq.com/api/latest](https://docs.datadoghq.com/api/latest/)

| Aspect | Détail |
|--------|--------|
| **Auth** | API Key + Application Key (2 clés requises) |
| **Headers** | `DD-API-KEY` + `DD-APPLICATION-KEY` |
| **Création keys** | Organization Settings > API Keys / Application Keys |
| **Base URL** | `https://api.datadoghq.com/api/` |

#### Métriques APM disponibles

| Métrique | Namespace | Description |
|----------|-----------|-------------|
| **Durée requête** | `trace.{span.name}.duration` | Temps de réponse |
| **Hits** | `trace.{span.name}.hits` | Nombre de requêtes |
| **Errors** | `trace.{span.name}.errors` | Nombre d'erreurs |
| **Duration p50/p75/p90/p95/p99** | `trace.{span.name}.duration.by.{percentile}` | Percentiles latence |

#### Endpoints pour vos besoins

| Besoin | Endpoint | Méthode |
|--------|----------|---------|
| **Requête métriques** | `/v1/query` | GET |
| **Liste métriques** | `/v1/metrics` | GET |
| **Métriques actives** | `/v1/metrics?from={timestamp}` | GET |

#### Exemples concrets

**Temps de réponse API moyen (30 derniers jours):**
```bash
curl -G "https://api.datadoghq.com/api/v1/query" \
  -H "DD-API-KEY: {API_KEY}" \
  -H "DD-APPLICATION-KEY: {APP_KEY}" \
  --data-urlencode "from=$(date -d '30 days ago' +%s)" \
  --data-urlencode "to=$(date +%s)" \
  --data-urlencode "query=avg:trace.web.request.duration{service:my-api}"
```

**P95 latence par service:**
```bash
curl -G "https://api.datadoghq.com/api/v1/query" \
  -H "DD-API-KEY: {API_KEY}" \
  -H "DD-APPLICATION-KEY: {APP_KEY}" \
  --data-urlencode "from=$(date -d '30 days ago' +%s)" \
  --data-urlencode "to=$(date +%s)" \
  --data-urlencode "query=p95:trace.web.request.duration{service:my-api}"
```

**Durée requêtes SQL (si tracé):**
```bash
curl -G "https://api.datadoghq.com/api/v1/query" \
  -H "DD-API-KEY: {API_KEY}" \
  -H "DD-APPLICATION-KEY: {APP_KEY}" \
  --data-urlencode "from=$(date -d '30 days ago' +%s)" \
  --data-urlencode "to=$(date +%s)" \
  --data-urlencode "query=avg:trace.sql.query.duration{service:my-api}"
```

**Nombre d'erreurs:**
```bash
curl -G "https://api.datadoghq.com/api/v1/query" \
  -H "DD-API-KEY: {API_KEY}" \
  -H "DD-APPLICATION-KEY: {APP_KEY}" \
  --data-urlencode "from=$(date -d '30 days ago' +%s)" \
  --data-urlencode "to=$(date +%s)" \
  --data-urlencode "query=sum:trace.web.request.errors{service:my-api}.as_count()"
```

#### Réponse type

```json
{
  "status": "ok",
  "series": [
    {
      "metric": "trace.web.request.duration",
      "pointlist": [
        [1709251200000, 0.245],  // timestamp, valeur en secondes
        [1709337600000, 0.238],
        [1709424000000, 0.252]
      ],
      "scope": "service:my-api",
      "expression": "avg:trace.web.request.duration{service:my-api}"
    }
  ]
}
```

#### Syntaxe de requête

```
{aggregation}:{metric_name}{filters}

Exemples:
- avg:trace.web.request.duration{service:my-api}      # Moyenne
- p95:trace.web.request.duration{service:my-api}      # Percentile 95
- sum:trace.web.request.hits{service:my-api}.as_count() # Somme (comptage)
```

#### Pour le dashboard

| Métrique | Requête Datadog |
|----------|-----------------|
| **Temps réponse moyen** | `avg:trace.web.request.duration{service:X}` |
| **P95 latence** | `p95:trace.web.request.duration{service:X}` |
| **P99 latence** | `p99:trace.web.request.duration{service:X}` |
| **Durée SQL moyenne** | `avg:trace.sql.query.duration{service:X}` |
| **Taux d'erreur** | `sum:trace.web.request.errors{service:X}.as_count()` |

**Sources:**
- [Datadog API Reference](https://docs.datadoghq.com/api/latest/)
- [Trace Metrics](https://docs.datadoghq.com/tracing/metrics/metrics_namespace/)
- [APM Metrics](https://docs.datadoghq.com/tracing/metrics/)
- [Query Syntax](https://docs.datadoghq.com/tracing/trace_explorer/query_syntax/)

---

## Couverture de tests (PHPUnit / Cypress)

Ces données ne viennent pas d'APIs externes mais de votre **CI/CD**.

### Options pour récupérer la couverture

| Source | Méthode | Complexité |
|--------|---------|------------|
| **GitHub Actions Artifacts** | API GitHub | ⭐ Facile |
| **Codecov** | API Codecov | ⭐ Facile |
| **SonarQube** | API SonarQube | ⭐⭐ Moyen |
| **Push direct vers SGBD** | Script CI custom | ⭐⭐ Moyen |

### Option 1 : GitHub Actions Artifacts (recommandé)

#### Configuration CI (PHPUnit)

```yaml
# .github/workflows/tests.yml
- name: Run PHPUnit with coverage
  run: ./vendor/bin/phpunit --coverage-clover coverage.xml
  env:
    XDEBUG_MODE: coverage

- name: Upload coverage artifact
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report-backend
    path: coverage.xml
    retention-days: 90
```

#### Configuration CI (Cypress)

```yaml
- name: Run Cypress with coverage
  run: npx cypress run --env coverage=true

- name: Upload coverage artifact
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report-frontend
    path: coverage/lcov.info
    retention-days: 90
```

#### Récupération via GitHub API

**Lister les artifacts d'un repo:**
```bash
curl -H "Authorization: Bearer {TOKEN}" \
  "https://api.github.com/repos/{owner}/{repo}/actions/artifacts?per_page=100"
```

**Télécharger un artifact:**
```bash
curl -L -H "Authorization: Bearer {TOKEN}" \
  "https://api.github.com/repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip" \
  -o coverage.zip
```

### Option 2 : Push direct vers SGBD (plus robuste)

Modifier le workflow CI pour envoyer directement les données :

```yaml
- name: Parse and push coverage
  run: |
    COVERAGE=$(grep -oP 'lines-covered="\K[^"]+' coverage.xml)
    TOTAL=$(grep -oP 'lines-valid="\K[^"]+' coverage.xml)
    PERCENT=$(echo "scale=2; $COVERAGE * 100 / $TOTAL" | bc)

    curl -X POST "https://your-dashboard-api.com/coverage" \
      -H "Content-Type: application/json" \
      -d "{
        \"repo\": \"${{ github.repository }}\",
        \"branch\": \"${{ github.ref_name }}\",
        \"type\": \"backend\",
        \"coverage\": $PERCENT,
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
      }"
```

### Réponse GitHub Artifacts API

```json
{
  "artifacts": [
    {
      "id": 123456789,
      "name": "coverage-report-backend",
      "size_in_bytes": 45678,
      "created_at": "2026-03-08T10:30:00Z",
      "workflow_run": {
        "id": 987654321,
        "head_branch": "main"
      }
    }
  ]
}
```

### Pour le dashboard

| Métrique | Source | Méthode |
|----------|--------|---------|
| **Couverture Backend %** | PHPUnit coverage.xml | Parser `lines-covered / lines-valid` |
| **Couverture Frontend %** | Cypress lcov.info | Parser `LF:` et `LH:` |
| **Tendance** | Historique artifacts | Comparer dernier run vs runs précédents |

**Sources:**
- [GitHub Artifacts API](https://docs.github.com/en/rest/actions/artifacts)
- [PHPUnit Coverage](https://about.codecov.io/blog/measuring-php-code-coverage-with-phpunit-and-github-actions/)
- [Codecov Action](https://github.com/getsentry/codecov-action)

---

---

## Récapitulatif : Endpoints par besoin du dashboard

### 🔴 Axe Stabilité

| Besoin | Outil | Endpoint | Requête |
|--------|-------|----------|---------|
| Nouvelles erreurs mois | Sentry | `/projects/{org}/{project}/issues/` | `?statsPeriod=30d&query=is:unresolved` |
| Erreurs résolues mois | Sentry | `/projects/{org}/{project}/issues/` | `?statsPeriod=30d&query=is:resolved` |
| Tickets bugs ouverts | Jira | `/rest/api/3/search/jql` | JQL: `type=Bug AND status != Done` |
| Tickets bugs fermés mois | Jira | `/rest/api/3/search/jql` | JQL: `type=Bug AND resolved >= startOfMonth()` |

### ⚡ Axe Performance

| Besoin | Outil | Endpoint | Requête |
|--------|-------|----------|---------|
| LCP moyen | Debugbear | Node API `pages.getResults()` | Période 30j |
| CLS moyen | Debugbear | Node API `pages.getResults()` | Période 30j |
| INP moyen | Debugbear | Node API `pages.getResults()` | Période 30j |
| Temps réponse API | Datadog | `/v1/query` | `avg:trace.web.request.duration{service:X}` |
| P95 latence | Datadog | `/v1/query` | `p95:trace.web.request.duration{service:X}` |
| Durée SQL | Datadog | `/v1/query` | `avg:trace.sql.query.duration{service:X}` |

### 🔒 Axe Sécurité

| Besoin | Outil | Endpoint | Requête |
|--------|-------|----------|---------|
| Vulnérabilités ouvertes | Dependabot | `/repos/{owner}/{repo}/dependabot/alerts` | `?state=open` |
| Vulnérabilités critiques | Dependabot | `/repos/{owner}/{repo}/dependabot/alerts` | `?state=open&severity=critical,high` |
| Vulnérabilités résolues | Dependabot | `/repos/{owner}/{repo}/dependabot/alerts` | `?state=fixed` |

### ✅ Axe Qualité

| Besoin | Outil | Endpoint | Requête |
|--------|-------|----------|---------|
| Couverture backend | GitHub Actions | `/repos/{owner}/{repo}/actions/artifacts` | Derniers artifacts PHPUnit |
| Couverture frontend | GitHub Actions | `/repos/{owner}/{repo}/actions/artifacts` | Derniers artifacts Cypress |
| Erreurs indexation | GSC | URL Inspection API | Batch d'URLs importantes |
| Pages indexées | GSC | Search Analytics | `dimensions: ["page"]` |

### 📍 Annotations MEP

| Besoin | Outil | Endpoint | Requête |
|--------|-------|----------|---------|
| Liste releases | GitHub | `/repos/{owner}/{repo}/releases` | `?per_page=30` |
| Tags | GitHub | `/repos/{owner}/{repo}/tags` | `?per_page=50` |

---

## Recommandations d'implémentation

### Ordre d'intégration suggéré (par complexité)

1. **GitHub** (releases + Dependabot) - 1 token, 2 sources ✅
2. **Sentry** - Simple Bearer token ✅
3. **Debugbear** - API Key simple ✅
4. **Datadog** - Double key mais bien documenté ✅
5. **Jira** - Basic auth, attention expiration tokens ⚠️
6. **Treo.sh** - Documentation limitée, tester d'abord ⚠️
7. **Google Search Console** - OAuth 2.0 complexe, garder pour la fin ⚠️

### Architecture suggérée

```
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Symfony?)                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Sentry  │ │ GitHub  │ │ Datadog │ │   GSC   │  ...  │
│  │Connector│ │Connector│ │Connector│ │Connector│       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
│       └──────────┬┴──────────┬┴───────────┘            │
│                  ▼           ▼                          │
│            ┌─────────────────────┐                     │
│            │   Data Aggregator   │                     │
│            └──────────┬──────────┘                     │
│                       ▼                                 │
│            ┌─────────────────────┐                     │
│            │   SGBD (TimescaleDB)│                     │
│            └──────────┬──────────┘                     │
│                       ▼                                 │
│            ┌─────────────────────┐                     │
│            │    REST API JSON    │                     │
│            └─────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (Nuxt.js)                     │
│                    Dashboard UI                          │
└─────────────────────────────────────────────────────────┘
```

---

## Prochaines étapes

- [ ] Créer les tokens/API keys pour chaque service
- [ ] POC : tester chaque endpoint manuellement (Postman/curl)
- [ ] Valider les rate limits en conditions réelles
- [ ] Choisir SGBD (TimescaleDB recommandé pour time-series)
- [ ] Définir schéma de données unifié

---

*Document généré le 2026-03-09*
