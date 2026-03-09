---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Supabase comme stockage et moteur d''API pour le MVP'
research_goals: 'Évaluer la pertinence de Supabase pour le MVP de platform-monitoring'
user_name: 'JG'
date: '2026-03-09'
web_research_enabled: true
source_verification: true
---

# Rapport de Recherche Technique : Supabase pour le MVP Platform-Monitoring

**Date :** 2026-03-09
**Auteur :** JG
**Type de recherche :** Technique
**Projet :** platform-monitoring

---

## Résumé Exécutif

Supabase est une **option fortement recommandée** pour le MVP de platform-monitoring, offrant un excellent rapport vitesse de développement / fonctionnalités. La plateforme fournit une base PostgreSQL managée avec APIs auto-générées, authentification intégrée, et capacités temps réel - le tout dans un tier gratuit généreux adapté au prototypage.

**Verdict : ✅ RECOMMANDÉ pour le MVP** avec migration vers Pro ($25/mois) prévue avant mise en production.

---

## 1. Architecture Supabase

### 1.1 Composants Principaux

Supabase est construit sur une architecture en trois couches fondamentales :

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **Database** | PostgreSQL | Base de données relationnelle complète |
| **API REST** | PostgREST | API auto-générée depuis le schéma |
| **API GraphQL** | pg_graphql | Extension PostgreSQL pour GraphQL |
| **Auth** | GoTrue | Authentification et autorisation |
| **Realtime** | Elixir/Phoenix | WebSockets pour temps réel |
| **Storage** | S3-compatible | Stockage de fichiers |
| **Edge Functions** | Deno | Fonctions serverless |
| **Gateway** | Kong | Routage et rate limiting |

