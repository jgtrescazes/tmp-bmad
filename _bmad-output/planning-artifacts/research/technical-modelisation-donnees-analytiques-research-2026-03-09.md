---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Modélisation des données analytiques'
research_goals: 'Choisir la modélisation adaptée pour platform-monitoring avec axes temporel et agrégation'
user_name: 'JG'
date: '2026-03-09'
web_research_enabled: true
source_verification: true
---

# Modélisation des Données Analytiques pour le Monitoring : Guide Complet de Sélection

**Date:** 2026-03-09
**Auteur:** JG
**Type de recherche:** Technique

---

## Research Overview

Cette recherche technique approfondie analyse les différentes approches de modélisation des données pour l'analyse, avec un focus particulier sur les axes temporel et d'agrégation dans le contexte du projet platform-monitoring. L'étude couvre les schémas dimensionnels (étoile, flocon, Data Vault), les patterns de tables de faits, les stratégies de pré-agrégation et les technologies de bases de données adaptées. Les recommandations finales sont basées sur les meilleures pratiques actuelles de 2026 et les benchmarks de performance des principales solutions du marché.

Pour un résumé exécutif et les recommandations stratégiques, consulter la section [Synthèse et Recommandations](#synthèse-et-recommandations).

---

## Table des Matières

1. [Résumé Exécutif](#résumé-exécutif)
2. [Introduction et Méthodologie](#1-introduction-et-méthodologie)
3. [Approches de Modélisation Dimensionnelle](#2-approches-de-modélisation-dimensionnelle)
4. [Modélisation Temporelle et Granularité](#3-modélisation-temporelle-et-granularité)
5. [Stratégies d'Agrégation et Performance](#4-stratégies-dagrégation-et-performance)
6. [Technologies de Stockage Analytique](#5-technologies-de-stockage-analytique)
7. [Patterns d'Intégration et Architecture](#6-patterns-dintégration-et-architecture)
8. [Synthèse et Recommandations](#7-synthèse-et-recommandations)
9. [Plan d'Implémentation](#8-plan-dimplémentation)
10. [Sources et Références](#9-sources-et-références)

---

## Résumé Exécutif

Cette recherche analyse les approches de modélisation des données analytiques pour un système de monitoring de plateforme, avec focus sur les axes temporel et agrégation. Les conclusions principales orientent vers une architecture hybride combinant le meilleur de chaque approche.

### Conclusions Clés

| Aspect | Recommandation | Justification |
|--------|----------------|---------------|
| **Schéma principal** | Star Schema | Performance de requête 5-10x supérieure, simplicité d'implémentation |
| **Granularité de fait** | Multi-niveau (raw + agrégé) | Flexibilité analytique + performance dashboard |
| **Partitionnement** | Temporel (quotidien/horaire) | Élagage de partition efficace, ingestion 62.7% plus rapide |
| **Base de données** | ClickHouse ou TimescaleDB | Optimisé pour time-series et agrégations massives |
| **Pré-agrégation** | Rollup tables automatisées | Réduction drastique des temps de requête |

### Recommandations Stratégiques

1. **Adopter le schéma en étoile** pour la couche de présentation analytique
2. **Implémenter des tables de faits multi-granularité** (raw, horaire, quotidien)
3. **Utiliser le partitionnement temporel** avec rafraîchissement incrémental
4. **Déployer des rollup tables automatisées** pour les métriques de dashboard
5. **Considérer ClickHouse** pour les volumes élevés ou **TimescaleDB** pour l'écosystème PostgreSQL

---

## 1. Introduction et Méthodologie

### 1.1 Contexte et Objectifs

Le projet **platform-monitoring** nécessite une modélisation de données optimisée pour :
- **Analyse temporelle** : évolution des métriques dans le temps, tendances, comparaisons périodiques
- **Agrégation** : calculs de sommes, moyennes, comptages sur différents niveaux hiérarchiques

### 1.2 Méthodologie de Recherche

**Périmètre technique :**
- Schémas dimensionnels (étoile, flocon, Data Vault)
- Patterns de tables de faits et granularité
- Stratégies de pré-agrégation et rollup
- Technologies de bases de données analytiques

**Sources consultées :**
- Documentation technique officielle (Microsoft, AWS, Oracle)
- Publications académiques et industrielles récentes (2024-2026)
- Benchmarks de performance comparatifs
- Retours d'expérience de projets similaires

---

## 2. Approches de Modélisation Dimensionnelle

### 2.1 Schéma en Étoile (Star Schema)

Le schéma en étoile reste l'approche dominante pour l'analyse en 2026, privilégiant la performance de requête et la simplicité.

**Architecture :**
```
                    ┌─────────────────┐
                    │   DIM_TIME      │
                    │ (Date, Hour,    │
                    │  Day, Month...) │
                    └────────┬────────┘
                             │
┌─────────────────┐    ┌─────┴─────┐    ┌─────────────────┐
│   DIM_METRIC    │────│  FACT_    │────│   DIM_SOURCE    │
│ (metric_name,   │    │ MONITORING│    │ (server, app,   │
│  unit, type)    │    │           │    │  environment)   │
└─────────────────┘    └─────┬─────┘    └─────────────────┘
                             │
                    ┌────────┴────────┐
                    │  DIM_LOCATION   │
                    │ (datacenter,    │
                    │  region, zone)  │
                    └─────────────────┘
```

**Avantages pour le monitoring :**
- Réduction des jointures de 10+ tables à 2-3 tables
- Performance de requête **5-10x plus rapide** que les schémas normalisés
- Intuitivité pour les outils BI (Power BI, Grafana, Metabase)
- Mappage direct aux processus métier

**Bonnes pratiques 2026 :**
> "Préférer le schéma en étoile sauf raison spécifique d'utiliser flocon. Si la source est normalisée, dénormaliser dans la couche de transformation pour créer un schéma en étoile."

_Source: [ThoughtSpot - Star Schema vs Snowflake Schema](https://www.thoughtspot.com/data-trends/data-modeling/star-schema-vs-snowflake-schema)_

### 2.2 Schéma en Flocon (Snowflake Schema)

Le schéma en flocon normalise les dimensions en sous-dimensions hiérarchiques.

**Cas d'utilisation appropriés :**
- Hiérarchies complexes nécessitant une maintenance granulaire
- Contraintes de stockage strictes (rare en 2026)
- Évolutivité des structures dimensionnelles

**Inconvénients pour le monitoring :**
- Complexité des requêtes accrue
- Performance dégradée sur les agrégations
- Coût de stockage économisé rarement justifié

_Source: [DataCamp - Star Schema vs Snowflake Schema](https://www.datacamp.com/blog/star-schema-vs-snowflake-schema)_

### 2.3 Data Vault 2.0

Data Vault offre une approche modulaire orientée audit et traçabilité.

**Architecture en couches :**
```
┌──────────────────────────────────────────────────────────┐
│                    GOLD LAYER                            │
│              (Star Schema pour reporting)                │
├──────────────────────────────────────────────────────────┤
│                   SILVER LAYER                           │
│        (Data Vault - Hubs, Links, Satellites)            │
├──────────────────────────────────────────────────────────┤
│                   BRONZE LAYER                           │
│              (Raw data - staging)                        │
└──────────────────────────────────────────────────────────┘
```

**Composants Data Vault :**
- **Hubs** : Clés métier uniques (serveur, métrique)
- **Links** : Relations entre hubs
- **Satellites** : Attributs et historique

**Recommandation :**
> Data Vault convient à la couche d'intégration (silver) pour l'harmonisation et le tracking historique, tandis que Star Schema est employé dans la couche de présentation (gold) pour les requêtes efficaces.

_Source: [AltexSoft - Data Vault Architecture](https://www.altexsoft.com/blog/data-vault-architecture/)_

### 2.4 Comparaison pour Platform-Monitoring

| Critère | Star Schema | Snowflake | Data Vault |
|---------|-------------|-----------|------------|
| **Performance requêtes** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Simplicité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Flexibilité évolution** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Traçabilité/Audit** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Stockage** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Adapté monitoring** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

**Verdict :** Star Schema recommandé pour platform-monitoring avec option Data Vault en couche intermédiaire si audit requis.

---

## 3. Modélisation Temporelle et Granularité

### 3.1 Types de Tables de Faits

La modélisation temporelle requiert le choix du type de table de faits adapté aux patterns d'analyse.

#### 3.1.1 Transaction Fact Tables
Enregistrent chaque événement individuel au moment où il se produit.

```sql
-- Exemple : fait_monitoring_events
CREATE TABLE fact_monitoring_events (
    event_id BIGINT,
    timestamp TIMESTAMP,
    metric_key INT,
    source_key INT,
    time_key INT,
    value DECIMAL(18,4),
    PRIMARY KEY (event_id)
);
```

**Usage monitoring :** Logs d'événements, alertes, changements d'état.

#### 3.1.2 Periodic Snapshot Fact Tables
Capturent l'état à des intervalles réguliers prédéfinis.

```sql
-- Exemple : fait_metrics_hourly
CREATE TABLE fact_metrics_hourly (
    snapshot_key BIGINT,
    time_key INT,         -- Heure
    metric_key INT,
    source_key INT,
    avg_value DECIMAL(18,4),
    min_value DECIMAL(18,4),
    max_value DECIMAL(18,4),
    count_samples INT,
    PRIMARY KEY (snapshot_key)
);
```

**Usage monitoring :** Métriques de performance, utilisation ressources.

#### 3.1.3 Accumulating Snapshot Fact Tables
Suivent le cycle de vie complet d'un processus.

**Usage monitoring :** Tracking d'incidents, SLA, processus de déploiement.

_Source: [Kimball Group - Fact Tables](https://www.kimballgroup.com/2008/11/fact-tables/)_

### 3.2 Définition du Grain

Le grain définit ce que représente une ligne unique dans la table de faits.

**Principe fondamental :**
> "Déclarer le grain d'abord, puis identifier quelles dimensions s'appliquent à ce grain et quelles mesures numériques appartiennent à la table de faits - cet ordre n'est pas optionnel."

**Stratégie multi-granularité pour monitoring :**

| Table | Grain | Rétention | Usage |
|-------|-------|-----------|-------|
| `fact_metrics_raw` | Par seconde/minute | 7 jours | Debugging, analyse détaillée |
| `fact_metrics_hourly` | Par heure | 90 jours | Tendances, alerting |
| `fact_metrics_daily` | Par jour | 2 ans | Reporting, capacity planning |
| `fact_metrics_monthly` | Par mois | 5+ ans | Historique long terme |

**Important :**
> "Ne jamais mélanger différents grains dans une même table de faits. Quand des tables avec différents grains sont jointes, cela peut causer des comptages dupliqués ou des valeurs manquantes."

_Source: [OWOX - Grain in Fact Table](https://www.owox.com/glossary/grain-in-fact-table)_

### 3.3 Slowly Changing Dimensions (SCD) pour Monitoring

Les dimensions de monitoring évoluent : serveurs renommés, applications migrées, configurations changées.

#### SCD Type 2 - Historique Complet

Recommandé pour le tracking des changements de configuration.

```sql
CREATE TABLE dim_source (
    source_key INT PRIMARY KEY,
    source_id VARCHAR(50),          -- Business key
    server_name VARCHAR(100),
    application VARCHAR(100),
    environment VARCHAR(20),
    configuration JSONB,
    effective_start TIMESTAMP,
    effective_end TIMESTAMP,
    is_current BOOLEAN,
    row_hash VARCHAR(64)            -- Pour détection de changement
);
```

**Avantages :**
- Analyse historique précise ("quelle était la config quand cette alerte s'est déclenchée ?")
- Traçabilité complète des changements
- Support du Change Data Capture (CDC)

_Source: [ThoughtSpot - Slowly Changing Dimensions](https://www.thoughtspot.com/data-trends/data-modeling/slowly-changing-dimensions-in-data-warehouse)_

### 3.4 Partitionnement Temporel

Le partitionnement temporel est crucial pour les performances sur données time-series.

**Stratégies de partitionnement :**

```sql
-- PostgreSQL / TimescaleDB
CREATE TABLE metrics (
    time TIMESTAMPTZ NOT NULL,
    metric_id INT,
    value DOUBLE PRECISION
);

SELECT create_hypertable('metrics', 'time',
    chunk_time_interval => INTERVAL '1 day');

-- Compression automatique
SELECT add_compression_policy('metrics', INTERVAL '7 days');
```

**Bénéfices mesurés :**
- Ingestion **62.7% plus rapide** avec partitionnement
- Taux d'ingestion jusqu'à **1,653,024 métriques/seconde**
- Élagage de partition efficace (partition pruning)
- PostgreSQL 13+ gère des milliers de partitions

_Source: [AWS - Designing High-Performance Time Series Data Tables](https://aws.amazon.com/blogs/database/designing-high-performance-time-series-data-tables-on-amazon-rds-for-postgresql/)_

---

## 4. Stratégies d'Agrégation et Performance

### 4.1 Pré-agrégation et Rollup Tables

La pré-agrégation calcule les métriques résumées à l'avance plutôt qu'à chaque requête.

**Concept :**
> "Au lieu de scanner des milliards d'événements bruts chaque fois que quelqu'un charge un dashboard, maintenir des tables compactes de sommes, comptages et moyennes déjà calculés."

**Architecture rollup :**
```
┌─────────────────────────────────────────────────────────┐
│                    REQUÊTE UTILISATEUR                  │
└─────────────────────────────┬───────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   QUERY ENGINE    │
                    │  (sélection auto  │
                    │   de la table)    │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐    ┌────────▼────────┐    ┌──────▼──────┐
│ rollup_monthly│    │  rollup_daily   │    │ raw_metrics │
│   (< 1K rows) │    │  (< 100K rows)  │    │ (1B+ rows)  │
└───────────────┘    └─────────────────┘    └─────────────┘
```

**Avantages quantifiés :**
- Tables rollup contiennent **significativement moins de lignes** que les tables de faits d'origine
- Sélection automatique de la table appropriée selon les dimensions de requête
- Requêtes traitent des milliers de lignes agrégées au lieu de milliards de lignes brutes

_Source: [Cube.dev - Pre-aggregations](https://cube.dev/docs/reference/data-model/pre-aggregations)_

### 4.2 Continuous Aggregates (TimescaleDB)

Les agrégats continus maintiennent automatiquement les vues pré-agrégées.

```sql
-- Création d'un agrégat continu horaire
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    metric_id,
    source_id,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as sample_count
FROM metrics
GROUP BY bucket, metric_id, source_id;

-- Politique de rafraîchissement automatique
SELECT add_continuous_aggregate_policy('metrics_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

_Source: [TigerData - Best Practices Time-Series Data Modeling](https://www.tigerdata.com/learn/best-practices-time-series-data-modeling-single-or-multiple-partitioned-tables-aka-hypertables)_

### 4.3 Agrégation Incrémentale vs Full Refresh

| Approche | Cas d'usage | Avantages | Inconvénients |
|----------|-------------|-----------|---------------|
| **Incrémentale** | Données append-only | Rapide, économique | Complexité gestion |
| **Full refresh** | Données modifiables | Simple, cohérent | Coûteux en ressources |
| **Hybride** | Monitoring typique | Équilibré | Configuration |

**Bonnes pratiques :**
- Partitionnement pour accélérer build et refresh des pré-agrégations
- Propriété `updateWindow` pour rafraîchir uniquement les dernières partitions
- Rafraîchissement plus rapide et coûts réduits

_Source: [SystemOverflow - Pre-aggregation Patterns](https://www.systemoverflow.com/learn/realtime-analytics-olap/pre-aggregation-patterns/what-is-pre-aggregation)_

### 4.4 OLAP et Opérations Analytiques

Les cubes OLAP fournissent des capacités d'analyse multidimensionnelle avancées.

**Opérations clés :**

| Opération | Description | Exemple monitoring |
|-----------|-------------|-------------------|
| **Drill-down** | Détail croissant | Année → Trimestre → Mois → Jour |
| **Roll-up** | Agrégation croissante | Serveur → Datacenter → Région |
| **Slice** | Coupe sur une dimension | Filtrer sur "Production" |
| **Dice** | Sous-cube multi-dimensions | Prod + Janvier + CPU |
| **Pivot** | Rotation des axes | Métriques en colonnes |

**Hiérarchies temporelles typiques :**
```
Year
  └── Quarter
        └── Month
              └── Week
                    └── Day
                          └── Hour
```

> "Le cube semble avoir les réponses à l'avance car les combinaisons de valeurs sont déjà précalculées. Sans interroger la base OLAP source, le cube peut retourner des réponses pour un large éventail de questions quasi instantanément."

_Source: [Keboola - Understanding OLAP Cubes](https://www.keboola.com/blog/olap-cubes)_

---

## 5. Technologies de Stockage Analytique

### 5.1 Comparaison des Solutions 2026

#### ClickHouse

**Architecture :** Base de données colonaire distribuée, optimisée pour l'analytique en temps réel.

**Forces :**
- Performance exceptionnelle sur agrégations massives
- Compression efficace (10-20x)
- Scaling horizontal natif
- Requêtes sur billions de lignes en secondes

**Modèle de données préféré :**
> "ClickHouse performe mieux avec des données dénormalisées où l'information liée vit dans la même table, pré-joignant les tables et stockant des données redondantes pour réduire la complexité des requêtes."

**Cas d'usage monitoring :** Dashboards temps réel, analyse de logs, métriques haute fréquence.

_Source: [Tinybird - ClickHouse vs TimescaleDB](https://www.tinybird.co/blog/clickhouse-vs-timescaledb)_

#### TimescaleDB

**Architecture :** Extension PostgreSQL optimisée pour les time-series.

**Forces :**
- Compatibilité PostgreSQL complète
- Gère les schémas normalisés efficacement
- Hypertables avec partitionnement automatique
- Continuous aggregates intégrés

**Performance :**
- Lookups single-user en millisecondes single-digit
- Meilleur pour requêtes fetchant des lignes spécifiques

**Cas d'usage monitoring :** Écosystème PostgreSQL existant, jointures complexes, données relationnelles.

_Source: [OneUptime - ClickHouse vs TimescaleDB](https://oneuptime.com/blog/post/2026-01-21-clickhouse-vs-timescaledb/view)_

#### DuckDB

**Architecture :** Base de données analytique embarquée.

**Forces :**
- Zéro configuration, embarqué dans l'application
- Excellent pour développement et prototypage
- Compatible avec Parquet, CSV, JSON
- Performant sur single-node

**Limitations :**
- Limité à un seul nœud
- Pas de distribution native

**Cas d'usage monitoring :** Développement local, analyse ad-hoc, CLI analytics.

_Source: [CloudRaft - ClickHouse vs DuckDB](https://www.cloudraft.io/blog/clickhouse-vs-duckdb)_

### 5.2 Matrice de Décision

| Critère | ClickHouse | TimescaleDB | DuckDB |
|---------|------------|-------------|--------|
| **Volume données** | Très élevé | Moyen-élevé | Moyen |
| **Temps réel** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Complexité jointures** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Écosystème SQL** | Propriétaire | PostgreSQL | Standard |
| **Ops complexity** | Moyenne | Faible | Très faible |
| **Coût** | Moyen | Faible | Très faible |

### 5.3 Recommandation pour Platform-Monitoring

**Scénario A - Volume élevé, temps réel critique :**
→ **ClickHouse** avec schéma dénormalisé

**Scénario B - Écosystème PostgreSQL, jointures complexes :**
→ **TimescaleDB** avec hypertables et continuous aggregates

**Scénario C - Prototype, analyse locale :**
→ **DuckDB** pour développement, migration vers ClickHouse/TimescaleDB en production

---

## 6. Patterns d'Intégration et Architecture

### 6.1 Architecture de Référence

```
┌─────────────────────────────────────────────────────────────────┐
│                         SOURCES                                 │
│  [Prometheus] [Logs] [APM] [Infrastructure] [Custom Metrics]    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   INGESTION   │
                    │  (Kafka/     │
                    │   Vector)     │
                    └───────┬───────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      RAW LAYER (Bronze)                         │
│  fact_events_raw (partitionné par jour, rétention 7j)           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Transformation (dbt / Materialize)
┌───────────────────────────▼─────────────────────────────────────┐
│                   CURATED LAYER (Silver)                        │
│  fact_metrics_hourly │ fact_metrics_daily │ dim_* (SCD Type 2)  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Agrégation / Dénormalisation
┌───────────────────────────▼─────────────────────────────────────┐
│                   SERVING LAYER (Gold)                          │
│  Star Schema optimisé │ Rollup tables │ Materialized views      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
    ┌───────▼───────┐ ┌─────▼─────┐ ┌──────▼──────┐
    │   Grafana     │ │  Alerting │ │   API       │
    │   Dashboards  │ │           │ │   Analytics │
    └───────────────┘ └───────────┘ └─────────────┘
```

### 6.2 Gestion de la Haute Cardinalité

La cardinalité élevée (nombreuses valeurs distinctes) impacte les performances.

**Stratégies de mitigation :**
- Filtrer sur tags basse cardinalité d'abord pour réduire le working set
- Éviter les labels à cardinalité illimitée (IDs utilisateurs, UUIDs)
- Utiliser des rollups qui agrègent les dimensions haute cardinalité

_Source: [Last9 - Performance Impact of High Cardinality](https://last9.io/blog/performance-implications-of-high-cardinality-in-time-series-databases/)_

### 6.3 Pattern de Séparation des Tables

> "Quand les données ne sont pas liées et ne sont pas requêtées ensemble, utiliser des tables séparées est meilleur qu'une table consolidée."

**Exemple pour monitoring :**
```
fact_cpu_metrics      -- Métriques CPU
fact_memory_metrics   -- Métriques mémoire
fact_network_metrics  -- Métriques réseau
fact_app_metrics      -- Métriques applicatives
```

Avantages : partitionnement indépendant, rétention différenciée, performances optimisées par domaine.

---

## 7. Synthèse et Recommandations

### 7.1 Architecture Recommandée pour Platform-Monitoring

```
┌─────────────────────────────────────────────────────────┐
│                    MODÈLE DE DONNÉES                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SCHÉMA : Star Schema (Gold Layer)                      │
│  ├── fact_metrics_raw (grain: minute, rétention: 7j)    │
│  ├── fact_metrics_hourly (grain: heure, rétention: 90j) │
│  ├── fact_metrics_daily (grain: jour, rétention: 2 ans) │
│  ├── dim_time (hiérarchie temporelle complète)          │
│  ├── dim_source (SCD Type 2)                            │
│  ├── dim_metric (attributs métriques)                   │
│  └── dim_location (datacenter/région)                   │
│                                                         │
│  PARTITIONNEMENT : Temporel quotidien                   │
│  PRÉ-AGRÉGATION : Continuous aggregates / Rollup tables │
│  COMPRESSION : Activée sur données > 7 jours            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Décisions Techniques Clés

| Décision | Choix | Raison |
|----------|-------|--------|
| **Schéma principal** | Star Schema | Performance analytique maximale |
| **Grain atomique** | Par minute | Flexibilité pour questions inattendues |
| **Niveaux d'agrégation** | Raw → Hourly → Daily → Monthly | Couverture complète des cas d'usage |
| **SCD pour dimensions** | Type 2 | Historique des changements de configuration |
| **Partitionnement** | Quotidien | Équilibre performance/gestion |
| **Base de données** | TimescaleDB ou ClickHouse | Selon volume et écosystème |

### 7.3 Modèle Dimensionnel Détaillé

#### Table de Faits Principale
```sql
CREATE TABLE fact_metrics_hourly (
    -- Clés
    time_key INT NOT NULL,
    metric_key INT NOT NULL,
    source_key INT NOT NULL,
    location_key INT NOT NULL,

    -- Mesures additives
    sum_value DECIMAL(18,4),
    count_samples INT,

    -- Mesures semi-additives
    avg_value DECIMAL(18,4),
    min_value DECIMAL(18,4),
    max_value DECIMAL(18,4),

    -- Mesures de distribution
    p50_value DECIMAL(18,4),
    p95_value DECIMAL(18,4),
    p99_value DECIMAL(18,4),

    -- Métadonnées
    ingestion_timestamp TIMESTAMP,

    PRIMARY KEY (time_key, metric_key, source_key)
) PARTITION BY RANGE (time_key);
```

#### Dimension Temporelle
```sql
CREATE TABLE dim_time (
    time_key INT PRIMARY KEY,
    timestamp TIMESTAMP,

    -- Granularités
    minute INT,
    hour INT,
    day INT,
    week INT,
    month INT,
    quarter INT,
    year INT,

    -- Attributs
    day_of_week VARCHAR(10),
    is_weekend BOOLEAN,
    is_business_hours BOOLEAN,

    -- Pour drill-down/roll-up
    hour_start TIMESTAMP,
    day_start DATE,
    week_start DATE,
    month_start DATE
);
```

### 7.4 Matrice de Cas d'Usage

| Cas d'usage | Table | Grain | Requête type |
|-------------|-------|-------|--------------|
| Dashboard temps réel | `fact_metrics_raw` | Minute | Dernières 4 heures |
| Tendances journalières | `fact_metrics_hourly` | Heure | Derniers 30 jours |
| Rapport mensuel | `fact_metrics_daily` | Jour | Derniers 12 mois |
| Capacity planning | `fact_metrics_monthly` | Mois | 2-5 ans |
| Investigation incident | `fact_metrics_raw` | Minute | Fenêtre spécifique |

---

## 8. Plan d'Implémentation

### 8.1 Phase 1 : Foundation (Semaines 1-2)

**Objectifs :**
- Définir le schéma dimensional complet
- Créer les tables de dimensions avec SCD Type 2
- Implémenter le partitionnement temporel

**Livrables :**
- [ ] Script DDL pour toutes les tables
- [ ] Politique de partitionnement documentée
- [ ] Pipeline de chargement des dimensions

### 8.2 Phase 2 : Ingestion (Semaines 3-4)

**Objectifs :**
- Pipeline d'ingestion des métriques brutes
- Transformation et enrichissement
- Tests de charge

**Livrables :**
- [ ] Pipeline ETL/ELT fonctionnel
- [ ] Monitoring du pipeline
- [ ] Documentation opérationnelle

### 8.3 Phase 3 : Agrégation (Semaines 5-6)

**Objectifs :**
- Implémenter les rollup tables
- Configurer les continuous aggregates
- Optimiser les requêtes dashboard

**Livrables :**
- [ ] Rollup tables automatisées
- [ ] Politiques de rafraîchissement
- [ ] Benchmarks de performance

### 8.4 Phase 4 : Optimisation (Semaines 7-8)

**Objectifs :**
- Tuning des requêtes
- Compression des données historiques
- Documentation finale

**Livrables :**
- [ ] Requêtes optimisées < 1s pour dashboards
- [ ] Politique de rétention implémentée
- [ ] Runbook opérationnel

### 8.5 Risques et Mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Volume données sous-estimé | Élevé | Moyen | Monitoring proactif, scaling automatique |
| Cardinalité explosive | Élevé | Moyen | Limites sur labels, agrégation précoce |
| Performance requêtes | Moyen | Faible | Indexes adaptés, pré-agrégation |
| Complexité maintenance | Moyen | Moyen | Automatisation, documentation |

---

## 9. Sources et Références

### Documentation Officielle
- [Microsoft Learn - Star Schema for Power BI](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema)
- [AWS - Data Modeling Best Practices for Time-Series](https://aws.amazon.com/blogs/database/data-modeling-best-practices-to-unlock-the-value-of-your-time-series-data/)
- [Cube.dev - Pre-aggregations Documentation](https://cube.dev/docs/reference/data-model/pre-aggregations)

### Articles Techniques
- [ThoughtSpot - Star Schema vs Snowflake Schema](https://www.thoughtspot.com/data-trends/data-modeling/star-schema-vs-snowflake-schema)
- [DataCamp - Star Schema vs Snowflake Schema](https://www.datacamp.com/blog/star-schema-vs-snowflake-schema)
- [AltexSoft - Data Vault Architecture](https://www.altexsoft.com/blog/data-vault-architecture/)
- [Kimball Group - Fact Tables](https://www.kimballgroup.com/2008/11/fact-tables/)
- [OWOX - Grain in Fact Table](https://www.owox.com/glossary/grain-in-fact-table)

### Comparatifs Technologiques
- [Tinybird - ClickHouse vs TimescaleDB 2026](https://www.tinybird.co/blog/clickhouse-vs-timescaledb)
- [TasrieIT - ClickHouse vs DuckDB 2026](https://tasrieit.com/blog/clickhouse-vs-duckdb-2026)
- [CloudRaft - ClickHouse vs DuckDB](https://www.cloudraft.io/blog/clickhouse-vs-duckdb)

### Performance et Optimisation
- [Last9 - High Cardinality Performance Impact](https://last9.io/blog/performance-implications-of-high-cardinality-in-time-series-databases/)
- [TigerData - Best Practices Time-Series Modeling](https://www.tigerdata.com/learn/best-practices-time-series-data-modeling-single-or-multiple-partitioned-tables-aka-hypertables)
- [QuestDB - Rollup Table Guide](https://questdb.com/glossary/rollup-table/)
- [Gameball Engineering - Scaling with PostgreSQL Rollup Tables](https://engineering.gameball.co/posts/scaling-analytics-with-postgresql-rollup-tables)

### OLAP et Agrégation
- [Keboola - Understanding OLAP Cubes](https://www.keboola.com/blog/olap-cubes)
- [AWS - What is OLAP](https://aws.amazon.com/what-is/olap/)
- [Wikipedia - OLAP Cube](https://en.wikipedia.org/wiki/OLAP_cube)

### Slowly Changing Dimensions
- [ThoughtSpot - SCD in Data Warehouse](https://www.thoughtspot.com/data-trends/data-modeling/slowly-changing-dimensions-in-data-warehouse)
- [Coalesce - Type 1 vs Type 2 SCD](https://coalesce.io/data-insights/type-1-vs-type-2-slowly-changing-dimensions/)

---

**Date de complétion de la recherche :** 2026-03-09
**Période de recherche :** Analyse technique complète basée sur données actuelles 2026
**Vérification des sources :** Tous les faits techniques cités avec sources actuelles
**Niveau de confiance :** Élevé - basé sur multiples sources autoritatives

_Ce document de recherche technique complet sert de référence autoritaire sur la modélisation des données analytiques et fournit des insights stratégiques pour une prise de décision éclairée et une implémentation dans le contexte de platform-monitoring._
