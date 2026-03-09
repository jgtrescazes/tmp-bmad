---
stepsCompleted: [1, 2, 3, 4, 5, 6]
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
author: Laurent
---

# Product Brief: Watchtower

## Executive Summary

Watchtower est un dashboard de monitoring centralisé multi-repos pour la santé de la plateforme Wamiz. Il automatise la préparation des rapports mensuels — actuellement réalisés via captures d'écran manuelles et analyses ad hoc — et détecte automatiquement les éléments pertinents à signaler plutôt que de simplement afficher des données brutes.

Le produit offre une vue unifiée par repository et agrégée à l'échelle de la plateforme, organisée autour de 4 axes de mesure : Stabilité, Performance, Sécurité et Qualité. Il permet la comparaison mois vs mois précédent, le suivi de la progression des actions correctives, et la corrélation entre mises en production et leur impact mesurable.

---

## Core Vision

### Problem Statement

La préparation mensuelle des rapports de santé de la plateforme Wamiz est un processus entièrement manuel : captures d'écran sur de multiples outils (Sentry, DebugBear, Dependabot, GitHub, Datadog, Jira...), compilation dans un support de présentation, et analyse manuelle des tendances. Ce processus est chronophage, sujet aux erreurs, et ne détecte que ce que l'analyste pense à chercher.

### Problem Impact

- **Temps perdu** : Plusieurs heures par mois pour produire un rapport qui pourrait être automatisé
- **Détection tardive** : Les dégradations progressives (3 mois de régression backend, vulnérabilités vieillissantes) passent inaperçues sans suivi systématique
- **Données fragmentées** : Pas de corrélation entre une mise en production et son impact réel sur les métriques de stabilité ou de performance
- **Vision incomplète** : Impossible d'avoir une vue transverse instantanée de la santé de 3 repos avec des stacks différentes

### Why Existing Solutions Fall Short

- **Outils de monitoring existants** (Sentry, Datadog, DebugBear) : Chacun excelle dans son domaine mais ne propose pas de vue transverse unifiée ni de comparaison temporelle automatisée entre repos
- **Dashboards génériques** (Grafana, Datadog Dashboards) : Requièrent une configuration extensive et ne font pas la corrélation MEP → Impact automatiquement
- **Rapports manuels** : Pas de détection automatique d'anomalies, pas de section "À investiguer" auto-générée, aucune traçabilité des actions correctives via Jira

### Proposed Solution

Un dashboard dédié, hébergé sur Cloudflare, construit avec Nuxt UI, qui :
1. **Collecte automatiquement** les données de 8+ sources (Sentry, GitHub, Dependabot, DebugBear/Treo, Datadog, Jira, GSC, PHPUnit/Cypress) avec des fréquences adaptatives
2. **Stocke et agrège** les métriques dans un SGBD orienté analytics avec rétention différenciée (journalier 30j, hebdo 12 mois, mensuel pluriannuel)
3. **Détecte les anomalies** via seuils absolus (Google CWV), deltas relatifs M/M-1, et tendanciels (3 mois consécutifs de dégradation)
4. **Génère des rapports** comparatifs mois vs mois précédent avec annotations automatiques des déploiements et événements Jira
5. **Propose une section "À investiguer"** auto-générée listant les éléments nécessitant attention

### Key Differentiators

- **Détection intelligente vs affichage passif** : Watchtower ne se contente pas de montrer des données — il signale proactivement ce qui mérite attention
- **Corrélation MEP → Impact** : Annotation automatique des déploiements sur les courbes de métriques, permettant de prouver l'impact des mises en production
- **Multi-sources sans consolidation forcée** : Chaque source de CWV est affichée séparément (pas de moyenne trompeuse entre lab et field data)
- **Intégration Jira bidirectionnelle** : Création de tickets depuis le dashboard avec label "Watchtower", repères visuels quand un ticket est résolu/déployé
- **Coût de l'inaction visible** : Calcul âge × sévérité pour les vulnérabilités, rendant tangible le coût de ne pas agir

---

## Target Users

### Primary Users

#### Tech Lead — "Laurent"

