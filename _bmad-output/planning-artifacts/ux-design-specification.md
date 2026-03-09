---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - product-brief-platform-monitoring-2026-03-09.md
  - brainstorming-session-2026-03-09-session.md
date: 2026-03-09
author: JG
---

# UX Design Specification platform-monitoring

**Author:** JG
**Date:** 2026-03-09

---

## Executive Summary

### Project Vision

Watchtower est un dashboard de monitoring centralisé qui unifie la santé des plateformes Wamiz (International, Pet-Gen, Pet Avatar) en un seul endroit. Il remplace la consultation fragmentée de 10+ outils et automatise la préparation des rapports mensuels actuellement réalisés via captures d'écran manuelles.

### Target Users

- **Tech Lead** : Usage hebdomadaire avec drill-down ponctuel. Besoin de décider quoi prioriser et générer les rapports mensuels en 1 clic.
- **Développeurs** : Usage ponctuel avant/après déploiements. Besoin de visibilité rapide sur la santé du repo sans jongler entre outils.
- **DSI** : Usage mensuel pour consultation du rapport généré. Besoin de rapport prêt à présenter avec ROI des actions correctives visible.

### Key Design Challenges

1. **Visualisation multi-sources** : Afficher les données de 10+ outils sans surcharger l'interface
2. **Corrélation MEP → Impact** : Overlay des déploiements sur les courbes de métriques de façon lisible
3. **Anomalies actionnables** : Section "À investiguer" qui aide à décider, pas qui génère du bruit
4. **Hiérarchie d'information** : Progression claire de la vue globale vers le détail

### Design Opportunities

1. **Section "À investiguer"** : Différenciateur clé vs dashboards classiques — détection automatique de ce qui mérite attention
2. **Timeline des MEP** : Preuve visuelle de l'impact des déploiements, répondant au besoin de corrélation
3. **Rapport mensuel 1-clic** : Moment "aha!" qui élimine les heures de captures d'écran manuelles

## Core User Experience

### Defining Experience

L'expérience core de Watchtower repose sur une action fondamentale : ouvrir le dashboard et **voir immédiatement ce qui nécessite attention** sans avoir à chercher. L'utilisateur doit pouvoir identifier les priorités en moins de 30 secondes.

### Platform Strategy

- **Plateforme** : Application web (Nuxt UI hébergé sur Cloudflare)
- **Devices** : Desktop uniquement — pas de responsive mobile
- **Input** : Souris et clavier
- **Mode visuel** : Dark mode natif
- **Connectivité** : Online uniquement, pas de mode offline

### Effortless Interactions

1. **Check rapide** : Vue synthétique des 4 axes avec indicateurs visuels (vert/orange/rouge) permettant un diagnostic instantané
2. **Corrélation MEP visible** : Overlay automatique des déploiements sur les courbes de métriques — l'utilisateur n'a pas à chercher les corrélations
3. **Drill-down fluide** : Un clic ouvre l'outil source (Sentry, DebugBear, etc.) dans un nouvel onglet
4. **Rapport 1-clic** : Export Markdown complet avec comparaison M/M-1 sans configuration

### Critical Success Moments

- **Premier accès** : L'utilisateur voit immédiatement l'état de santé global, pas une page de configuration ou d'onboarding
- **Détection d'anomalie** : La section "À investiguer" présente des éléments actionnables, pas une liste de faux positifs
- **Corrélation MEP → Impact** : En survolant un marqueur de déploiement, l'utilisateur visualise l'impact sur les métriques adjacentes
- **Génération rapport** : Un clic produit un rapport Markdown prêt à partager

### Experience Principles

1. **Proactif** : Le dashboard indique ce qui est important, il ne se contente pas d'afficher des chiffres
2. **Zéro configuration** : Fonctionnel dès l'ouverture, aucun setup utilisateur requis
3. **Drill-down, pas duplication** : Watchtower agrège et pointe vers les sources, il ne remplace pas les outils existants
4. **Comparaison native** : La vue M vs M-1 est toujours présente, pas une option cachée

## Desired Emotional Response

### Primary Emotional Goals

**Confiance et contrôle** : L'utilisateur sait exactement ce qui se passe sur les plateformes sans stress ni surcharge cognitive. Il se sent informé et capable de prendre des décisions éclairées rapidement.

### Emotional Journey Mapping

| Phase | Émotion cible | Ce qui la crée |
|-------|---------------|----------------|
| Ouverture | Soulagement, clarté | Vue synthétique immédiate des 4 axes |
| Détection anomalie | Alerte sereine | Ton informatif ("À investiguer"), pas alarmiste |
| Investigation | Satisfaction de comprendre | Corrélation MEP visible, drill-down fluide |
| Rapport généré | Accomplissement | Export 1-clic, travail valorisé |
| Usage quotidien | Routine efficace | Interface prévisible et rapide |

### Micro-Emotions

- **Confiance vs Confusion** : Critique — chaque donnée doit être claire et sourcée
- **Maîtrise vs Submersion** : Critique — la hiérarchie visuelle doit filtrer le bruit
- **Accomplissement vs Frustration** : Important — le rapport doit être complet du premier coup

### Design Implications

- **Ton visuel calme** : Dark mode, éviter les rouges agressifs et les animations alarmistes
- **Langage positif** : "À investiguer" plutôt que "ALERTE CRITIQUE"
- **Transparence** : Liens vers les sources pour chaque donnée, l'utilisateur peut vérifier
- **Prévisibilité** : Navigation cohérente, même structure sur tous les écrans

### Emotional Design Principles

1. **Informer, pas alarmer** : Le dashboard aide à comprendre, il ne génère pas de stress
2. **Récompenser l'efficacité** : Chaque action rapide est une petite victoire
3. **Respecter l'expertise** : L'utilisateur est tech, on lui donne des données, pas des conseils condescendants
