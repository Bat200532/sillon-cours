# Cours agricoles de Sillon

Cours publiés chaque soir de semaine (après la clôture d'Euronext) par la tâche planifiée « Cours agricoles quotidiens », et lus directement par l'application Sillon (https://sillon-ferme.netlify.app, onglet Marchés).

- `prix.json` : cours du jour (Euronext et marchés physiques).
- `cours-historique.json` : un point par séance, pour les courbes.
- `phyto.json` : catalogue des produits phytosanitaires (n° d'AMM, nom, autorisé ou retiré), construit chaque mercredi par le workflow « Catalogue phyto (E-Phy) » à partir des données ouvertes de l'ANSES (`scripts/phyto.mjs`). Sillon s'en sert pour alerter quand un produit du stock est retiré du marché.
- `actu.json` : actualité réglementaire vérifiée (eau, phyto, PAC, registre…), écrite chaque vendredi par l'Agent Veille réglementaire et affichée dans l'encadré « À savoir » de l'accueil, filtrée par département, cultures et produits du stock.

Ce dépôt est public pour que l'application puisse lire les cours sans redéployer le site. Il ne contient aucune donnée d'exploitation. Ne pas modifier ces fichiers à la main : `prix.json` et `cours-historique.json` appartiennent à la tâche des cours, `phyto.json` au workflow, `actu.json` à l'Agent Veille.
