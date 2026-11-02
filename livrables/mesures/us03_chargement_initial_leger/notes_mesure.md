# Mesure - US03 Chargement initial léger

Avant (état post-US02) : EcoIndex 83 (note A), 223 éléments DOM, 22 requêtes, 0.309 Mo.

Après US03 :
- EcoIndex : 84 / 100 (note A)
- Poids : 0.3 Mo
- Éléments DOM : 223
- Requêtes : 17
- Empreinte (1000 visites/mois) : 1.32 kgCO2e, 19.8 l d'eau

Lighthouse : Performance 91. Accessibilité 100, Bonnes pratiques 100, SEO 82 (inchangés).

Bilan : requêtes 22 → 17 (-5) et +1 point EcoIndex (83 → 84).

Au démarrage, seul `/api/dashboard` est appelé au lieu de 4 endpoints : les dossiers, l'analyse et les réglages ne sont chargés qu'à l'ouverture de leur page. Le DOM ne bouge pas, c'est normal : l'affichage est identique, seules les données chargées changent.

Preuves : `ecoindex-us3.pdf`, `lighthouse-us3-scores.png`, `lighthouse-us3-metriques.png`
