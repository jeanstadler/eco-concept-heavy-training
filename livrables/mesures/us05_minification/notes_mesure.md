# Mesure - US05 Minification du JS et du CSS

Mesure faite sur le build de production (`npm run build` puis `npm run preview`), comparée au serveur de dev. La minification concerne toute l'application : le tableau de bord (`/`) et la page Dossiers (`/table`) ont été mesurés avant et après.

Avant (serveur de dev, état post-US04) :
- Tableau de bord : EcoIndex 84 (note A), 223 éléments DOM, 17 requêtes, 0.302 Mo
- Dossiers : EcoIndex 85 (note A), 178 éléments DOM, 20 requêtes, 0.304 Mo

Après US05 (build de production) :
- Tableau de bord : EcoIndex 87 (note A), 221 éléments DOM, 4 requêtes, 0.062 Mo
- Dossiers : EcoIndex 89 (note A), 176 éléments DOM, 6 requêtes, 0.063 Mo

Bilan : tableau de bord 84 → 87, Dossiers 85 → 89. Requêtes divisées par 4 (17 → 4) et poids divisé par 5 (0.302 → 0.062 Mo).

Le build regroupe tout le code dans un seul fichier JS (181 Ko, 57 Ko compressé) et un seul fichier CSS, minifiés. Le DOM ne bouge pas, c'est normal : l'affichage est identique.

Correctif : le proxy `/assets` a été retiré du bloc `preview` de `vite.config.ts`, il redirigeait le JS et le CSS du build vers le backend (page blanche).

Preuves : `ecoindex-us5-avant-dashboard.pdf` et `ecoindex-us5-avant-table.pdf` (avant), `ecoindex-us5-dashboard.png` et `ecoindex-us5-table.png` (après)
