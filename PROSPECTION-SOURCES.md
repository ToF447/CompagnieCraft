# Prospection Grand Ouest — première livraison

Sources consultées le 31 octobre 2026. La sélection ne contient aucune date de représentation promise à une troupe. Les profils de troupes fictives servent à tester la qualification ; aucun contact n’est sollicité en leur nom.

## Pages officielles documentées

- [La Déferlante — contact et modalités de programmation](https://www.ladeferlante.com/contact/) : procédure auprès des programmateurs des villes ; pas de date libre publiée.
- [La Déferlante — soutien à la création](https://www.ladeferlante.com/aide-a-la-creation/) : demandes 2027 closes ; veille uniquement.
- [Le Fourneau — contacts](https://www.lefourneau.com/infos-pratiques/article/contacts) : moyens de soutien 2026 et 2027 déjà attribués ; pas d’ouverture supposée.
- [Les Rias — organisateurs](https://www.lesrias.com/contact/) : identifier la programmation auprès des structures organisatrices, sans utiliser le contact presse par défaut.
- [Le Carroi — présentation](https://lecarroi.org/presentation/) : saison, jeune public et festival Les Affranchis ; conditions IN/OFF à vérifier.
- [Très Tôt Théâtre](https://www.tres-tot-theatre.com/) : jeune public et réseau territorial ; pas de candidature ni d’échéance inventée.
- [Petits et Grands — espace professionnel](https://www.petitsetgrands.net/espace-pro/) : rencontres professionnelles ; les informations d’anciennes éditions ne constituent pas une ouverture actuelle.
- [Le Chainon — Régions en Scènes](https://www.lechainon.fr/regions-en-scenes/) : repérage territorial ; dates annoncées pour les rencontres en Sarthe et à Carhaix, jamais copiées dans une date de jeu.
- [CHU de Rennes — Culture à l’hôpital](https://www.chu-rennes.fr/a-propos-du-chu-de-rennes/engagements-du-chu/culture-a-lhopital-955.html) et [CHU de Nantes — Culture et santé](https://www.chu-nantes.fr/culture-et-sante) : projets à construire avec le référent culturel ; aucune prospection auprès des urgences ou services cliniques.

## Recherche en direct

API publique `tabular-api.data.gouv.fr`, CORS vérifié, requêtes de vingt résultats. Les filtres utilisent les noms de champs et les opérateurs publiés dans le Swagger de chaque ressource. Le navigateur transmet uniquement les critères publics saisis (zone, ville, nom), sans session de l’atelier ni données de troupe. Aucune clé API nécessaire.

- [Liste des festivals en France — ministère de la Culture](https://www.data.gouv.fr/datasets/liste-des-festivals-en-france), ressource `47ac11c2-8a00-46a7-9fa8-9b802643f975`. Des éditions historiques figurent dans cette base : consulter une fiche n’actualise pas son contenu.
- [Basilic — ministère de la Culture](https://www.data.gouv.fr/datasets/base-des-lieux-et-equipements-culturels-basilic), ressource `dced78ee-0823-4b61-86e6-57717308d4e4`. Lieux de spectacle et bibliothèques ; statut actif dans la base demandé, sans déduire l’actualité du calendrier ni les possibilités d’accueil.

La date d’exécution de la requête est distincte de la date de vérification du site et du contact. Un résultat d’annuaire reste « à qualifier ». Les annuaires ne donnent pas les créneaux disponibles des EHPAD.

## Parcours opérationnel

Choisir un spectacle → corriger ses critères → filtrer ou chercher → lire la source → garder en veille → préparer la démarche → contact et demande reliés → échéance/responsable → suivi dans Demandes & relances. La conversion ne confirme pas de date, ne contacte personne et n’abonne jamais à une newsletter.

Rapprochement déterministe par critères communs explicités, sans pourcentage de réussite. La compatibilité technique, la jauge, le budget, le territoire d’éligibilité et les disponibilités restent à vérifier. Un modèle de message est téléchargeable et doit être relu, personnalisé et envoyé manuellement par une vraie structure. Export CSV avec neutralisation des débuts de cellules interprétables comme formules.

Les lectures de sources ne sont pas surveillées automatiquement. Après quatorze jours, la sélection statique indique une relecture nécessaire. Les campagnes closes restent en veille. Les erreurs d’annuaire sont affichées et les résultats précédents conservent leur contexte.

Tests : `node check-prospection.cjs` ; `node check-prospection.cjs --live` pour les endpoints publics. Le backend Hostinger enregistre les nouveaux champs lorsqu’il est configuré ; le lien Sites reste local au navigateur.

## France et lieux de proximité
Suggestions de communes (nom, département, code postal) via https://geo.api.gouv.fr/communes, temporisation et annulation des recherches précédentes. Suggestions internes dans tous les champs texte et recherche, y compris les fiches modales. Seuls les champs de recherche, ville et lieu interrogent le service de communes.
Repérage national via https://recherche-entreprises.api.gouv.fr/docs/ : code commune INSEE, unité légale active, associations des secteurs P/Q/R/S, accueil social Q, ou cafés et lieux artistiques selon activité déclarée. Pagination 25. Vérification de chaque établissement correspondant à la commune et actif. Aucun nom de dirigeant ou donnée clinique importé. La présence dans un registre ne prouve ni une programmation ni une disponibilité ou indépendance. Recherche externe d’événements distincte des pistes importées.
OpenStreetMap/Overpass a été écarté après tests de disponibilité infructueux ; aucun appel Overpass dans le produit livré.

## Territoires, aides et réseaux — 31 octobre 2026
Ville de recherche enregistrée par troupe, indépendante du siège du dossier. Commune, département et région récupérés auprès de Geo.gouv. Filtres exacts sur les colonnes officielles des annuaires ; filtres département/région également vérifiés sur Recherche entreprises.
Catalogue initial : FDVA, ADSV projet, FEIACA, Culture & Santé, création arts de la rue, Bretagne projet culturel artistique, Loire-Atlantique création. Sources et exigences spécifiques embarquées dans funding-data.js ; aucune affirmation de droit acquis ni catalogue national exhaustif. Les critères inconnus restent inconnus ; les déclarations explicites incompatibles sont signalées. Pièces du dossier commun + compléments de chaque campagne, export texte, suivi des dépôts déclaré par la troupe. RIB : état de préparation uniquement.
Culture & Santé : territoire du projet et établissement porteur à vérifier, le siège seul ne décide pas. Aides-territoires recentré en mars 2026 sur les partenaires publics : lien décrit comme ressource pour ces partenaires.
Veille : recherches publiques Instagram/TikTok tentées ; pas de collecte fiable complète ni de connexion de compte. Liens de recherche externes personnalisés et carnet manuel avec confirmation officielle déclarée par la troupe. Appels documentés : Al Andalus OFF 2027 ; Et 20 l’Été 2027 clos au 24 octobre 2026 ; Nuits de la lecture 20–24 janvier 2027, partenariat à organiser, pas de cachet attribué. Aucun DM, abonnement, envoi ou dépôt effectué.

Filtre événements : rapprochement obligatoire de la forme artistique, du thème imposé documenté et du public. Thèmes proposés d’après le synopsis, modifiables et conservés par spectacle ; l’âge du public ne détermine pas le sujet. Type d’événement et mots-clés complémentaires personnalisent les recherches externes. Un appel sans thème imposé est identifié comme tel, sans prétendre à une adéquation thématique confirmée.

## Contrôle à la demande
L’empreinte porte sur le texte normalisé du contenu officiel. Une différence est un signal de changement, pas la preuve d’une modification de droit : calendrier, contenu éditorial ou présentation peuvent varier. Les dates extraites sont présentées avec leur contexte et ne sont jamais reprises comme échéance du territoire sans validation. Aucune interprétation automatique d’une nouvelle règle, aucun droit acquis annoncé.
Premier contrôle serveur : cinq pages récupérables ; FEIACA redirige (nouvelle référence à vérifier, redirection vers connexion observée), Bretagne refuse la collecte HTTP 403. Les deux fiches restent en référence non revalidée.
Les empreintes initiales documentent les pages consultées lors de ce développement. Toute mise à jour du catalogue doit confronter la nouvelle page à ses critères avant de renouveler la référence.

## Répertoire complet et propositions groupées
Le moteur compare chaque spectacle isolément : une forme artistique d’un spectacle ne peut pas être combinée avec le thème d’un autre pour produire une fausse correspondance. Les lieux sans critères publiés restent « à examiner ». Une proposition groupée porte les titres sous proposedShows, conserve un spectacle principal pour compatibilité et exige la confirmation explicite du spectacle retenu avant toute option / confirmation. Les noms sont liés au répertoire de la troupe et suivent ses renommages.
