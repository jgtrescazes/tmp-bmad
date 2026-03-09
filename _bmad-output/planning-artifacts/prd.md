---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
classification:
  projectType: web_app
  domain: devops_observability
  complexity: medium
  projectContext: greenfield
inputDocuments:
  - product-brief-watchtower-2026-03-09.md
  - brainstorming-session-2026-03-09-session.md
  - domain-apis-monitoring-tools-research-2026-03-09.md
  - technical-sgbd-time-series-research-2026-03-09.md
  - technical-dashboard-to-presentation-automation-research-2026-03-09.md
  - technical-frequence-polling-monitoring-research-2026-03-09.md
  - technical-modelisation-donnees-analytiques-research-2026-03-09.md
  - technical-polling-vs-storage-monitoring-apis-research-2026-03-09.md
  - technical-supabase-mvp-research-2026-03-09.md
documentCounts:
  briefs: 1
  research: 7
  brainstorming: 1
  projectDocs: 0
workflowType: 'prd'
---

# Product Requirements Document - Watchtower

**Author:** Laurent
**Date:** 2026-03-09

## Executive Summary

Watchtower est un dashboard de monitoring centralisé pour la plateforme Wamiz qui automatise la détection d'anomalies et la génération de rapports mensuels de santé technique. Il remplace un processus entièrement manuel — captures d'écran sur 8+ outils, compilation dans un support, analyse visuelle des tendances — par un système qui collecte, stocke, analyse et signale proactivement les problèmes.

Le produit agrège les données de sources multiples (Sentry, GitHub/Dependabot, DebugBear/Treo, Datadog, Jira, GSC, PHPUnit/Cypress) autour de 4 axes de mesure — Stabilité, Performance, Sécurité, Qualité — avec comparaison mois vs mois précédent, annotations automatiques des déploiements, et une section "À investiguer" auto-générée.

**Utilisateurs cibles :**
- **Tech Lead (utilisateur principal)** : consulte le dashboard hebdomadairement, prépare les rapports mensuels, décide des actions correctives
- **DSI** : vision macro mensuelle de la performance technique et du ROI des investissements
- **Développeurs** : vérification ponctuelle post-déploiement

**Stack technique :** Nuxt UI, hébergé sur Cloudflare, Supabase/PostgreSQL pour le MVP (migration possible vers TimescaleDB/ClickHouse), collecte adaptative par source.

### What Makes This Special

Watchtower n'est pas un dashboard de monitoring de plus — c'est un **analyste automatisé**. Là où Grafana ou Datadog Dashboards affichent des courbes que l'humain doit interpréter, Watchtower fait le travail de synthèse à sa place :

- **Détection proactive vs affichage passif** : seuils absolus (Google CWV), deltas relatifs M/M-1, et analyse tendancielle (3 mois de dégradation consécutive) identifient automatiquement ce qui mérite attention — y compris les dégradations progressives invisibles à l'œil nu
- **Corrélation MEP → Impact** : overlay des déploiements sur les courbes de métriques, rendant l'impact des mises en production mesurable et prouvable
- **Coût de l'inaction rendu visible** : calcul âge × sévérité pour les vulnérabilités, transformant un backlog abstrait en urgence quantifiable
- **Vue transverse unifiée** : un seul endroit pour voir la santé de 3 repos avec des stacks différentes, là où il faut aujourd'hui naviguer entre 8+ outils

L'insight fondamental : les outils existants excellent chacun dans leur domaine, mais aucun ne fait le travail de **synthèse transverse + détection intelligente**. Watchtower comble ce gap.

## Project Classification

| Attribut | Valeur |
|----------|--------|
| **Type de projet** | Web App (SPA/Dashboard) |
| **Domaine** | DevOps / Observabilité interne |
| **Complexité** | Moyenne — intégration multi-APIs et analytics, sans contraintes réglementaires |
| **Contexte** | Greenfield — nouveau produit, pas de codebase existante |

## Success Criteria

### User Success

| Critère | Cible | Mesure |
|---------|-------|--------|
| **Temps de préparation du rapport mensuel** | < 15 min (vs plusieurs heures) | Temps entre ouverture du dashboard et export final |
| **Anomalies détectées automatiquement** | > 80% des anomalies réelles | Ratio anomalies signalées / anomalies totales découvertes |
| **Taux de faux positifs** | < 10% | Anomalies ignorées/mutées par les utilisateurs |
| **Drill-down vers source** | < 2 clics | Clics entre vue d'ensemble et outil source |
| **Adoption Tech Lead** | Consultation hebdomadaire | Fréquence de connexion effective |
| **Adoption DSI** | Consultation mensuelle systématique | Fréquence de connexion profil DSI |

**Moment "aha!" :** Le premier rapport mensuel généré sans aucune capture d'écran manuelle, avec au moins 1 anomalie détectée automatiquement que l'analyse manuelle aurait manquée.