_Source : [Supabase Architecture Docs](https://supabase.com/docs/guides/getting-started/architecture)_

### 1.2 PostgREST et API Auto-générée

L'API REST est **instantanée et auto-générée** : chaque modification de schéma est immédiatement accessible via l'API sans code backend personnalisé.

**Performance PostgREST v14 (2025-2026) :**
- ~20% d'amélioration du throughput pour les requêtes GET
- Temps de chargement du cache de schéma : de 7 minutes à 2 secondes sur bases complexes

_Source : [Supabase PostgREST Features](https://supabase.com/features/auto-generated-rest-api)_

### 1.3 Pertinence pour Platform-Monitoring

Pour une plateforme de monitoring, l'architecture Supabase est particulièrement adaptée :
- **Ingestion de métriques** : PostgreSQL gère bien les séries temporelles avec extensions (timescaledb compatible)
- **API instantanée** : Pas besoin de coder des endpoints CRUD
- **Realtime** : Alertes et dashboards en temps réel natifs

---

## 2. Comparaison avec les Alternatives

### 2.1 Supabase vs Firebase vs PlanetScale

| Critère | Supabase | Firebase | PlanetScale |
|---------|----------|----------|-------------|
| **Base de données** | PostgreSQL (relationnel) | Firestore (NoSQL) | MySQL (Vitess) |
| **Tier gratuit** | ✅ Généreux (500MB) | ✅ Bon | ❌ Supprimé en 2024 |
| **Open Source** | ✅ Oui | ❌ Non | ❌ Non |
| **Vector Search (AI)** | ✅ pgvector natif | ❌ Non | ❌ Non |
| **Auth intégrée** | ✅ Oui | ✅ Oui | ❌ Non |
| **Realtime** | ✅ Oui | ✅ Oui | ❌ Non |
| **Self-hosting** | ✅ Possible | ❌ Non | ❌ Non |

_Sources : [Supabase vs Firebase vs PlanetScale](https://www.getmonetizely.com/articles/supabase-vs-firebase-vs-planetscale-which-backend-as-a-service-is-right-for-your-budget), [Best Database 2025](https://www.houseofloops.com/blog/best-database-tools-2025)_

### 2.2 Pourquoi Supabase pour Platform-Monitoring

**Avantages décisifs :**
1. **PostgreSQL** : Requêtes complexes, jointures, agrégations pour métriques
2. **pgvector** : Si intégration future d'analyse AI des logs/métriques
3. **Open Source** : Pas de vendor lock-in total, possibilité de migration
4. **Tier gratuit** : Idéal pour MVP sans investissement initial

**Firebase serait inadapté** car Firestore (NoSQL) complique les requêtes d'agrégation typiques du monitoring.

---

## 3. Pricing et Tier Gratuit

### 3.1 Plans Disponibles (2026)

| Plan | Prix | Database | Storage | MAUs | API Requests |
|------|------|----------|---------|------|--------------|
| **Free** | $0 | 500 MB | 1 GB | 50,000 | Illimité |
| **Pro** | $25/mois | 8 GB | 100 GB | 100,000 | Illimité |
| **Team** | $599/mois | 8 GB | 100 GB | 100,000 | + Support prioritaire |

_Source : [Supabase Pricing](https://supabase.com/pricing), [Supabase Pricing Breakdown 2026](https://uibakery.io/blog/supabase-pricing)_

### 3.2 Limitations Critiques du Tier Gratuit

⚠️ **ATTENTION - Limitation majeure :**

> **Les projets Free sans requêtes API pendant 1 semaine sont automatiquement mis en pause.**

Cela signifie :
- ✅ OK pour développement actif
- ✅ OK pour démos avec trafic régulier
- ❌ PROBLÉMATIQUE pour MVP exposé à des utilisateurs réels

**Autres limitations Free :**
- 2 projets actifs maximum
- Pas de backups automatiques
- Pas de SLA
- CPU partagée

### 3.3 Recommandation Pricing MVP

| Phase | Plan Recommandé | Coût |
|-------|-----------------|------|
| Prototypage/Dev | Free | $0 |
| Beta privée | Free | $0 |
| Launch public | **Pro** | $25/mois |

**Le Pro est nécessaire dès qu'il y a des utilisateurs réels** pour éviter la pause automatique et bénéficier des backups.

---

## 4. Row Level Security (RLS) et Authentification

### 4.1 Fonctionnement RLS

Supabase permet de définir des règles de sécurité **directement au niveau PostgreSQL** :

```sql
-- Exemple : Utilisateurs ne voient que leurs propres métriques
CREATE POLICY "Users see own metrics" ON metrics
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Helpers intégrés :**
- `auth.uid()` : ID de l'utilisateur connecté
- `auth.jwt()` : Claims JWT complets

_Source : [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)_

### 4.2 Best Practices RLS

| Pratique | Description |
|----------|-------------|
| **Indexer les colonnes RLS** | Top cause de problèmes de performance |
| **Éviter USING (true)** | Trop permissif, spécifier les conditions |
| **Tester côté client** | SQL Editor bypass RLS |
| **Spécifier TO authenticated** | Évite exécution pour anon |
| **Toujours pairer RLS + policy** | RLS sans policy = résultats vides |

### 4.3 Pertinence pour Platform-Monitoring

Pour une plateforme multi-tenant de monitoring :
- ✅ **Isolation des données par organisation** via RLS
- ✅ **Auth intégrée** (email, OAuth, SSO sur plans payants)
- ⚠️ **Performance** : Indexer `organization_id` sur toutes les tables de métriques

---

## 5. Realtime et Subscriptions

### 5.1 Modes de Fonctionnement

| Mode | Use Case | Scalabilité |
|------|----------|-------------|
| **Broadcast** | Messages entre clients | ✅ Horizontale |
| **Presence** | Qui est en ligne | ✅ Horizontale |
| **Postgres Changes** | Sync base de données | ⚠️ Single-threaded |

_Source : [Supabase Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks)_

### 5.2 Limitations Critiques

⚠️ **Postgres Changes ne scale pas horizontalement :**

> Chaque changement est vérifié pour chaque abonné. 100 utilisateurs abonnés = 100 "reads" par insert.

**Recommandation :** Pour le monitoring temps réel à l'échelle :
1. Utiliser **Broadcast** avec database triggers
2. Ou **Postgres Changes** pour tables à faible volume uniquement

### 5.3 Pricing Realtime

- $2.50 par million de messages
- Facturation sur messages + connexions peak

### 5.4 Pour Platform-Monitoring

| Fonctionnalité | Approche Recommandée |
|----------------|---------------------|
| Alertes temps réel | Broadcast via triggers |
| Dashboard live | Broadcast avec polling fallback |
| Sync état utilisateur | Postgres Changes (faible volume) |

---

## 6. Edge Functions (Serverless)

### 6.1 Capacités

- Runtime : **Deno**
- Déploiement : Global edge network
- Cold start : ~200-500ms typique

### 6.2 Limitations

| Limite | Valeur |
|--------|--------|
| CPU time max | **2 secondes** |
| Timeout request | 150 secondes |
| Taille bundle | 20 MB |
| Mémoire | Limitée (non spécifiée publiquement) |

_Source : [Edge Functions Limits](https://supabase.com/docs/guides/functions/limits)_

### 6.3 Use Cases pour Platform-Monitoring

✅ **Adaptés :**
- Webhooks entrants (réception alertes externes)
- Transformations de données légères
- Intégrations tierces (Slack, email)

❌ **À éviter :**
- Agrégations lourdes de métriques
- Processing de logs volumineux
- Tâches de plus de 2s CPU

---

## 7. Limitations Connues de Supabase

### 7.1 Limitations Techniques

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **Pas de transactions client** | ACID complexe impossible via SDK | Utiliser stored procedures |
| **RLS performance** | Lent sans index | Indexer systématiquement |
| **Realtime single-thread** | Scale limité | Utiliser Broadcast |
| **Export schéma restreint** | Vendor lock-in partiel | Migrations versionnées |

_Source : [Supabase Limitations Discussion](https://github.com/orgs/supabase/discussions/6512)_

### 7.2 Limitations Opérationnelles

- **Parité local/cloud incomplète** : Comportements différents possibles
- **Backups Storage absents** : Seule la DB est backupée, pas les buckets
- **Support Free limité** : Communauté uniquement

### 7.3 Points d'Attention pour Platform-Monitoring

| Risque | Probabilité | Mitigation |
|--------|-------------|------------|
| Volume données élevé | Moyenne | Partitioning, archivage, ou TimescaleDB |
| Queries complexes lentes | Moyenne | Indexes, vues matérialisées |
| Vendor lock-in | Faible | Open source, migrations SQL |

---

## 8. Self-Hosting vs Cloud

### 8.1 Comparaison

| Critère | Cloud Supabase | Self-Hosted |
|---------|----------------|-------------|
| **Setup** | Instantané | Complexe |
| **Maintenance** | Gérée | À votre charge |
| **Backups** | Automatiques | À configurer |
| **Coût fixe** | Non (usage-based) | Oui (VPS) |
| **Multi-projets** | $25+/projet | Illimité |
| **Latence** | Régions limitées | Personnalisable |

_Source : [Self-Hosting Docs](https://supabase.com/docs/guides/self-hosting)_

### 8.2 Recommandation pour MVP

**Cloud Supabase** est recommandé car :
- Zero ops pour le MVP
- Focus sur le produit, pas l'infra
- Coût prévisible ($0 → $25)

Le self-hosting ne devient pertinent que si :
- Compliance stricte (GDPR, data residency)
- 5+ projets simultanés
- Latence critique (<1ms)

---

## 9. Monitoring de Supabase lui-même

### 9.1 Métriques Disponibles

Supabase expose ~200 métriques Prometheus :
- CPU, IO, WAL database
- Connexions, queries
- API latency
- Auth events
- Realtime stats

### 9.2 Intégrations

| Outil | Support |
|-------|---------|
| Grafana | ✅ Dashboards prêts |
| Datadog | ✅ Intégration native |
| Prometheus | ✅ Export natif |
| OpenTelemetry | ✅ Logs, metrics, traces |

_Source : [Supabase Metrics API](https://supabase.com/docs/guides/telemetry/metrics)_

---

## 10. Synthèse et Recommandations

### 10.1 Score d'Adéquation

| Critère | Score | Commentaire |
|---------|-------|-------------|
| Rapidité de développement | ⭐⭐⭐⭐⭐ | API auto-générée, Auth intégrée |
| Coût MVP | ⭐⭐⭐⭐⭐ | Tier gratuit généreux |
| Scalabilité | ⭐⭐⭐⭐ | Bon, attention au Realtime |
| Flexibilité requêtes | ⭐⭐⭐⭐⭐ | PostgreSQL complet |
| Vendor lock-in | ⭐⭐⭐⭐ | Open source, migrations possibles |
| Support communauté | ⭐⭐⭐⭐ | Actif, documentation riche |

**Score global : 4.5/5 - Excellent choix pour MVP**

### 10.2 Architecture Recommandée pour Platform-Monitoring

```
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE CLOUD                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL │  │    Auth     │  │   Edge Functions    │  │
│  │  + pgvector │  │   (GoTrue)  │  │  (webhooks, integ)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │              │
│  ┌──────┴────────────────┴────────────────────┴──────┐      │
│  │              PostgREST (API auto-générée)         │      │
│  └───────────────────────────────────────────────────┘      │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────┐      │
│  │          Realtime (Broadcast + Presence)          │      │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js/React)                 │
│  - Dashboard métriques                                      │
│  - Alertes temps réel via Broadcast                         │
│  - Auth via Supabase Auth                                   │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Décisions Clés

| Question | Décision | Justification |
|----------|----------|---------------|
| Utiliser Supabase ? | **OUI** | Idéal pour MVP rapide |
| Quel plan ? | Free → Pro | Free pour dev, Pro dès users réels |
| Realtime ? | Broadcast | Scale mieux que Postgres Changes |
| Edge Functions ? | Oui, limité | Webhooks et intégrations légères |
| Self-host ? | Non pour MVP | Complexité inutile au démarrage |

### 10.4 Risques et Mitigations

| Risque | Mitigation |
|--------|------------|
| Pause automatique (Free) | Passer à Pro avant launch |
| Volume données important | Architecture partitionnée, archivage |
| Realtime scale | Broadcast + triggers, pas Postgres Changes |
| Vendor lock-in | Migrations SQL versionnées, schéma documenté |

### 10.5 Prochaines Étapes

1. **Créer projet Supabase** (tier gratuit)
2. **Définir schéma initial** (organisations, métriques, alertes)
3. **Configurer RLS** (isolation multi-tenant)
4. **Implémenter Auth** (email + OAuth)
5. **Prototyper dashboard** avec Realtime Broadcast
6. **Planifier migration Pro** avant beta publique

---

## Sources Principales

- [Supabase Architecture](https://supabase.com/docs/guides/getting-started/architecture)
- [Supabase Pricing 2026](https://uibakery.io/blog/supabase-pricing)
- [PostgREST Features](https://supabase.com/features/auto-generated-rest-api)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks)
- [Edge Functions Limits](https://supabase.com/docs/guides/functions/limits)
- [Self-Hosting Docs](https://supabase.com/docs/guides/self-hosting)
- [Supabase vs Firebase vs PlanetScale](https://www.getmonetizely.com/articles/supabase-vs-firebase-vs-planetscale-which-backend-as-a-service-is-right-for-your-budget)
- [Supabase Limitations Discussion](https://github.com/orgs/supabase/discussions/6512)
- [Is Supabase Production Ready](https://github.com/orgs/supabase/discussions/28377)
