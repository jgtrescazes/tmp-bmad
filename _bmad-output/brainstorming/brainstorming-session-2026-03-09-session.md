---
version: 1.1
date: 2026-03-09
authors: [JG, Laurent]
status: consolidated-reviewed
source_sessions:
  - brainstorming-session-2026-03-09-session.md (JG)
  - brainstorming-session-2026-03-09-001-LAURENT.md (Laurent)
changelog:
  - v1.1: Clarifications gaps fonctionnels (env, backfill, timezone, permissions, anomalies)
  - v1.0: Consolidation initiale
---

# Watchtower — Spécification Consolidée

> Dashboard de monitoring centralisé multi-repos pour la santé plateforme Wamiz

## 1. Vision & Objectifs

### Problème résolu
Automatiser la préparation mensuelle (actuellement : captures d'écran manuelles + analyse) et **détecter automatiquement ce qui est pertinent à signaler** — pas juste afficher des données.

### Objectifs
- Vue unifiée par repo ET agrégée plateforme
- Suivi santé : erreurs, performance, sécurité, qualité code
- Comparaison mois vs mois précédent
- Progression des actions correctives
- Corrélation MEP → Impact prouvable

### Utilisateurs cibles

| Profil | Besoins | Usage |
|--------|---------|-------|
| **Tech Lead** | Erreurs, sécu, tests → Décision d'action | Hebdo + drill-down |
| **DSI** | Vision macro performance + ROI actions | Mensuel comparatif |
| **Devs** | État santé repos | Ponctuel |

---

## 2. Périmètre

### Environnement
- **Production uniquement** (pas de staging/preprod)
- **Vue globale** : pas de segmentation par pays pour International

### Repos surveillés

| Repo | Alias | Priorité |
|------|-------|----------|
| `wamiz/international-website` | International | #1 |
| `wamiz/pet-gen` | Pet-Gen | #2 |
| `wamiz/pet-gen-whitelabel` | Pet Avatar | #2 |

**Note** : Pas de comparaison cross-repos (projets trop différents). Chaque repo est analysé indépendamment.

### Sources de données — Matrice

| Source | International | Pet-Gen | Pet Avatar | Données |
|--------|:---:|:---:|:---:|---------|
| **Sentry** | ✅ | ✅ | ✅ | Erreurs + CWV (field/RUM) |
| **DebugBear** | ✅ | (opt) | (opt) | CWV (lab + field) |
| **Treo.sh** | ✅ | (opt) | (opt) | CWV (CrUX) |
| **GSC** | ✅ | (opt) | (opt) | SEO/Indexation |
| **Datadog APM** | ✅ | (opt) | (opt) | Temps réponse, P95/P99 SQL |
| **GitHub** | ✅ | ✅ | ✅ | Deployments (merge→main), releases |
| **Dependabot** | ✅ | ✅ | ✅ | Vulnérabilités par sévérité + âge |
| **PHPUnit** | ✅ | ❌ | ❌ | Coverage backend par module |
| **Cypress** | ✅ | (opt) | (opt) | Coverage frontend |
| **Jira** | ✅ | ✅ | ✅ | Tickets label "Watchtower" |

**Légende** : ✅ = V1, (opt) = branchable/optionnel, ❌ = hors scope

### Modules coverage PHPUnit (International)
Adoption, Article, Forum, ForumInternational, Shared, Tracking
- Dimensions : Lines, Functions & Methods, Classes & Traits
- Legacy exclu du monitoring

---

## 3. Architecture technique

### Stack validée
- **Frontend** : Nuxt UI
- **Hébergement** : Cloudflare
- **Repo** : Dédié GitHub
- **BDD** : SGBD orienté stats (PostgreSQL/TimescaleDB à valider)
- **Historique** : Pluriannuel avec rétention différenciée

### Collecte des données
- **Fréquence** : Adaptative selon la source
  - Temps réel/quasi : Sentry, GitHub webhooks
  - Quotidien : Dependabot, coverage
  - Hebdo : CWV agrégés, GSC
- **Gestion erreurs** : Retry 3x, flag "collecte incomplète", retry manuel possible
- **Architecture** : Découplée, chaque source indépendante

### Rétention données
| Granularité | Rétention |
|-------------|-----------|
| Journalier | 30 jours |
| Hebdomadaire | 12 mois |
| Mensuel | Pluriannuel |

### Backfill initial
- **Minimum M-1** requis au lancement pour avoir les données comparatives
- À évaluer selon la profondeur historique disponible par API

### Timezone
- **Stockage** : UTC
- **Affichage** : Locale du navigateur

### Credentials
- **V1** : Fichier `.env` (10+ API keys)
- **V2+** : Solution sécurisée si nécessaire

### Permissions GitHub requises
- Read access : commits, releases, PRs
- Dependabot alerts access

### Ajout nouveau repo
- Configuration manuelle (fichier config)

---

## 4. Les 4 Axes de mesure

### Organisation

```
┌─────────────────────────────────────────────────────────────────┐
│                    WATCHTOWER                                    │
│            Période: [Mois Année] vs [Mois-1 Année]              │
├─────────────────────────────────────────────────────────────────┤
│  ⚠️ À INVESTIGUER (X éléments)                      [voir tout] │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 Stabilité    │ ⚡ Performance      │ 🔒 Sécu   │ ✅ Qualité  │
│ +X new -Y fix   │ LCP CLS INP API    │ +X -Y     │ B%   F%     │
├─────────────────────────────────────────────────────────────────┤
│  [Graphe évolution - Vue par défaut]                            │
│  ────●────────●───── 📍MEP v2.4  📝Événement                    │
├─────────────────────────────────────────────────────────────────┤
│  [Section Stabilité - Sentry/Jira]         [drill-down →]       │
├─────────────────────────────────────────────────────────────────┤
│  [Section Performance - Debugbear/Treo/Datadog]                 │
│  (seuils Google en overlay, sources non consolidées)            │
├─────────────────────────────────────────────────────────────────┤
│  [Section Sécurité - Dependabot]                                │
│  (coût de l'inaction : âge × sévérité)                          │
├─────────────────────────────────────────────────────────────────┤
│  [Section Qualité - PHPUnit/Cypress/GSC]                        │
└─────────────────────────────────────────────────────────────────┘
```

### Métriques par axe

| Axe | Headline | Sources | Métriques détaillées |
|-----|----------|---------|---------------------|
| 🔴 **Stabilité** | Nouvelles erreurs, Résolues | Sentry, Jira | Taux erreurs, crashs, temps moyen traitement |
| ⚡ **Performance** | LCP, CLS, INP, Temps API | DebugBear, Treo, Datadog | P95/P99 SQL, Web Vitals par source (non consolidés) |
| 🔒 **Sécurité** | Vulnérabilités ±delta | Dependabot | Par sévérité, âge des alertes, backlog |
| ✅ **Qualité** | Coverage Back%, Front% | PHPUnit, Cypress, GSC | Delta M/M-1, erreurs indexation |

### Stratégie détection anomalies

| Domaine | Méthode |
|---------|---------|
| **Web Vitals** | Seuils absolus Google (LCP<2.5s, INP<200ms, CLS<0.1) + Delta relatif M/M-1 |
| **Backend** | Delta relatif M/M-1 + Tendanciel (alerte si 3 mois consécutifs de dégradation) |
| **Sécurité** | Seuils sur sévérité + âge (vulnérabilité critique > 7j = anomalie) |

**Important** : Indicateurs distincts par catégorie, pas de score santé unique.

---

## 5. UX & Navigation

### Écran d'accueil
- **Vue par défaut** : Graphe d'évolution multi-axes
- **Hiérarchie** : Santé globale → Erreurs critiques → Repos à risque
- **Section "À investiguer"** : Auto-générée, anomalies détectées

### Vues temporelles
- Semaine
- Mois (défaut)
- Année
- Depuis dernier déploiement
- Custom range

### Navigation
- **Sélecteur repos** : International / Pet-Gen / Pet Avatar / Tous
- **Drill-down** : Liens profonds vers outils sources
- **CWV** : Chaque source affichée séparément (pas de consolidation)

### Annotations timeline
- **Automatiques** : Déploiements = merge sur main (releases taguées dans Sentry sur les 3 repos)
- **Manuelles** : Événements externes (campagnes, incidents)
- **Jira** : Repère visuel quand ticket résolu/mis en prod

### Gestion anomalies
- **Faux positifs** : Possibilité d'ignorer/muter une anomalie détectée
- **Données partielles** : Affichage d'un trou dans le graphe + warning visuel

### Design
- Dark mode natif
- Desktop uniquement
- Pas de vues personnalisées

---

## 6. Intégration Jira

### Flux bidirectionnel
1. **Sentry → Jira** : Lien natif existant (traçabilité automatique)
2. **Dashboard → Jira** : Création manuelle depuis le dashboard
3. **Label dédié** : `Watchtower` sur tous les tickets créés
4. **Visualisation** : Repère sur graphes quand ticket terminé/mis en prod

### Tickets correctifs
- Ouverts vs fermés par période
- Vélocité de traitement (V2)

---

## 7. Rapport mensuel

### Contenu
- Comparaison mois vs mois précédent
- Vue transverse santé des repos
- Évolution par axe (Stabilité, Perf, Sécu, Qualité)
- Top problèmes à traiter dans le mois en cours
- Annotations des MEP significatives

### Export
- **V1** : Markdown
- **V2** : Miro via API, Slideshow

---

## 8. Roadmap

| Version | Fonctionnalités | Estimation |
|---------|-----------------|------------|
| **V0** | Investigation APIs + POC Sentry | 1-2 semaines |
| **V1 MVP** | 4 intégrations (1/axe) + drill-down + annotations + rapport MD | 3-4 semaines |
| **V1.5** | Tous les outils intégrés, multi-repos complet | 2-3 semaines |
| **V2** | Alertes (email+Slack), Auth simple, Export Miro/Slideshow | 3-4 semaines |
| **V2+** | IA corrélation MEP→Impact, Vélocité Jira | À planifier |

### MVP V1 — Sources minimum par axe

| Axe | Source MVP |
|-----|------------|
| Stabilité | Sentry |
| Performance | DebugBear ou Treo |
| Sécurité | Dependabot |
| Qualité | PHPUnit |

---

## 9. Hors scope

- War room / incident management
- Monitoring SEO positionnement (rankings)
- AMP
- Code legacy (exclu coverage)
- Mobile
- Ownership technique par développeur
- Coverage Pet-Gen & Pet Avatar (à terme seulement)
- Comparaison cross-repos
- Vue par pays (International)
- Staging / Preprod

---

## 9bis. Questions ouvertes (à traiter plus tard)

| Sujet | Statut | À traiter en |
|-------|--------|--------------|
| Rate limits APIs | À documenter pendant audit | V0 |
| Coûts APIs (DebugBear, Treo.sh) | À vérifier | V0 |
| Accessibilité (a11y) | Non défini | V1.5+ |
| Backup/DR BDD | Non défini | V1.5+ |
| Langue interface | FR par défaut ? | V1 |

---

## 10. Prochaines actions

1. [ ] Auditer les APIs des sources (disponibilité, auth, rate limits, profondeur historique)
2. [ ] Valider SGBD (PostgreSQL vs TimescaleDB vs ClickHouse)
3. [ ] POC collecte Sentry avec les 3 repos (vérifier releases taguées)
4. [ ] Définir schéma BDD unifié
5. [ ] Planifier backfill M-1 pour chaque source
6. [ ] Setup repo Nuxt UI + Cloudflare
7. [ ] Configurer permissions GitHub (read + dependabot) sur les 3 repos
8. [ ] Documenter l'architecture technique

---

## Annexe : Décisions d'arbitrage

| Sujet | Décision | Origine |
|-------|----------|---------|
| Périmètre | Multi-repos avec priorités | Laurent |
| Stack | NuxtUI + Cloudflare | Laurent |
| Collecte | Adaptative | JG |
| Alertes | V2 (V1 = tendanciel) | JG V1, Laurent V2 |
| Score santé | Indicateurs distincts | Laurent |
| Cypress | Inclus | JG |
| Datadog | Optionnel selon repo | Laurent |
| Auth | V2, simple | Laurent |
| UX | Fusion (graphe évolution + 4 axes + À investiguer) | JG + Laurent |
| Jira | Lien natif + label Watchtower | JG + Laurent |

---

*Document consolidé le 2026-03-09 par JG & Laurent — v1.1 avec clarifications gaps*
