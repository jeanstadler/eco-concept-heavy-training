# Mesure - US04 Pagination et détail à la demande

Mesure faite sur la page Dossiers (`/table`), seule page concernée par cette US. Contrairement aux US précédentes (mesurées sur le tableau de bord), l'état avant n'est pas la mesure de l'US03 : une mesure dédiée de `/table` a été faite avant la modification (`ecoindex-us4-avant.pdf`), puis après (`ecoindex-us4.pdf`).

Avant (état post-US03, page `/table`) : EcoIndex 83 (note A), 254 éléments DOM, 19 requêtes, 0.311 Mo.

Après US04 :
- EcoIndex : 85 / 100 (note A)
- Poids : 0.304 Mo
- Éléments DOM : 178
- Requêtes : 20
- Empreinte (1000 visites/mois) : 1.3 kgCO2e, 19.5 l d'eau

Lighthouse (`/table`) : Performance 88 → 91. Accessibilité 100, Bonnes pratiques 100, SEO 82 (inchangés).

Bilan : +2 points EcoIndex (83 → 85) et DOM -76 éléments (254 → 178).

La liste affiche 10 dossiers par page au lieu de 18, sans les notes ni l'historique, qui sont chargés à l'ouverture d'un dossier. La réponse `/api/records` passe de ~145 Ko (180 dossiers complets) à ~1 Ko. Les requêtes augmentent de 1, c'est normal : le détail du dossier ouvert est désormais un appel séparé.

Preuves : `ecoindex-us4-avant.pdf` et `lighthouse-us4-avant.png` (avant), `ecoindex-us4.pdf` et `lighthouse-us4.png` (après)