### Business Success

| Horizon | Objectif | Validation |
|---------|----------|-----------|
| **3 mois (V1 MVP)** | 4 sources intégrées (1/axe), dashboard fonctionnel M/M-1 sur International, premier rapport MD auto-généré, section "À investiguer" opérationnelle | Rapport mensuel produit sans capture manuelle |
| **6 mois (V1.5)** | 8+ sources intégrées, multi-repos complet, annotations MEP, intégration Jira bidirectionnelle | Couverture complète des 3 repos |
| **12 mois (V2)** | Alertes proactives, export présentations, corrélation MEP→Impact prouvable, historique pluriannuel | DSI utilise les exports en comité de direction |

### Technical Success

| Critère | Cible |
|---------|-------|
| **Disponibilité dashboard** | > 99% uptime |
| **Fraîcheur des données** | < 24h pour toutes les sources quotidiennes |
| **Temps de chargement** | < 3s pour la vue d'ensemble |
| **Coût infrastructure** | < 50€/mois pour le MVP |
| **Collecte résiliente** | Retry 3x, flag "collecte incomplète", pas de perte silencieuse |

### Measurable Outcomes

Le MVP est **validé** quand :
1. Le rapport mensuel de mars ou avril 2026 est produit intégralement via Watchtower, sans aucune capture d'écran manuelle
2. Chacun des 4 axes affiche des données fraîches et comparables M/M-1 sur le repo International
3. Au moins 1 anomalie réelle est détectée automatiquement lors du premier mois
4. Le Tech Lead consulte le dashboard au moins 1 fois par semaine pendant 1 mois

## Product Scope

### MVP - Minimum Viable Product

**Périmètre :** Repo International uniquement.

**4 intégrations (1 par axe) :**

| Axe | Source MVP | Données |
|-----|-----------|---------|
| Stabilité | Sentry | Nouvelles erreurs, résolues, taux, temps traitement |
| Performance | DebugBear ou Treo | LCP, CLS, INP (lab + field, non consolidés) |
| Sécurité | Dependabot (via GitHub API) | Vulnérabilités par sévérité, âge, backlog |
| Qualité | PHPUnit (via GitHub Actions) | Coverage backend par module |

**Dashboard :**
- Vue par défaut : graphe d'évolution multi-axes, période Mois
- Section "À investiguer" auto-générée
- Comparaison M/M-1
- Drill-down avec liens profonds vers outils sources
- Annotations automatiques des déploiements (merge sur main)
- Dark mode natif, desktop uniquement

**Détection d'anomalies :**
- Seuils absolus Google (LCP<2.5s, INP<200ms, CLS<0.1)
- Delta relatif M/M-1
- Tendanciel (3 mois consécutifs de dégradation)

**Rapport mensuel :** Export Markdown avec comparaison M/M-1, top problèmes, annotations MEP.

**Backfill :** Minimum M-1 au lancement.

### Growth Features (Post-MVP — V1.5)

- Tous les outils intégrés (Datadog, Jira, GSC, Treo, Cypress)
- Multi-repos complet (International + Pet-Gen + Pet Avatar)
- Annotations manuelles pour événements externes
- Gestion faux positifs : ignorer/muter une anomalie
- Intégration Jira bidirectionnelle

### Vision (Future — V2+)

- Alertes proactives (email + Slack)
- Authentification simple
- Export Miro/Slideshow pour présentations
- Vues temporelles étendues (Semaine, Année, Custom range)
- IA corrélation MEP → Impact automatisée
- Vélocité de traitement Jira
- Création de tickets depuis le dashboard

## User Journeys

### Journey 1 : Tech Lead — Routine hebdomadaire de surveillance

**Persona :** Laurent, Tech Lead de la plateforme Wamiz, supervise 3 repos avec des stacks différentes.

**Opening Scene :** Lundi matin, Laurent ouvre Watchtower avant son standup. Jusqu'ici, il devait jongler entre Sentry, Dependabot, DebugBear et GitHub pour avoir une vue d'ensemble — un processus frustrant qui prenait facilement 30 minutes et ne garantissait pas de tout voir.

**Rising Action :** Le dashboard s'affiche en <3s. La section "À investiguer" en haut de page montre immédiatement 2 éléments :
- Une alerte tendancielle : le LCP du site International se dégrade pour le 3ème mois consécutif (+180ms depuis janvier)
- Une vulnérabilité critique Dependabot ouverte depuis 12 jours (score âge × sévérité élevé)

Laurent clique sur l'alerte LCP. Le graphe d'évolution s'affiche avec les annotations MEP : il remarque que la dégradation a commencé après le déploiement v2.3.1 en janvier. Un clic de plus l'amène directement sur DebugBear pour les détails lab/field.

