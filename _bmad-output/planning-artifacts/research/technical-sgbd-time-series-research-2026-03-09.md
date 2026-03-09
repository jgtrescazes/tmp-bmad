# Recherche Technique : SGBD Time-Series pour Dashboard Monitoring

**Date:** 2026-03-09
**Contexte:** Dashboard de monitoring multi-outils avec données time-series
**Critères:** Gros volume (>1M lignes/mois), Cloud managé, Équilibre simplicité/performance/coût

---

## Synthèse exécutive

| SGBD | Performance | Stockage | Simplicité | Cloud managé | Prix | **Score** |
|------|-------------|----------|------------|--------------|------|-----------|
| **ClickHouse** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ Oui | $$ | **🥇 Recommandé** |
| **TimescaleDB** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Oui | $$ | **🥈 Alternative** |
| **PostgreSQL** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Oui | $ | **🥉 Option simple** |
| **MariaDB** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Oui | $ | Option familière |
| **InfluxDB** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ Oui | $$$ | Viable |
| **QuestDB** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ❌ BYOC only | ? | Non recommandé |

### Recommandation finale

**🏆 ClickHouse Cloud** pour votre cas d'usage car :
- Performances exceptionnelles sur les agrégations (votre besoin principal)
- Bon ratio compression/stockage
- Intégration Symfony existante (Doctrine DBAL driver)
- Cloud managé disponible (AWS, GCP, Azure)
- Présentation SymfonyLive Paris 2026 dédiée = communauté active

**Alternative sûre : TimescaleDB** si vous préférez rester proche de PostgreSQL.

---

## Comparaison détaillée

### 1. ClickHouse

**Architecture:** Base de données OLAP orientée colonnes, optimisée pour les requêtes analytiques sur des milliards de lignes.

#### Performance

| Métrique | Valeur |
|----------|--------|
| Ingestion | ~4M métriques/sec (3x plus rapide que TimescaleDB/InfluxDB) |
| Requêtes agrégation | Millisecondes sur des milliards de lignes |
| Compression | ~2.5x moins efficace qu'InfluxDB, mais 20x mieux que TimescaleDB |

#### Cloud managé

**ClickHouse Cloud** disponible sur :
- AWS Marketplace
- Google Cloud Marketplace
- Azure Marketplace

**Tarification :**
- Compute : facturé à l'heure
- Stockage : facturé au Go
- Auto-scaling avec limites configurables
- Pause automatique pendant inactivité (économies)

#### Intégration Symfony

```php
// Installation
composer require friendsofdoctrine/dbal-clickhouse

// Ou client direct
composer require smi2/phpclickhouse
```

**Packages disponibles :**
- `friendsofdoctrine/dbal-clickhouse` - Driver Doctrine DBAL (mis à jour 2026-01-26)
- `dmamontov/clickhouse-migrations-bundle` - Migrations Symfony (mis à jour 2026-02-10)
- `smi2/phpClickHouse` - Client PHP natif

#### Cas d'usage idéal

✅ Requêtes analytiques sur gros volumes
✅ Agrégations, moyennes, comparaisons temporelles
✅ Dashboard avec données historiques
✅ Stockage long terme

