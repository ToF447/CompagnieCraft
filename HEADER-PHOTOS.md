# Renouvellement du header

Le propriétaire peut appeler `read_header_photos`, puis `update_header_photos` via le plugin MCP du Site. Le second outil attend `photos`, sept objets : `title` (titre Commons exact, préfixe File:), `group` (rue, theatre, danse, cirque, musique, marionnettes, collectif), `caption` (français), `position` facultative (par exemple 50% 40%). Une photo par groupe.

Sélectionner et regarder de vraies photographies de spectacle vivant, adaptées au recadrage du bandeau. Rechercher de nouvelles images dans Wikimedia Commons, éviter les sources renvoyées dans recentSources. Vérifier chaque page source. Pas d’images générées ni d’affiches. Le serveur contrôle auteur, licence CC BY/CC BY-SA/CC0 et hôte avant de télécharger les vignettes. Il copie les images dans D1, puis remplace les sept entrées dans une transaction. En cas d’échec, conserver la collection ; ne pas annoncer de mise à jour réussie.

Après écriture, relire read_header_photos et vérifier les sept sources/date. Pas de republication nécessaire. HEADER_EDITOR_EMAIL, secret Sites, identifie l’éditeur autorisé. Aucun appel aux hébergeurs d’images depuis les navigateurs des visiteurs. La collection locale reste le secours initial et en cas de panne ; une page laissée ouverte vérifie les données chaque heure. Les sources précédentes restent consultables pour éviter les répétitions.
