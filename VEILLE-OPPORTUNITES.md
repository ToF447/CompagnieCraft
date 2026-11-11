# Veille publique des opportunités

Le catalogue reprend les 23 adresses proposées par ToF, plus la liste nationale d’Artésine (24 entrées). Il est initialisé par `0005_opportunities.sql` dans D1, séparément des données privées des troupes.

## Collecte réelle

Six entrées disposent d’un adaptateur HTML : Spectable, Artésine national, Artésine Pays de la Loire, ARTCENA appels à projets, CND et Arsud. Les autres sources restent des liens classés, explicitement indiqués « Consultation directe ». Réseau 535 répond au serveur mais son contenu mélange formations et aides : aucun import ne lui est attribué avant validation d’un adaptateur.

Lors des essais du 3 novembre 2026, Spectable et ARTCENA répondent HTTP 403. Aucun contournement n’est tenté. Le résultat depuis Cloudflare peut différer du résultat local ; seul le statut enregistré par le serveur en production fait foi.

Le collecteur consulte robots.txt, utilise un agent identifiable et respecte les exclusions. Les destinations sont fixes ; pas de redirection, URL arbitraire, connexion, extraction de coordonnées masquées ni accès à un contenu payant. Maximum 2 Mio par page, délai total de 18 secondes, première page publique uniquement et 60 entrées maximum. Cette couverture reste partielle et n’est pas une liste exhaustive des dates de jeu en France.

On conserve des métadonnées : titre, lien original, lieu, budget publié, date de publication et échéance explicitement identifiée, mots-clés indicatifs. Aucun texte intégral d’annonce n’est conservé. Une date sans année n’est pas complétée automatiquement. La date de publication et la date limite ne deviennent jamais une date de prestation. Une absence de résultat après un changement de structure est une erreur à examiner, pas une collecte vide réussie.

## Rafraîchissement et durée de conservation

La visite de Sources, Trouver où jouer ou Événements & réseaux déclenche les contrôles qui n’ont pas été tentés depuis 24 heures. Le bouton permet un nouveau contrôle ; le serveur impose au moins dix minutes entre deux tentatives et une réservation de collecte de trois minutes pour éviter les appels concurrents.

Les données de chaque source sont écrites en lot. Une réussite date chaque fiche et compare le contenu à la version précédente. Un échec conserve la dernière réussite et les fiches précédentes, avec un avertissement. L’absence sur la dernière page collectée ne prouve pas la fermeture d’une annonce. Les anciennes fiches non revues depuis 180 jours sont retirées du cache public lors du prochain succès ; les sélections déjà sauvegardées par les troupes restent dans leurs dossiers. La lecture de la veille est limitée aux 1 200 fiches les plus récemment modifiées, l’interface affiche 20 résultats par page.

Les adresses originales sont normalisées et dédoublonnées dans l’interface. Les appels dont l’échéance est passée sont masqués par défaut. Les indices artistiques et thématiques ne valent pas validation de compatibilité. Les filtres ne supposent ni budget disponible, ni cachet garanti, ni accès au contact. La préparation d’une démarche n’envoie aucun message.

## Accès et tâche quotidienne

`GET /api/opportunities` et `POST /api/opportunities` demandent une identité personnelle injectée par Sites. Le POST exige une origine identique et un en-tête applicatif. Le choix d’une source est contrôlé par la liste fixe du serveur. Le compte de démonstration admin/admin ne donne aucun droit serveur.

Le serveur MCP de ce Site expose `read_public_opportunities` et `refresh_public_source`. Sites authentifie l’appelant et vérifie l’accès au Site. Ces outils sont limités aux sources publiques et ne lisent pas les candidatures, les profils, les textes ou les disponibilités privées.

Pour un passage quotidien autonome : utiliser le plugin MCP associé au Site, appeler `refresh_public_source` pour chaque source collectable retournée par `read_public_opportunities`, puis relire ce dernier. Les erreurs déjà connues de sources bloquées ne doivent pas déclencher une alerte répétitive. Signaler uniquement une panne nouvelle ou généralisée ou une action humaine nécessaire. Ne pas republier le Site pour actualiser les données et ne pas modifier son audience. Ne pas créer d’annonces de démonstration en production. Le statut activé et l’heure de la tâche doivent être vérifiés dans Sites après création ; le code seul ne prouve pas qu’une tâche existe.

Le paquet PHP Hostinger affiche explicitement que ce service n’est pas encore raccordé sur cet hébergement. Les interfaces et les données de troupe existantes y restent utilisables. La collecte de cette version utilise le serveur Sites/D1.

## Festivals et événements communaux

Le menu « Où proposer votre spectacle ? » comprend Festivals, Événements de commune et Fêtes communales / comités des fêtes. Ces recherches croisent les métadonnées des appels collectés avec l’annuaire des festivals ou le registre des organisateurs (mairies / comités des fêtes). Les fiches d’organisateurs restent distinctes des appels. Les liens de recherche web complémentaires sont externes et ne sont pas présentés comme une collecte interne.

La catégorie d’événement provient d’indices dans le titre et le descriptif propre à l’annonce. Elle ne certifie ni la qualité juridique de l’organisateur ni une programmation ouverte. Une date limite passée est exclue. Les communes sont résolues dans le référentiel public local ; les homonymes ambigus et les lieux non identifiables sont isolés dans « à localiser », jamais annoncés dans le rayon. Les changements de territoire, de catégorie et de troupe invalident les réponses précédentes.

`node check-local-events.cjs` vérifie ces catégories, le dédoublonnage, les homonymes, le rayon, les échéances, les paramètres distincts pour mairies / associations et l’annulation des recherches périmées.

## Vérification

`node check-opportunities.mjs` contrôle les parseurs, les dates ambiguës, l’authentification, l’origine, les réservations concurrentes, les doublons, les modifications et la conservation en cas d’échec. `node check-opportunities-client.cjs` vérifie les filtres, les indices artistiques, la pagination et l’échappement du contenu externe. Les fichiers HTML de test réel restent dans `.runtime/`, hors publication.