**Sources:**
- [ClickHouse Cloud Pricing](https://clickhouse.com/pricing)
- [ClickHouse Docs](https://clickhouse.com/docs)
- [Doctrine DBAL ClickHouse](https://github.com/FriendsOfDoctrine/dbal-clickhouse)

---

### 2. TimescaleDB

**Architecture:** Extension PostgreSQL pour time-series. "C'est PostgreSQL" avec des optimisations time-series.

#### Performance

| Métrique | Valeur |
|----------|--------|
| Ingestion | ~1.3M métriques/sec |
| Requêtes | Très bonnes pour groupby-orderby-limit |
| Compression | Moins efficace (50x plus que InfluxDB) |

#### Avantages clés

- **Full SQL** : Toute la puissance de PostgreSQL
- **ACID compliant** : Transactions, JOINs, intégrité
- **Écosystème PostgreSQL** : Tous les outils existants fonctionnent
- **Hybrid row-columnar** : Moteur hybride performant

#### Cloud managé

**Timescale Cloud** (Tiger Data) :
- Performance, Scale, Enterprise tiers
- Compute facturé à l'heure
- Stockage : $0.001212/GB-hour
- Tiered storage : $0.021/GB/mois
- **Pas de frais** : backups, networking, egress

#### Intégration Symfony

```php
// C'est PostgreSQL standard !
composer require doctrine/dbal

// Configuration doctrine.yaml
doctrine:
    dbal:
        driver: pdo_pgsql
        url: '%env(TIMESCALE_URL)%'
```

✅ **Aucune librairie spéciale requise** - c'est du PostgreSQL standard

#### Cas d'usage idéal

✅ Besoin de JOINs avec données relationnelles
✅ Équipe familière avec PostgreSQL
✅ Transactions ACID requises
✅ Migration facile depuis PostgreSQL existant

**Sources:**
- [Timescale Pricing](https://docs.timescale.com/about/latest/pricing-and-account-management/)
- [Timescale Cloud](https://www.timescale.com/products)

---

### 3. InfluxDB

**Architecture:** Base de données time-series pure, optimisée pour les métriques et événements.

#### Performance

| Métrique | Valeur |
|----------|--------|
| Compression | **Leader** - Meilleure efficacité stockage |
| Ingestion temps réel | Excellent pour écritures haute fréquence |
| Requêtes analytiques | Moins performant que ClickHouse |

#### Cloud managé

**InfluxDB Cloud** :
- Free tier disponible
- Usage-Based Plan (pay as you go)
- Annual Plan (réduction)
- Disponible sur AWS, Azure, GCP

**Tarification basée sur :**
- Data In (Mo écrits)
- Data Out (Go lus)
- Query Count (nombre de requêtes)
- Storage (Go/heure)

#### Intégration PHP

```php
composer require influxdata/influxdb-client-php
```

#### Cas d'usage idéal

✅ Métriques haute fréquence (IoT, sensors)
✅ Alerting temps réel
✅ Stockage très économique
❌ Moins adapté pour analytics complexes

**Sources:**
- [InfluxDB Pricing](https://www.influxdata.com/influxdb-pricing/)
- [InfluxDB Cloud Plans](https://docs.influxdata.com/influxdb/cloud/account-management/pricing-plans/)

---

### 4. PostgreSQL (natif)

**Architecture:** SGBD relationnel généraliste avec partitionnement natif pour time-series.

#### Performance pour Time-Series

| Métrique | Valeur |
|----------|--------|
| Ingestion | Bonne avec partitionnement (2x plus rapide vs non-partitionné) |
| Requêtes analytiques | Bonnes pour requêtes complexes, moins optimisé que ClickHouse |
| Compression | Basique (pas de compression columnar native) |

#### Stratégie Time-Series avec PostgreSQL

**Partitionnement par range (date) :**
```sql
-- Créer table partitionnée
CREATE TABLE metrics (
    id SERIAL,
    timestamp TIMESTAMPTZ NOT NULL,
    source VARCHAR(50),
    metric_name VARCHAR(100),
    value NUMERIC,
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Créer partitions mensuelles
CREATE TABLE metrics_2026_03 PARTITION OF metrics
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

**Avantages du partitionnement :**
- **Partition pruning** : Le query planner élimine les partitions non pertinentes
- **DROP partition** quasi-instantané vs DELETE row-by-row
- **Maintenance simplifiée** : Backup/archivage par partition
- **pg_partman** : Extension pour automatiser la gestion

#### Cloud managé

Disponible sur tous les clouds :
- **AWS RDS PostgreSQL** / Aurora
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **Supabase**, **Neon**, etc.

**Coût :** Le moins cher des options (services managés matures)

#### Intégration Symfony

✅ **Native** - Doctrine ORM/DBAL standard

```php
// C'est le setup Symfony classique
composer require doctrine/orm

// Aucune config spéciale requise
```

#### Cas d'usage idéal

✅ Volumes modérés (< quelques millions de lignes)
✅ Équipe déjà familière avec PostgreSQL
✅ Besoin de JOINs avec données métier existantes
✅ Budget limité
✅ Simplicité maximale

❌ Moins adapté pour très gros volumes ou analytics intensives

**Sources:**
- [PostgreSQL Partitioning Guide](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Time Series on RDS PostgreSQL](https://aws.amazon.com/blogs/database/designing-high-performance-time-series-data-tables-on-amazon-rds-for-postgresql/)
- [PostgreSQL Partitioning Strategies](https://www.youngju.dev/blog/database/2026-03-03-postgresql-partitioning-strategies.en)

---

### 5. MariaDB

**Architecture:** Fork de MySQL, SGBD relationnel avec ColumnStore pour analytics.

#### Performance pour Time-Series

| Métrique | Valeur |
|----------|--------|
| Ingestion | Efficace pour high-throughput writes |
| Requêtes analytiques | Bonnes avec ColumnStore engine |
| I/O | Plus efficace que PostgreSQL sur stockage lent |

#### Stratégie Time-Series avec MariaDB

**Partitionnement :**
```sql
CREATE TABLE metrics (
    id BIGINT AUTO_INCREMENT,
    timestamp DATETIME NOT NULL,
    source VARCHAR(50),
    metric_name VARCHAR(100),
    value DECIMAL(10,4),
    PRIMARY KEY (id, timestamp)
)
PARTITION BY RANGE (TO_DAYS(timestamp)) (
    PARTITION p202603 VALUES LESS THAN (TO_DAYS('2026-04-01')),
    PARTITION p202604 VALUES LESS THAN (TO_DAYS('2026-05-01'))
);
```

**ColumnStore Engine (optionnel) :**
- Stockage columnar pour analytics
- Adapté pour agrégations sur gros volumes
- Moins mature que ClickHouse

#### Cloud managé

- **AWS RDS MariaDB**
- **Google Cloud SQL for MySQL** (compatible)
- **Azure Database for MariaDB**
- **SkySQL** (MariaDB Cloud natif)

#### Intégration Symfony

✅ **Native** - Doctrine ORM/DBAL standard (même que MySQL)

```php
// Setup Symfony classique
doctrine:
    dbal:
        driver: pdo_mysql
        url: '%env(MARIADB_URL)%'
```

#### Comparaison MariaDB vs PostgreSQL

| Aspect | MariaDB | PostgreSQL |
|--------|---------|------------|
| Writes haute fréquence | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Requêtes complexes | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Analytics (gros volumes) | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Familiarité équipe Symfony | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

#### Cas d'usage idéal

✅ Équipe très familière avec MySQL/MariaDB
✅ Writes haute fréquence, petits volumes
✅ Simplicité maximale
✅ Budget limité

❌ Analytics sur gros volumes → préférer ClickHouse/TimescaleDB

**Sources:**
- [MariaDB vs PostgreSQL](https://mariadb.org/mariadb-vs-postgresql-understanding-the-architectural-differences-that-matter/)
- [MariaDB ColumnStore](https://mariadb.com/kb/en/mariadb-columnstore/)

---

### 6. QuestDB

**Architecture:** Base de données time-series ultra-performante en ingestion.

#### Performance

| Métrique | Valeur |
|----------|--------|
| Ingestion | **2M lignes/sec** par instance |
| SQL | Support complet avec window functions |

#### Problème majeur

⚠️ **QuestDB Cloud a été abandonné** en 2025/2026

Seules options restantes :
- QuestDB Open Source (self-hosted)
- QuestDB Enterprise BYOC (Bring Your Own Cloud)

**Non recommandé** pour votre critère "Cloud managé".

**Sources:**
- [QuestDB Enterprise](https://questdb.com/enterprise/)
- [QuestDB 2025 Year Review](https://questdb.com/blog/questdb-2025-year-in-review/)

---

## Comparaison des coûts estimés

Pour votre usage estimé : **~1-5M lignes/mois**, **~50 Go stockage**, **requêtes dashboard**

| SGBD | Estimation mensuelle | Notes |
|------|---------------------|-------|
| **PostgreSQL (RDS)** | $20-50/mois | Le moins cher, très mature |
| **MariaDB (RDS)** | $20-50/mois | Équivalent PostgreSQL |
| **ClickHouse Cloud** | $50-150/mois | Pause auto, pay-per-use |
| **TimescaleDB Cloud** | $50-200/mois | Tiered storage économique |
| **InfluxDB Cloud** | $100-300/mois | Query count peut monter vite |
| **QuestDB** | Self-hosted only | Coût infra à gérer |

*Estimations approximatives - vérifier avec les calculateurs officiels*

---

## Matrice de décision pour votre projet

| Critère | ClickHouse | TimescaleDB | PostgreSQL | MariaDB | InfluxDB |
|---------|------------|-------------|------------|---------|----------|
| Agrégations M vs M-1 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Comparaisons temporelles | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Intégration Symfony | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Simplicité setup | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Coût stockage | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Performances requêtes | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Communauté Symfony | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## Recommandation finale

### 🏆 Choix principal : ClickHouse Cloud

**Pourquoi ClickHouse pour votre dashboard :**

1. **Performances analytiques** - Vos requêtes principales (agrégations, moyennes, comparaisons M/M-1) sont le point fort de ClickHouse
2. **Gros volumes** - Gère facilement >1M lignes/mois avec performances constantes
3. **Cloud managé** - Disponible sur AWS/GCP/Azure avec auto-scaling
4. **Intégration Symfony** - Driver Doctrine DBAL disponible et maintenu
5. **Coût maîtrisé** - Pause automatique, pay-per-use
6. **Communauté active** - Talk SymfonyLive Paris 2026 dédié

### 🥈 Alternative : TimescaleDB

**Choisir TimescaleDB si :**
- Vous préférez rester sur PostgreSQL (familiarité équipe)
- Vous avez besoin de JOINs avec d'autres tables relationnelles
- La simplicité d'intégration est prioritaire (c'est du PostgreSQL standard)

### 🥉 Option pragmatique : PostgreSQL natif

**Choisir PostgreSQL si :**
- Le volume reste modéré (< 5M lignes/mois)
- Le budget est contraint
- L'équipe maîtrise déjà PostgreSQL
- Vous voulez la stack la plus simple possible
- Possibilité de migrer vers TimescaleDB plus tard (même base)

**Note sur MariaDB :** Équivalent à PostgreSQL en simplicité et coût. À choisir uniquement si l'équipe est plus familière avec MySQL/MariaDB. PostgreSQL reste généralement préféré pour les requêtes analytiques.

---

## Arbre de décision simplifié

```
Volume de données ?
├── < 5M lignes/mois → PostgreSQL (simple, économique)
│   └── Si analytics avancées plus tard → Migrer vers TimescaleDB
└── > 5M lignes/mois → ClickHouse (performances)
    └── Si besoin JOINs complexes → TimescaleDB
```

---

## Prochaines étapes

1. [ ] Créer un compte ClickHouse Cloud (trial gratuit)
2. [ ] Tester le driver Doctrine DBAL avec Symfony
3. [ ] Définir le schéma de tables pour vos métriques
4. [ ] POC : insérer et requêter des données de test
5. [ ] Benchmark avec vos requêtes réelles

---

## Sources

- [ClickHouse vs TimescaleDB vs InfluxDB Comparison](https://sanj.dev/post/clickhouse-timescaledb-influxdb-time-series-comparison)
- [Time-Series Databases 2026](https://cratedb.com/blog/best-time-series-databases)
- [ClickHouse Pricing](https://clickhouse.com/pricing)
- [TimescaleDB Pricing](https://docs.timescale.com/about/latest/pricing-and-account-management/)
- [InfluxDB Pricing](https://www.influxdata.com/influxdb-pricing/)
- [Doctrine DBAL ClickHouse](https://github.com/FriendsOfDoctrine/dbal-clickhouse)
- [SymfonyLive Paris 2026 - ClickHouse](https://live.symfony.com/2026-paris/schedule/clickhouse-for-symfony-developers)

---

*Document généré le 2026-03-09*