- **Contexte** : Responsable technique de la plateforme Wamiz, supervise 3 repos (International, Pet-Gen, Pet Avatar). Prépare les rapports mensuels de santé et prend les décisions d'action corrective.
- **Problème vécu** : Passe plusieurs heures par mois à collecter manuellement des captures d'écran sur 8+ outils différents, compiler les données, et identifier à l'œil les tendances et anomalies. Les dégradations progressives lui échappent faute de suivi automatisé.
- **Usage** : Hebdomadaire + drill-down ponctuel. Consulte les erreurs, la sécurité, les tests. Décide quelles actions correctives prioriser.
- **Moment "aha !"** : Ouvrir Watchtower et voir immédiatement la section "À investiguer" avec 3 anomalies détectées automatiquement qu'il n'aurait pas remarquées manuellement, dont une dégradation LCP progressive sur 3 mois.
- **Succès** : Préparation du rapport mensuel réduite de plusieurs heures à quelques minutes de revue et ajustement.

#### DSI — "Le Directeur"

- **Contexte** : Direction des systèmes d'information. A besoin d'une vision macro de la performance technique et du ROI des actions correctives pour les comités de direction.
- **Problème vécu** : Reçoit des rapports manuels avec un niveau de détail variable, sans comparaison temporelle standardisée ni preuve d'impact des investissements techniques.
- **Usage** : Mensuel, vue comparative. Consulte l'évolution globale par axe (Stabilité, Performance, Sécurité, Qualité) et les tendances.
- **Moment "aha !"** : Voir sur un graphe que le déploiement v2.4 a réduit le taux d'erreurs de 40%, avec l'annotation automatique de la MEP corrélée à la courbe.
- **Succès** : Disposer d'un rapport mensuel auto-généré, exportable, qui prouve l'impact des décisions techniques.

### Secondary Users

#### Développeurs — "L'équipe dev"

- **Contexte** : Développeurs travaillant sur les repos Wamiz. Consultent ponctuellement l'état de santé de leurs repos.
- **Usage** : Ponctuel, lors du triage de bugs ou après un déploiement. Utilisent le drill-down pour accéder aux liens profonds vers Sentry, Datadog, etc.
- **Succès** : Vérifier en un clic si leur dernier déploiement a eu un impact négatif sur les métriques.

### User Journey

| Étape | Tech Lead | DSI | Devs |
|-------|-----------|-----|------|
| **Découverte** | Configure les sources et repos au setup | Reçoit le premier rapport mensuel | Lien partagé par le Tech Lead |
| **Onboarding** | Connecte les API keys, vérifie le backfill M-1 | Aucun — consulte directement | Aucun — consulte directement |
| **Usage principal** | Hebdo : check anomalies + drill-down | Mensuel : rapport comparatif | Ponctuel : état post-déploiement |
| **Valeur perçue** | Détection automatique d'anomalies | Preuve d'impact, vue macro | Vérification rapide post-MEP |
| **Long terme** | Suivi de la vélocité des corrections via Jira | Historique pluriannuel des tendances | Réflexe de consultation après chaque MEP |

---

## Success Metrics

### User Success Metrics

| Métrique | Cible | Mesure |
|----------|-------|--------|
| **Temps de préparation du rapport mensuel** | < 15 min (vs plusieurs heures actuellement) | Temps entre ouverture du dashboard et export final |
| **Anomalies détectées automatiquement** | > 80% des anomalies réelles | Ratio anomalies signalées par Watchtower / anomalies totales découvertes |
| **Taux de faux positifs** | < 10% | Anomalies ignorées/mutées par les utilisateurs |
| **Drill-down vers source** | < 2 clics | Nombre de clics entre vue d'ensemble et outil source (Sentry, Datadog...) |
| **Adoption DSI** | Consultation mensuelle systématique | Fréquence de connexion du profil DSI |

### Business Objectives

**À 3 mois (V1 MVP) :**
- 4 sources intégrées (1 par axe : Sentry, DebugBear/Treo, Dependabot, PHPUnit)
- Dashboard fonctionnel avec comparaison M/M-1 sur le repo International
- Premier rapport mensuel auto-généré en Markdown
- Section "À investiguer" opérationnelle avec détection d'anomalies

**À 6 mois (V1.5) :**
- Tous les outils intégrés (8+ sources)
- Multi-repos complet (International, Pet-Gen, Pet Avatar)
- Annotations MEP automatiques sur les graphes
- Intégration Jira bidirectionnelle fonctionnelle

**À 12 mois (V2) :**
- Alertes proactives (email + Slack)
- Export vers Miro/Slideshow pour présentations
- Corrélation MEP → Impact prouvable
- Historique pluriannuel exploitable

### Key Performance Indicators

