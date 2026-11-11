# Lecture intégrée et jeu théâtral

Le bouton **Lire ici** ouvre un `dialog` accessible. La fermeture, Échap ou un changement de compte, troupe ou page annule la lecture. Le tirage courant reste en place. Aucune publication ni sauvegarde de contenu externe n’est automatique.

## Sources et réutilisation

`worker/impro-examples.mjs` et `backend/src/impro-examples.php` exposent le même lecteur. Seules les adresses de fiches HTTPS des sources du catalogue sont acceptées : hôte et chemin contrôlés, DNS public, redirections limitées au même hôte, délai et taille bornés. Les erreurs de lecture restent visibles.

Pour Improwiki, le lecteur exige un avis de licence dans le bloc `license-info` de **la page consultée**. Les licences CC BY et CC BY-SA 3.0/4.0 permettent la reprise du texte. Le texte seul est présenté, accompagné de la source, du crédit de modification, de l’historique des contributions et de la licence. Les médias, scripts et formulaires sont exclus. Les textes repris conservent leur licence propre, distincte de celle du code. Une licence NC ou ND, l’absence de licence reconnue ou une autre source ne déclenche jamais une copie intégrale : aperçu bref et accès à l’original. Un changement de format du texte licencié provoque une erreur explicite plutôt qu’une fausse fiche vide.

Les fiches sont relues à chaque ouverture, sans cache applicatif et sans transmission du profil de troupe. Leur texte n’est pas une nouvelle consigne créée par CompagnieCraft.

## Propositions originales

`models/theatre-development.js` associe aux cinq graines du tirage des indications originales de plateau, de relation, d’objectifs opposés et de progression. Aucun appel réseau ni IA n’est nécessaire. Une valeur personnalisée bénéficie d’une trame générique ; la trame ne prétend pas interpréter librement n’importe quel texte.

`views/theatre-development.js` propose une lecture progressive : une indication sous chaque graine, puis une trame dépliable. Le minutage dépend de la durée ; la distribution indique comment inclure les participants supplémentaires. Les notes personnelles (`theatreNotes`, 4 000 caractères) restent dans le brouillon jusqu’à l’action de conservation, puis suivent les règles d’accès et de sauvegarde de l’espace. L’export TXT et le brouillon de partage reprennent la trame et les notes. Aucun message n’est envoyé automatiquement.

Vérification : `node check-impro-reader.mjs`, `node check-theatre-development.cjs`, puis contrôles PHP et interface.