**Climax :** Sans Watchtower, cette dégradation progressive de 60ms/mois serait passée inaperçue pendant des mois. L'outil a fait le travail de corrélation que l'humain ne fait pas systématiquement.

**Resolution :** Laurent note les 2 actions à traiter cette semaine. En 5 minutes, il a une vue complète de la santé de la plateforme et des priorités claires. Il arrive au standup avec des données factuelles.

**Capabilities révélées :** Dashboard avec temps de chargement <3s, section "À investiguer" auto-générée, détection tendancielle multi-mois, annotations MEP sur graphes, drill-down en <2 clics vers outils sources.

---

### Journey 2 : Tech Lead — Génération du rapport mensuel

**Persona :** Laurent, fin de mois, doit préparer le rapport de santé pour le DSI.

**Opening Scene :** Dernier vendredi du mois. Auparavant, Laurent bloquait 2-3 heures : ouvrir chaque outil un par un, capturer des screenshots, les coller dans un document, rédiger des commentaires, identifier manuellement les tendances. Un processus pénible et incomplet.

**Rising Action :** Laurent ouvre Watchtower et sélectionne la période "Mars 2026". Le dashboard affiche automatiquement la comparaison M/M-1 sur les 4 axes :
- Stabilité : -12 erreurs nouvelles vs février, 8 résolues (Sentry)
- Performance : LCP stable à 2.1s, INP amélioré de 15ms (DebugBear)
- Sécurité : 2 vulnérabilités critiques fermées, 1 nouvelle ouverte depuis 3 jours (Dependabot)
- Qualité : Coverage backend passée de 67% à 71% sur le module Adoption (PHPUnit)

Les annotations MEP montrent 4 déploiements sur le mois avec leur impact visible sur les courbes.

**Climax :** Laurent clique "Exporter Markdown". En quelques secondes, un rapport structuré est généré avec les comparaisons, les top problèmes, et les annotations — le même travail qui prenait des heures, fait en minutes.

**Resolution :** Laurent relit le rapport, ajuste 2-3 formulations, et l'envoie au DSI. Total : 10 minutes au lieu de 2-3 heures. Le rapport est plus complet et plus fiable que ce qu'il produisait manuellement.

**Capabilities révélées :** Comparaison M/M-1 automatique sur 4 axes, export Markdown structuré, annotations MEP intégrées au rapport, données agrégées par période.

---

### Journey 3 : DSI — Revue mensuelle pour comité de direction

**Persona :** Le Directeur des Systèmes d'Information, a besoin d'une vision macro pour justifier les investissements techniques.

**Opening Scene :** Réunion mensuelle de direction. Le DSI reçoit le rapport Markdown de Laurent. Auparavant, il recevait un document hétérogène avec des screenshots de résolutions variables et des analyses de qualité variable selon le temps que Laurent avait pu y consacrer.

**Rising Action :** Le rapport Watchtower est structuré et standardisé. Le DSI parcourt les 4 axes en quelques minutes. Il note que :
- La stabilité s'est améliorée grâce à 3 corrections ciblées ce mois
- Le déploiement v2.4 a réduit le taux d'erreurs de 40% — l'annotation MEP sur le graphe le prouve visuellement
- Le backlog sécurité a diminué de 5 vulnérabilités

**Climax :** Pour la première fois, le DSI peut **prouver factuellement** l'impact des investissements techniques : "Le déploiement v2.4 a réduit les erreurs de 40%". Ce n'est plus une affirmation — c'est un fait corrélé et daté.

**Resolution :** Le DSI présente le rapport en comité avec confiance. Les données standardisées permettent une comparaison mois après mois. Il demande à Laurent de continuer à prioriser la sécurité vu le score âge × sévérité encore élevé sur 1 vulnérabilité.

**Capabilities révélées :** Rapport lisible par un non-technique, corrélation MEP → Impact prouvable, standardisation des données mois après mois, score de priorisation (âge × sévérité).

---

### Journey 4 : Développeur — Vérification post-déploiement

**Persona :** Alex, développeur frontend, vient de merger une PR majeure sur le repo International.

**Opening Scene :** Alex vient de déployer une refonte du composant de recherche. Il veut vérifier rapidement que rien n'a cassé côté performance et stabilité. Avant Watchtower, il devait ouvrir Sentry, puis DebugBear, comparer mentalement avec les valeurs d'avant — s'il pensait à le faire.

**Rising Action :** Alex ouvre Watchtower. Le graphe d'évolution montre son déploiement annoté automatiquement (détecté via merge sur main). Il regarde les courbes :
- Pas de pic d'erreurs Sentry post-MEP
- LCP stable, pas de régression
- Un léger bump de CLS (+0.02) visible juste après la MEP