| KPI | Cible | Fréquence de mesure |
|-----|-------|---------------------|
| **Couverture des sources** | 100% des sources V1 intégrées | Mensuel |
| **Fraîcheur des données** | Données < 24h pour toutes les sources quotidiennes | Continu |
| **Disponibilité dashboard** | > 99% uptime | Continu |
| **Temps de chargement** | < 3s pour la vue d'ensemble | Continu |
| **Tickets Watchtower créés** | Suivi du nombre de tickets créés via le dashboard | Mensuel |
| **Actions correctives trackées** | > 50% des anomalies détectées donnent lieu à un ticket | Mensuel |
| **Coût infrastructure** | < 50€/mois pour le MVP | Mensuel |

---

## MVP Scope

### Core Features (V1 MVP)

**Infrastructure :**
- Repo dédié GitHub, hébergé sur Cloudflare
- Frontend Nuxt UI, dark mode natif, desktop uniquement
- SGBD orienté analytics (Supabase/PostgreSQL pour le MVP, migration possible vers TimescaleDB/ClickHouse)
- Collecte adaptative par source avec retry 3x et flag "collecte incomplète"
- Backfill minimum M-1 au lancement

**4 intégrations minimum (1 par axe) :**

| Axe | Source MVP | Données collectées |
|-----|------------|-------------------|
| 🔴 Stabilité | Sentry | Nouvelles erreurs, résolues, taux, temps traitement |
| ⚡ Performance | DebugBear ou Treo | LCP, CLS, INP (lab + field, non consolidés) |
| 🔒 Sécurité | Dependabot (via GitHub API) | Vulnérabilités par sévérité, âge, backlog |
| ✅ Qualité | PHPUnit (via GitHub Actions artifacts) | Coverage backend par module (Lines, Functions, Classes) |

**Dashboard :**
- Vue par défaut : graphe d'évolution multi-axes avec période Mois
- Section "À investiguer" auto-générée avec anomalies détectées
- Sélecteur de repos : International (priorité #1)
- Comparaison mois vs mois précédent
- Drill-down avec liens profonds vers outils sources
- Annotations automatiques des déploiements (merge sur main)
- Corrélation MEP → Impact : overlay des releases (tags GitHub/Sentry) sur les courbes de métriques pour visualiser l'impact des déploiements

**Détection d'anomalies :**
- Seuils absolus Google pour Web Vitals (LCP<2.5s, INP<200ms, CLS<0.1)
- Delta relatif M/M-1
- Tendanciel (alerte si 3 mois consécutifs de dégradation)

**Rapport mensuel :**
- Export Markdown avec comparaison M/M-1, top problèmes, annotations MEP

### Out of Scope for MVP

- War room / incident management
- Monitoring SEO positionnement (rankings)
- AMP
- Code legacy (exclu de la coverage)
- Mobile / responsive
- Ownership technique par développeur
- Coverage Pet-Gen & Pet Avatar
- Comparaison cross-repos
- Vue par pays (International)
- Staging / Preprod
- Alertes proactives (email, Slack) → V2
- Authentification → V2
- Export Miro/Slideshow → V2
- Vélocité Jira → V2+
- Annotations manuelles (événements externes) → V1.5
- Intégration Jira bidirectionnelle complète → V1.5
- Vues personnalisées

### MVP Success Criteria

| Critère | Validation |
|---------|-----------|
| **Rapport mensuel automatisé** | Premier rapport généré sans capture d'écran manuelle |
| **4 axes fonctionnels** | Chaque axe affiche des données fraîches et comparables M/M-1 |
| **Détection d'anomalies** | Au moins 1 anomalie réelle détectée automatiquement lors du premier mois |
| **Adoption Tech Lead** | Consultation hebdomadaire effective du dashboard |
| **Gain de temps** | Préparation rapport réduite à < 15 min |
| **Stabilité technique** | Dashboard disponible > 99%, données < 24h de retard |

### Future Vision

**V1.5 (2-3 semaines après V1) :**
- Tous les outils intégrés (Datadog, Jira, GSC, Treo, Cypress)
- Multi-repos complet (International + Pet-Gen + Pet Avatar)
- Annotations manuelles pour événements externes (campagnes, incidents)
- Gestion faux positifs : ignorer/muter une anomalie

**V2 (3-4 semaines après V1.5) :**
- Alertes proactives (email + Slack)
- Authentification simple
- Export Miro/Slideshow pour présentations
- Vues temporelles étendues (Semaine, Année, Custom range, Depuis dernier déploiement)

**V2+ (à planifier) :**
- IA corrélation MEP → Impact automatisée (détection automatique des impacts significatifs sans analyse manuelle)
- Vélocité de traitement Jira
- Intégration Jira avancée : création de tickets depuis le dashboard
