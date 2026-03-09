---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - brainstorming-session-2026-03-09-session.md
  - domain-apis-monitoring-tools-research-2026-03-09.md
  - technical-sgbd-time-series-research-2026-03-09.md
  - technical-dashboard-to-presentation-automation-research-2026-03-09.md
  - technical-frequence-polling-monitoring-research-2026-03-09.md
  - technical-modelisation-donnees-analytiques-research-2026-03-09.md
  - technical-polling-vs-storage-monitoring-apis-research-2026-03-09.md
  - technical-supabase-mvp-research-2026-03-09.md
date: 2026-03-09
author: JG
---

# Product Brief: platform-monitoring

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

**Watchtower** est un dashboard de monitoring centralisé qui unifie la vision de santé des plateformes Wamiz (International, Pet-Gen, Pet Avatar) en un seul endroit. Il automatise la préparation des rapports mensuels, actuellement réalisés manuellement via captures d'écran, et permet un suivi quotidien/hebdomadaire de la stabilité, performance, sécurité et qualité du code.

L'outil répond à une demande interne de visibilité consolidée, en remplaçant la consultation fragmentée de 10+ outils (Sentry, DebugBear, Dependabot, Datadog, GitHub, Jira...) par une vue unifiée avec comparaison mois vs mois et corrélation automatique MEP → Impact.

---

## Core Vision

### Problem Statement

La préparation des rapports mensuels de santé plateforme est **manuelle et chronophage** : captures d'écran dans chaque outil, copier-coller dans des présentations, analyse dispersée. Les équipes (Tech Lead, DSI, Devs) n'ont pas de vue unifiée pour suivre l'évolution de la santé des repos et prendre des décisions éclairées rapidement.

### Problem Impact

- **Temps perdu** : Plusieurs heures par mois pour compiler les données manuellement
- **Fragmentation** : 10+ outils à consulter sans corrélation entre eux
- **Réactivité limitée** : Détection tardive des dégradations, pas de vision tendancielle
- **Décisions difficiles** : Impossible de prouver l'impact d'une MEP sur les métriques

### Why Existing Solutions Fall Short

Les outils actuels (Sentry, DebugBear, Datadog...) sont excellents individuellement mais :
- **Silos de données** : Chaque outil a son propre dashboard, pas de vue transverse
- **Pas de comparaison temporelle** : Difficile de voir M vs M-1 d'un coup d'œil
- **Pas de corrélation MEP** : Aucun lien automatique entre déploiements et impact métriques
- **Pas de rapport automatisé** : Export manuel requis pour chaque présentation

### Proposed Solution

Un dashboard unique **Watchtower** qui :
- **Agrège** les données de toutes les sources (Sentry, DebugBear, Dependabot, GitHub, Jira, Datadog, GSC)
- **Organise** en 4 axes : Stabilité, Performance, Sécurité, Qualité
- **Compare** automatiquement mois vs mois précédent
- **Corrèle** les déploiements avec l'évolution des métriques
- **Génère** des rapports mensuels exportables (Markdown, puis Miro/Slideshow en V2)
- **Détecte** automatiquement ce qui est pertinent à signaler ("À investiguer")

### Key Differentiators

| Différenciateur | Description |
|-----------------|-------------|
| **Vue unifiée multi-sources** | Un seul endroit pour 10+ outils, par repo ou agrégé |
| **Corrélation MEP → Impact** | Overlay automatique des déploiements sur les courbes de métriques |
| **Détection d'anomalies contextuelle** | Seuils Google pour Web Vitals + delta relatif + tendanciel |
| **Rapport mensuel automatisé** | Fini les captures d'écran manuelles |
| **Conçu pour Wamiz** | Adapté aux 3 repos spécifiques avec leurs particularités |

---

## Target Users

### Primary Users

#### Tech Lead
- **Usage** : Hebdomadaire + drill-down ponctuel
- **Besoins** : Suivi erreurs Sentry, sécurité Dependabot, couverture tests, décisions d'action
- **Valeur** : Vue consolidée pour décider quoi prioriser, préparer les rapports mensuels en 1 clic

#### Développeurs
- **Usage** : Ponctuel (avant/après MEP, investigation)
- **Besoins** : État santé du repo, impact des déploiements, tendances
- **Valeur** : Visibilité rapide sans jongler entre 10 outils

### Secondary Users

#### DSI
- **Usage** : Mensuel (consultation du rapport généré)
- **Besoins** : Vision macro performance, ROI des actions correctives, comparaison M vs M-1
- **Valeur** : Rapport automatisé prêt à présenter, sans effort de compilation

### User Journey

| Étape | Tech Lead / Dev | DSI |
|-------|-----------------|-----|
| **Accès** | Dashboard Watchtower direct | Reçoit le rapport mensuel |
| **Usage quotidien** | Check rapide des anomalies "À investiguer" | N/A |
| **Usage hebdo** | Revue des 4 axes, drill-down si besoin | N/A |
| **Usage mensuel** | Génère le rapport, annote les MEP significatives | Consulte le rapport, décide des priorités |
| **Moment "aha!"** | Corrélation MEP → dégradation visible en 1 clic | ROI des actions correctives prouvé |

---

## Success Metrics

Projet interne sans métriques de succès formelles.

**Objectif principal :** Remplacer la préparation manuelle des rapports mensuels et centraliser la vision santé plateforme.

**Critère de réussite implicite :** L'outil est utilisé et remplace effectivement les captures d'écran manuelles.

---

## MVP Scope

### Core Features (V1 MVP)

**4 Axes de monitoring avec 1 source minimum par axe :**

| Axe | Source MVP | Données |
|-----|------------|---------|
| 🔴 Stabilité | Sentry | Nouvelles erreurs, résolues, taux |
| ⚡ Performance | DebugBear ou Treo | LCP, CLS, INP |
| 🔒 Sécurité | Dependabot | Vulnérabilités par sévérité |
| ✅ Qualité | PHPUnit | Coverage backend par module |

**Fonctionnalités essentielles :**
- Vue par repo (International prioritaire) + vue agrégée
- Comparaison mois vs mois précédent
- **Corrélation MEP → Impact** : overlay des déploiements (GitHub releases) sur les courbes
- Section "À investiguer" : anomalies détectées automatiquement
- Annotations timeline (MEP automatiques, événements manuels)
- Export rapport Markdown
- Drill-down vers outils sources

**Stack technique :**
- Frontend : Nuxt UI
- Hébergement : Cloudflare
- Backend/BDD : Supabase (PostgreSQL)
- Repo : Dédié GitHub

### Out of Scope for MVP

- War room / incident management
- Monitoring SEO positionnement (rankings)
- AMP
- Code legacy (exclu coverage)
- Mobile
- Ownership technique par développeur
- Coverage Pet-Gen & Pet Avatar
- Comparaison cross-repos
- Vue par pays (International)
- Staging / Preprod
- Alertes automatiques (V2)
- Auth (V2)
- Export Miro/Slideshow (V2)

### Future Vision

| Version | Fonctionnalités |
|---------|-----------------|
| **V1.5** | Tous les outils intégrés (Datadog, GSC, Cypress, Jira), multi-repos complet |
| **V2** | Alertes (email + Slack), Auth simple, Export Miro/Slideshow |
| **V2+** | IA corrélation MEP → Impact, Vélocité Jira, accessibilité |