**Climax :** Le bump de CLS est mineur (toujours sous le seuil Google de 0.1) mais visible. Sans Watchtower, il ne l'aurait probablement pas remarqué. Il note de surveiller ça sur les prochains jours.

**Resolution :** En 2 minutes et sans quitter un seul outil, Alex a confirmé que son déploiement n'a pas dégradé la plateforme. Il passe à sa prochaine tâche sereinement.

**Capabilities révélées :** Annotations automatiques des déploiements, visualisation impact post-MEP en temps quasi-réel, seuils Google en overlay pour contextualiser les valeurs.

---

### Journey Requirements Summary

| Capability | J1 (Hebdo) | J2 (Rapport) | J3 (DSI) | J4 (Post-MEP) |
|-----------|:---:|:---:|:---:|:---:|
| Section "À investiguer" auto-générée | ✅ | | | |
| Détection tendancielle (3 mois) | ✅ | | | |
| Détection seuils absolus (CWV) | ✅ | | | ✅ |
| Détection delta M/M-1 | ✅ | ✅ | | |
| Score âge × sévérité (vulnérabilités) | ✅ | | ✅ | |
| Annotations MEP automatiques | ✅ | ✅ | ✅ | ✅ |
| Graphe d'évolution multi-axes | ✅ | ✅ | | ✅ |
| Comparaison M/M-1 par axe | | ✅ | ✅ | |
| Export Markdown | | ✅ | ✅ | |
| Drill-down liens profonds | ✅ | | | ✅ |
| Chargement < 3s | ✅ | | | ✅ |

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approche MVP :** Problem-solving MVP — résoudre le problème immédiat du rapport mensuel manuel avec le minimum de sources nécessaires pour prouver la valeur.

**Ressources :** Solo dev (Laurent). Cela implique une approche incrémentale stricte, avec des choix techniques privilégiant la simplicité (Supabase managed, Nuxt UI composants prêts à l'emploi).

**MVP minimal absolu (fallback) :** Si les contraintes de temps ou de complexité technique l'exigent, le MVP peut être réduit à 2 axes (Stabilité + Performance) au lieu de 4. Ces 2 axes couvrent le cœur du "moment aha" : voir les erreurs et les Web Vitals sur un seul dashboard avec annotations MEP.

### MVP Feature Set (Phase 1)

**Journeys supportés :**
- J1 (Routine hebdomadaire) — partiel : dashboard + section "À investiguer"
- J2 (Rapport mensuel) — complet : comparaison M/M-1 + export Markdown
- J4 (Post-déploiement) — partiel : annotations MEP + drill-down

**Must-Have :**
- 4 intégrations (1/axe) : Sentry, DebugBear/Treo, Dependabot, PHPUnit
- Dashboard avec graphe d'évolution, période Mois
- Comparaison M/M-1
- Section "À investiguer" auto-générée
- Annotations automatiques des déploiements
- Détection d'anomalies (seuils absolus + delta M/M-1 + tendanciel 3 mois)
- Export Markdown
- Backfill M-1
- Dark mode, desktop uniquement

### Post-MVP Features

**Phase 2 — Growth (V1.5) :**
- Intégrations complètes (Datadog, Jira, GSC, Treo, Cypress)
- Multi-repos (International + Pet-Gen + Pet Avatar)
- Annotations manuelles (événements externes)
- Gestion faux positifs (ignorer/muter)
- Intégration Jira bidirectionnelle

**Phase 3 — Expansion (V2+) :**
- Alertes proactives (email + Slack)
- Authentification simple
- Export Miro/Slideshow
- Vues temporelles étendues
- IA corrélation MEP → Impact
- Vélocité Jira, création tickets depuis dashboard

### Risk Mitigation Strategy

**Risque technique principal — Collecte résiliente :**
- *Risque :* Les APIs sources peuvent être indisponibles, rate-limitées, ou retourner des données partielles. Une perte silencieuse de données fausserait les analyses M/M-1.
- *Mitigation :* Retry 3x avec backoff exponentiel, flag "collecte incomplète" visible sur le dashboard, trou dans le graphe + warning visuel pour les données manquantes. Chaque source collectée indépendamment (une source en échec n'impacte pas les autres).

**Risque ressource — Solo dev :**
- *Risque :* Scope trop ambitieux pour un développeur seul, risque d'enlisement.
- *Mitigation :* MVP réductible à 2 axes si nécessaire. Approche itérative : 1 axe fonctionnel end-to-end avant de passer au suivant. Stack simplifiée (Supabase managed, Nuxt UI composants prêts).

**Risque données — Backfill M-1 :**
- *Risque :* Profondeur historique variable selon les APIs. Certaines sources peuvent ne pas offrir M-1 complet.
- *Mitigation :* Auditer la profondeur historique de chaque API en V0 (POC). Accepter des données partielles pour le premier mois avec indication claire dans le rapport.
