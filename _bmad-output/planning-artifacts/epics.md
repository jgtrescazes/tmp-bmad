---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
status: complete
completedAt: '2026-03-09'
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# Watchtower - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Watchtower, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: Le système peut collecter automatiquement les données d'erreurs depuis Sentry pour un repo configuré
- FR2: Le système peut collecter automatiquement les métriques Web Vitals (LCP, CLS, INP) depuis DebugBear ou Treo pour un repo configuré
- FR3: Le système peut collecter automatiquement les alertes de vulnérabilités depuis Dependabot (via GitHub API) pour un repo configuré
- FR4: Le système peut collecter automatiquement les données de coverage PHPUnit depuis les artifacts GitHub Actions pour un repo configuré
- FR5: Le système peut collecter les événements de déploiement (merges sur main) depuis GitHub pour un repo configuré
- FR6: Le système peut retenter automatiquement une collecte échouée (jusqu'à 3 tentatives)
- FR7: Le système peut signaler visuellement une collecte incomplète ou échouée
- FR8: Le système peut exécuter le backfill des données du mois précédent pour chaque source
- FR9: Le Tech Lead peut visualiser un graphe d'évolution multi-axes sur une période mensuelle
- FR10: Le Tech Lead peut comparer les métriques du mois courant avec le mois précédent (M/M-1)
- FR11: Le Tech Lead peut sélectionner un repo spécifique à visualiser
- FR12: Le Tech Lead peut voir les données de chaque axe (Stabilité, Performance, Sécurité, Qualité) dans des sections dédiées
- FR13: Le Tech Lead peut accéder en drill-down aux outils sources via des liens profonds (< 2 clics)
- FR14: Le Tech Lead peut consulter le dashboard en dark mode
- FR15: Le système peut détecter les dépassements de seuils absolus Google pour les Web Vitals (LCP > 2.5s, INP > 200ms, CLS > 0.1)
- FR16: Le système peut détecter les deltas significatifs entre le mois courant et le mois précédent
- FR17: Le système peut détecter les tendances de dégradation sur 3 mois consécutifs
- FR18: Le système peut calculer un score âge × sévérité pour les vulnérabilités Dependabot
- FR19: Le système peut générer automatiquement une section "À investiguer" listant les anomalies détectées
- FR20: Le système peut détecter automatiquement les déploiements (merges sur main) et les annoter sur les graphes d'évolution
- FR21: Le Tech Lead peut visualiser l'impact d'un déploiement sur les métriques en corrélant les annotations MEP avec les courbes
- FR22: Le Tech Lead peut consulter les métriques Stabilité : nouvelles erreurs, erreurs résolues, taux d'erreurs, temps moyen de traitement (Sentry)
- FR23: Le Tech Lead peut consulter les métriques Performance : LCP, CLS, INP avec distinction lab/field, non consolidées entre sources
- FR24: Le Tech Lead peut consulter les métriques Sécurité : vulnérabilités par sévérité, âge des alertes, évolution du backlog (Dependabot)
- FR25: Le Tech Lead peut consulter les métriques Qualité : coverage backend par module — Lines, Functions, Classes (PHPUnit)
- FR26: Le Tech Lead peut exporter un rapport mensuel au format Markdown
- FR27: Le rapport inclut automatiquement la comparaison M/M-1 pour chaque axe
- FR28: Le rapport inclut automatiquement les top problèmes détectés
- FR29: Le rapport inclut automatiquement les annotations des déploiements significatifs
- FR30: Le système peut stocker les données avec rétention différenciée (journalier 30j, hebdomadaire 12 mois, mensuel pluriannuel)
- FR31: Le système peut afficher un trou dans le graphe avec warning visuel lorsque des données sont manquantes, et permettre de relancer manuellement la collecte échouée

### NonFunctional Requirements

- NFR1: Le dashboard doit se charger en moins de 3 secondes pour la vue d'ensemble
- NFR2: La génération du rapport Markdown doit s'exécuter en moins de 10 secondes
- NFR3: Les graphes d'évolution doivent s'afficher sans lag perceptible lors du changement de période ou de repo
- NFR4: Le dashboard doit maintenir une disponibilité supérieure à 99% (uptime)
- NFR5: Les données affichées doivent avoir moins de 24h de retard pour toutes les sources quotidiennes
- NFR6: Une source en échec de collecte ne doit pas impacter la collecte des autres sources (isolation)
- NFR7: Les données collectées ne doivent jamais être perdues silencieusement — tout échec doit être visible
- NFR8: Chaque connecteur source doit respecter les rate limits de l'API cible sans intervention manuelle
- NFR9: Les collectes doivent suivre une fréquence adaptative selon la source (quasi temps réel pour Sentry, quotidien pour Dependabot/coverage, hebdomadaire pour CWV agrégés)
- NFR10: L'ajout d'un nouveau repo doit être possible via fichier de configuration sans modification du code
- NFR11: Les API keys et credentials doivent être stockés dans des variables d'environnement (.env), jamais en dur dans le code
- NFR12: Le dashboard n'est pas exposé publiquement (accès réseau restreint ou URL non référencée)
- NFR13: Le coût d'infrastructure total doit rester inférieur à 50€/mois pour le MVP
- NFR14: Le stockage doit supporter la rétention différenciée (journalier 30j → hebdomadaire 12 mois → mensuel pluriannuel) sans intervention manuelle
- NFR15: L'hébergement sur Cloudflare doit permettre un déploiement continu depuis le repo GitHub

### Additional Requirements

**From Architecture:**

- Starter template : Nuxt UI Dashboard template (`pnpm dlx nuxi@latest init watchtower -t ui`) — doit être la première story d'implémentation
- Star Schema multi-granularité : tables metrics_raw, metrics_daily, metrics_weekly, metrics_monthly + dimensions (dim_sources, dim_metric_types, dim_repositories)
- Migrations SQL versionnées dans supabase/migrations/
- Typage auto via `supabase gen types typescript`
- Hybride PostgREST (lecture dashboard) + Edge Functions (collecteurs écriture)
- pg_cron pour orchestration des collecteurs et rollup automatique
- Rollup automatique via fonctions PostgreSQL (fn_rollup_daily, fn_rollup_weekly, fn_rollup_monthly)
- Cleanup automatique pour rétention différenciée (fn_cleanup_old_raw, fn_cleanup_old_daily)
- Apache ECharts 6.0 via nuxt-echarts pour les graphiques
- GitHub Actions CI/CD : lint + tests sur PR, build + deploy Cloudflare Pages sur merge main
- Supabase Edge Functions (Deno runtime) pour les collecteurs
- retryWithBackoff() wrapper partagé dans _shared/retry.ts
- collection_logs table pour tracer chaque exécution de collecte

**From UX Design:**

- Dark mode natif, desktop uniquement (< 1024px non supporté)
- Layout : Header (logo, repo selector, time range, export) → Alert banner "À investiguer" → Summary cards 4 axes → Timeline chart avec MEP markers → Detail sections
- Composants Nuxt UI 4.5 first : UCard, UBadge, UAlert, UTable, UDropdownMenu, USkeleton, UTooltip, UButton
- Seul composant custom requis : MetricChart (lib externe ECharts)
- WCAG 2.1 AA : contraste 4.5:1, navigation clavier, ARIA labels, prefers-reduced-motion
- Feedback patterns : skeleton loading, toast succès/erreur, empty states
- Data display : formatage locale nombres, 1 décimale %, deltas signés (+/-), dates relatives/absolues
- Indicateurs couleur sémantiques : success (vert), warning (amber), danger (rouge)
- Progressive disclosure : Summary → Détail → Source externe
- Max 2 niveaux de navigation (Dashboard → Drill-down source)

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Collecte Sentry |
| FR2 | Epic 2 | Collecte DebugBear/CWV |
| FR3 | Epic 2 | Collecte Dependabot |
| FR4 | Epic 2 | Collecte PHPUnit/coverage |
| FR5 | Epic 2 | Collecte déploiements GitHub |
| FR6 | Epic 1 | Retry 3x collecte |
| FR7 | Epic 1 | Signalement collecte échouée |
| FR8 | Epic 3 | Backfill M-1 |
| FR9 | Epic 1 | Graphe évolution multi-axes |
| FR10 | Epic 3 | Comparaison M/M-1 |
| FR11 | Epic 3 | Sélecteur repo (mono-repo MVP) |
| FR12 | Epic 1 | Sections dédiées par axe |
| FR13 | Epic 3 | Drill-down liens profonds |
| FR14 | Epic 1 | Dark mode |
| FR15 | Epic 4 | Seuils absolus Google CWV |
| FR16 | Epic 4 | Delta significatif M/M-1 |
| FR17 | Epic 4 | Tendance dégradation 3 mois |
| FR18 | Epic 4 | Score âge × sévérité |
| FR19 | Epic 4 | Section "À investiguer" |
| FR20 | Epic 3 | Annotations déploiements |
| FR21 | Epic 3 | Corrélation MEP/métriques |
| FR22 | Epic 1 | Métriques Stabilité |
| FR23 | Epic 2 | Métriques Performance |
| FR24 | Epic 2 | Métriques Sécurité |
| FR25 | Epic 2 | Métriques Qualité |
| FR26 | Epic 5 | Export rapport Markdown |
| FR27 | Epic 5 | Comparaison M/M-1 dans rapport |
| FR28 | Epic 5 | Top problèmes dans rapport |
| FR29 | Epic 5 | Annotations MEP dans rapport |
| FR30 | Epic 6 | Rétention différenciée |
| FR31 | Epic 6 | Données manquantes + warning |

## Epic List

### Epic 1: Foundation & Dashboard Stabilité
Le Tech Lead peut ouvrir Watchtower et visualiser les métriques de stabilité (Sentry) sur un dashboard fonctionnel en dark mode. Epic "end-to-end vertical slice" : init projet, DB, premier collecteur, première page de dashboard.
**FRs covered:** FR1, FR6, FR7, FR9, FR12, FR14, FR22

### Epic 2: Couverture Multi-Sources
Le Tech Lead peut voir les 4 axes complets (Stabilité, Performance, Sécurité, Qualité) avec des données fraîches de chaque source. 3 nouveaux collecteurs + 3 pages d'axe.
**FRs covered:** FR2, FR3, FR4, FR5, FR23, FR24, FR25

### Epic 3: Comparaison Temporelle & Corrélation MEP
Le Tech Lead peut comparer M/M-1 sur tous les axes, voir les déploiements annotés sur les graphes, et naviguer vers les sources en drill-down. Inclut le backfill M-1.
**FRs covered:** FR8, FR10, FR11, FR13, FR20, FR21

### Epic 4: Détection d'Anomalies & Investigation
Le Tech Lead voit automatiquement une section "À investiguer" avec les anomalies détectées à 3 niveaux (seuils absolus, delta M/M-1, tendance 3 mois). Passage de dashboard passif à analyste automatisé.
**FRs covered:** FR15, FR16, FR17, FR18, FR19

### Epic 5: Rapport Mensuel
Le Tech Lead peut exporter en 1 clic un rapport Markdown complet avec comparaisons M/M-1, top problèmes et annotations MEP. Le "moment aha!" du produit.
**FRs covered:** FR26, FR27, FR28, FR29

### Epic 6: Opérations Data & CI/CD
Le système gère automatiquement la rétention différenciée, signale les données manquantes, et se déploie en continu. Epic de robustesse long-terme.
**FRs covered:** FR30, FR31

## Epic 1: Foundation & Dashboard Stabilité

Le Tech Lead peut ouvrir Watchtower et visualiser les métriques de stabilité (Sentry) sur un dashboard fonctionnel en dark mode.

### Story 1.1: Initialisation Projet & Schéma Base de Données

As a **développeur**,
I want **un projet Nuxt UI initialisé avec Supabase configuré et le schéma star schema créé**,
So that **j'ai une fondation technique prête pour implémenter les fonctionnalités**.

**Acceptance Criteria:**

**Given** aucun projet n'existe
**When** j'exécute `pnpm dlx nuxi@latest init watchtower -t ui` et les scripts de setup
**Then** le projet Nuxt 4 démarre en local avec Nuxt UI, dark mode activé, et le layout dashboard (sidebar + header)
**And** Supabase est configuré avec le module `@nuxtjs/supabase`
**And** les migrations SQL créent les tables : `dim_sources`, `dim_metric_types`, `dim_repositories`, `metrics_raw`, `metrics_daily`, `metrics_weekly`, `metrics_monthly`, `collection_logs`
**And** les types TypeScript sont générés via `supabase gen types typescript`
**And** ESLint est configuré avec `@nuxt/eslint-config`
**And** le fichier `.env.example` documente toutes les variables requises

### Story 1.2: Collecteur Sentry avec Retry & Logging

As a **système**,
I want **collecter automatiquement les données d'erreurs depuis Sentry avec retry et logging**,
So that **les métriques de stabilité sont disponibles en base pour le dashboard**.

**Acceptance Criteria:**

**Given** une API key Sentry configurée dans les variables d'environnement
**When** l'Edge Function `collect-sentry` est invoquée
**Then** les données sont récupérées depuis l'API Sentry (nouvelles erreurs, résolues, taux, temps de traitement) et insérées dans `metrics_raw`
**And** en cas d'échec, le système retente jusqu'à 3 fois avec backoff exponentiel (1s, 2s, 4s) (FR6)
**And** chaque exécution (succès ou échec) est enregistrée dans `collection_logs` avec source, status, error_message, rows_collected, duration_ms
**And** les rate limits de l'API Sentry sont respectés (NFR8)
**And** un job pg_cron est configuré pour invoquer cette fonction toutes les 5 minutes (NFR9)

**Given** l'API Sentry est indisponible après 3 tentatives
**When** la collecte échoue définitivement
**Then** le statut `failed` est enregistré dans `collection_logs`
**And** les autres collecteurs ne sont pas impactés (NFR6)

### Story 1.3: Dashboard Layout & Page Stabilité

As a **Tech Lead**,
I want **visualiser les métriques de stabilité Sentry sur un dashboard en dark mode**,
So that **je peux surveiller la santé de la plateforme en un coup d'œil**.

**Acceptance Criteria:**

**Given** des données Sentry existent en base
**When** j'ouvre Watchtower sur la page d'accueil
**Then** le dashboard s'affiche en dark mode en moins de 3 secondes (NFR1, FR14)
**And** je vois un layout avec header, et les 4 sections d'axes (Stabilité, Performance, Sécurité, Qualité) — les 3 autres affichent un empty state (FR12)
**And** la section Stabilité affiche un graphe ECharts time-series avec les métriques : nouvelles erreurs, erreurs résolues, taux d'erreurs, temps moyen de traitement (FR22)
**And** le graphe affiche la période mensuelle par défaut (FR9)

**Given** je suis sur la page Stabilité dédiée (`/stability`)
**When** je consulte les détails
**Then** je vois les métriques Sentry détaillées dans un tableau (UTable) et un graphe d'évolution

### Story 1.4: Page Santé des Collecteurs

As a **Tech Lead**,
I want **voir le statut de chaque collecteur et être alerté en cas d'échec**,
So that **je sais si les données affichées sont complètes et fiables**.

**Acceptance Criteria:**

**Given** des entrées existent dans `collection_logs`
**When** j'ouvre la page Health (`/health`)
**Then** je vois un tableau listant chaque source avec : nom, dernier succès, dernier échec, statut actuel
**And** une source en échec est signalée visuellement avec un badge rouge (FR7)

**Given** une source est en échec sur le dashboard principal
**When** je consulte n'importe quelle page
**Then** un badge `SourceStatusBadge` dans le header indique le nombre de sources en erreur (FR7)

## Epic 2: Couverture Multi-Sources

Le Tech Lead peut voir les 4 axes complets (Stabilité, Performance, Sécurité, Qualité) avec des données fraîches de chaque source.

### Story 2.1: Collecteur DebugBear & Page Performance

As a **Tech Lead**,
I want **voir les métriques Web Vitals (LCP, CLS, INP) collectées depuis DebugBear**,
So that **je peux surveiller la performance de la plateforme**.

**Acceptance Criteria:**

**Given** une API key DebugBear configurée
**When** l'Edge Function `collect-debugbear` est invoquée par pg_cron (hebdomadaire)
**Then** les métriques LCP, CLS, INP (lab et field, non consolidées) sont insérées dans `metrics_raw`
**And** le retry 3x et le logging dans `collection_logs` fonctionnent comme pour Sentry

**Given** des données DebugBear existent en base
**When** j'ouvre la page Performance (`/performance`)
**Then** je vois les graphes ECharts pour LCP, CLS, INP avec distinction lab/field (FR23)
**And** la section Performance du dashboard principal affiche un résumé

### Story 2.2: Collecteur Dependabot & Page Sécurité

As a **Tech Lead**,
I want **voir les alertes de vulnérabilités Dependabot avec leur sévérité et âge**,
So that **je peux prioriser les corrections de sécurité**.

**Acceptance Criteria:**

**Given** un token GitHub configuré avec accès Dependabot
**When** l'Edge Function `collect-dependabot` est invoquée par pg_cron (quotidien)
**Then** les alertes de vulnérabilités sont collectées via l'API GitHub (sévérité, date de création, état) et insérées dans `metrics_raw` (FR3)

**Given** des données Dependabot existent en base
**When** j'ouvre la page Sécurité (`/security`)
**Then** je vois les vulnérabilités par sévérité, l'âge des alertes, et l'évolution du backlog (FR24)

### Story 2.3: Collecteur PHPUnit Coverage & Page Qualité

As a **Tech Lead**,
I want **voir la coverage backend par module collectée depuis GitHub Actions**,
So that **je peux suivre l'évolution de la qualité du code**.

**Acceptance Criteria:**

**Given** des artifacts PHPUnit existent dans GitHub Actions
**When** l'Edge Function `collect-coverage` est invoquée par pg_cron (quotidien)
**Then** les données de coverage (Lines, Functions, Classes par module) sont extraites et insérées dans `metrics_raw` (FR4)

**Given** des données de coverage existent en base
**When** j'ouvre la page Qualité (`/quality`)
**Then** je vois la coverage backend par module avec graphes d'évolution (FR25)

### Story 2.4: Collecteur Déploiements GitHub

As a **système**,
I want **collecter les événements de déploiement (merges sur main) depuis GitHub**,
So that **les déploiements sont disponibles pour annotation et corrélation**.

**Acceptance Criteria:**

**Given** un token GitHub configuré
**When** l'Edge Function `collect-github` est invoquée par pg_cron (toutes les 15 min)
**Then** les merges sur main sont détectés et insérés dans la table `deployments` avec : sha, message, auteur, date, PR associée (FR5)
**And** les déploiements déjà enregistrés ne sont pas dupliqués

## Epic 3: Comparaison Temporelle & Corrélation MEP

Le Tech Lead peut comparer M/M-1 sur tous les axes, voir les déploiements annotés sur les graphes, et naviguer vers les sources en drill-down.

### Story 3.1: Comparaison M/M-1 sur le Dashboard

As a **Tech Lead**,
I want **comparer les métriques du mois courant avec le mois précédent sur tous les axes**,
So that **je peux identifier les améliorations et dégradations**.

**Acceptance Criteria:**

**Given** des données existent pour le mois courant et le mois précédent
**When** j'ouvre le dashboard
**Then** chaque axe affiche un delta visuel (ex: +12%, -5%) avec flèche directionnelle et couleur sémantique (FR10)
**And** les graphes d'évolution montrent les deux périodes superposées ou en comparaison

**Given** le mois précédent n'a pas de données
**When** j'ouvre le dashboard
**Then** le delta affiche "N/A" avec un tooltip explicatif

### Story 3.2: Annotations Déploiements sur les Graphes

As a **Tech Lead**,
I want **voir les déploiements annotés automatiquement sur les graphes d'évolution**,
So that **je peux corréler l'impact d'une MEP avec les métriques**.

**Acceptance Criteria:**

**Given** des déploiements existent dans la table `deployments`
**When** je visualise un graphe d'évolution sur n'importe quel axe
**Then** les déploiements apparaissent comme des marqueurs verticaux sur la timeline (FR20)
**And** au survol d'un marqueur, un tooltip affiche : sha court, message, auteur, date (FR21)
**And** les marqueurs sont visuellement discrets mais identifiables (style ECharts markLine)

### Story 3.3: Backfill M-1 pour Toutes les Sources

As a **système**,
I want **rétro-collecter les données du mois précédent pour chaque source**,
So that **la comparaison M/M-1 est disponible dès le premier mois d'utilisation**.

**Acceptance Criteria:**

**Given** une source vient d'être configurée pour la première fois
**When** le backfill est déclenché (manuellement ou au premier lancement)
**Then** les données du mois M-1 sont collectées et insérées dans `metrics_raw` pour chaque source (FR8)
**And** si l'API source ne supporte pas la profondeur historique demandée, un warning est logué dans `collection_logs`

### Story 3.4: Drill-down Liens Profonds & Sélecteur Repo

As a **Tech Lead**,
I want **naviguer en 1 clic vers l'outil source et pouvoir sélectionner un repo**,
So that **je peux investiguer rapidement un problème dans son contexte natif**.

**Acceptance Criteria:**

**Given** je consulte des métriques sur n'importe quel axe
**When** je clique sur un lien drill-down
**Then** l'outil source s'ouvre dans un nouvel onglet avec un lien profond vers le contexte pertinent (FR13)
**And** le drill-down est accessible en moins de 2 clics depuis la vue d'ensemble

**Given** le dashboard est ouvert
**When** je regarde le header
**Then** je vois un sélecteur repo (UDropdownMenu) avec "International" pré-sélectionné (FR11)
**And** en MVP mono-repo, le sélecteur est présent mais avec une seule option (prêt pour V1.5)

## Epic 4: Détection d'Anomalies & Investigation

Le Tech Lead voit automatiquement une section "À investiguer" avec les anomalies détectées à 3 niveaux (seuils absolus, delta M/M-1, tendance 3 mois).

### Story 4.1: Moteur d'Anomalies — Seuils Absolus & Deltas

As a **système**,
I want **détecter automatiquement les dépassements de seuils Google CWV et les deltas significatifs M/M-1**,
So that **les anomalies sont identifiées sans intervention humaine**.

**Acceptance Criteria:**

**Given** des données de performance existent en base
**When** le moteur d'anomalies s'exécute (à chaque chargement du dashboard)
**Then** les dépassements de seuils absolus Google sont détectés : LCP > 2.5s, INP > 200ms, CLS > 0.1 (FR15)
**And** les deltas significatifs entre M et M-1 sont détectés (seuil configurable, défaut > 10%) (FR16)
**And** chaque anomalie est typée : `threshold` ou `delta`

### Story 4.2: Analyse Tendancielle & Score Sévérité

As a **système**,
I want **détecter les tendances de dégradation sur 3 mois et calculer les scores de sévérité**,
So that **les dégradations progressives et les vulnérabilités urgentes sont mises en évidence**.

**Acceptance Criteria:**

**Given** des données historiques existent sur au moins 3 mois
**When** le moteur d'anomalies s'exécute
**Then** une dégradation continue sur 3 mois consécutifs est détectée comme anomalie tendancielle (FR17)

**Given** des alertes Dependabot existent en base
**When** le score de sévérité est calculé
**Then** chaque vulnérabilité reçoit un score = âge (jours) × coefficient sévérité (critical=4, high=3, medium=2, low=1) (FR18)
**And** les vulnérabilités sont triées par score décroissant

### Story 4.3: Section "À Investiguer"

As a **Tech Lead**,
I want **voir une section "À investiguer" auto-générée listant les anomalies détectées**,
So that **je sais immédiatement quoi prioriser sans analyser moi-même les courbes**.

**Acceptance Criteria:**

**Given** des anomalies ont été détectées par le moteur
**When** j'ouvre le dashboard
**Then** une bannière "À investiguer" (UAlert) apparaît en haut de page avec le nombre d'éléments (FR19)
**And** chaque anomalie affiche : type (seuil/delta/tendance), source, métrique concernée, valeur actuelle vs attendue
**And** un badge de sévérité (critique/warning/info) colore chaque élément
**And** je peux cliquer sur une anomalie pour naviguer vers la section détaillée de l'axe concerné

**Given** aucune anomalie n'est détectée
**When** j'ouvre le dashboard
**Then** la bannière "À investiguer" n'apparaît pas (pas de bruit)

## Epic 5: Rapport Mensuel

Le Tech Lead peut exporter en 1 clic un rapport Markdown complet avec comparaisons M/M-1, top problèmes et annotations MEP.

### Story 5.1: Agrégation des Données du Rapport

As a **système**,
I want **agréger les données mensuelles de tous les axes pour la génération du rapport**,
So that **le rapport dispose de toutes les comparaisons et métriques nécessaires**.

**Acceptance Criteria:**

**Given** des données existent pour le mois sélectionné et M-1
**When** le composable `useReport` est invoqué avec une période
**Then** les données agrégées sont retournées pour chaque axe : valeur M, valeur M-1, delta, top problèmes
**And** les déploiements significatifs du mois sont inclus
**And** les anomalies détectées sont incluses

### Story 5.2: Export Markdown 1-Clic

As a **Tech Lead**,
I want **exporter un rapport mensuel complet au format Markdown en 1 clic**,
So that **je peux partager le rapport au DSI en quelques minutes au lieu de plusieurs heures**.

**Acceptance Criteria:**

**Given** je suis sur le dashboard avec une période mensuelle sélectionnée
**When** je clique sur le bouton "Exporter Rapport"
**Then** un fichier Markdown est généré et téléchargé en moins de 10 secondes (NFR2)
**And** le rapport inclut la comparaison M/M-1 pour chaque axe (FR27)
**And** le rapport inclut les top problèmes détectés (FR28)
**And** le rapport inclut les annotations des déploiements significatifs (FR29)
**And** le rapport est structuré par axe avec des sections claires (FR26)
**And** une notification toast confirme le téléchargement

## Epic 6: Opérations Data & CI/CD

Le système gère automatiquement la rétention différenciée, signale les données manquantes, et se déploie en continu.

### Story 6.1: Rétention Différenciée Automatique

As a **système**,
I want **appliquer automatiquement la rétention différenciée sur les données stockées**,
So that **le volume de données reste maîtrisé sans intervention manuelle**.

**Acceptance Criteria:**

**Given** des données brutes existent dans `metrics_raw` depuis plus de 30 jours
**When** le job pg_cron de rollup quotidien s'exécute
**Then** les données brutes > 30j sont agrégées dans `metrics_daily` puis supprimées de `metrics_raw` (FR30)

**Given** des données daily existent depuis plus de 12 mois
**When** le job pg_cron de rollup mensuel s'exécute
**Then** les données daily > 12 mois sont agrégées dans `metrics_monthly` puis supprimées de `metrics_daily` (FR30)
**And** les données monthly sont conservées indéfiniment (NFR14)

### Story 6.2: Gestion des Données Manquantes

As a **Tech Lead**,
I want **voir clairement les trous de données et pouvoir relancer une collecte échouée**,
So that **je sais si les données sont complètes et je peux corriger les problèmes**.

**Acceptance Criteria:**

**Given** une période sans données existe pour une source
**When** je consulte un graphe d'évolution
**Then** le trou est visible dans le graphe (interruption de la courbe) avec un warning visuel (FR31)

**Given** une collecte a échoué
**When** je consulte la page Health
**Then** je peux cliquer un bouton "Relancer" pour déclencher manuellement la collecte de cette source (FR31)
**And** le statut se met à jour en temps réel

### Story 6.3: Pipeline CI/CD GitHub Actions

As a **développeur**,
I want **un pipeline CI/CD automatisé qui lint, teste et déploie sur Cloudflare**,
So that **chaque merge sur main est automatiquement déployé en production**.

**Acceptance Criteria:**

**Given** une PR est ouverte sur le repo
**When** le workflow CI s'exécute
**Then** le linting ESLint et les tests Vitest passent
**And** un preview deploy est créé sur Cloudflare Pages

**Given** une PR est mergée sur main
**When** le workflow deploy s'exécute
**Then** l'application est buildée et déployée sur Cloudflare Pages via `wrangler` (NFR15)
**And** le déploiement est vérifiable via l'URL de production
