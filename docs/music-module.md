# Musique & petites scènes

Extension gratuite et facultative, désactivée par défaut. Activation depuis **Mes modules** ; accès ensuite dans **Trouver des dates → Musique & petites scènes**. La présentation publique utilise le même manifeste que le catalogue connecté.

## Usage

1. Enregistrer une formule : nom d’artiste/projet, style principal, acoustique ou amplifié, musiciens, durée, jauge souhaitée, lien d’écoute et besoins techniques.
2. Choisir une commune proposée et un rayon de 25, 50 ou 100 km, ou la France entière.
3. Rechercher les salles, cafés-concerts documentés ou festivals. La catégorie musicale et les codes des communes filtrent l’annuaire **avant** sa pagination.
4. Distinguer les rapprochements documentés, les lieux dont le style reste à qualifier et les sites écartés/inaccessibles. Une jauge inconnue n’est jamais présentée comme petite.
5. Garder un contact ou préparer une candidature. Cette dernière ajoute le projet au répertoire si nécessaire et ouvre un brouillon modifiable, sans date présumée et sans envoi. Le module de candidatures et sa dépendance répertoire sont activés à cette occasion.

## Sources et limites

- Festivals : ministère de la Culture, ressource publique `47ac11c2-8a00-46a7-9fa8-9b802643f975`, discipline musique et sous-catégorie musicale. Le classement est celui de la source ; il ne prouve pas un appel à candidatures actuel.
- Salles : Basilic, ressource `dced78ee-0823-4b61-86e6-57717308d4e4`, établissements actifs, sous-domaine musique et fonction de diffusion. La majorité ne renseigne ni site ni style précis : ces résultats restent à qualifier.
- Sélection initiale documentée le 9 novembre 2026 : Le Coquelicot à Fougères, Pannonica et La Bouche d’Air à Nantes. Sources et réserves sont dans `dist/music-catalog.json`. Le regroupement jazz/blues ou rap/slam n’implique pas que chaque lieu programme tous les sous-styles ; lire la description. Ce petit fonds ne constitue pas un annuaire exhaustif des cafés-concerts.

Chaque recherche explicite relit les données publiques, sans réutiliser un ancien résultat en cas d’erreur. Sur Sites, six sites maximum par page sont contrôlés, trois à la fois, avec le lecteur borné existant : contrôle DNS, redirections limitées au domaine, délais, taille maximale, détection casino/domaines parqués. Les pages non inspectées restent signalées. Les événements explicitement datés dans les douze prochains mois sont séparés de la prospection ; aucune reconduction annuelle ou date disponible n’est inventée. Le lecteur n’exécute pas JavaScript et ne parcourt pas tout le site : une absence de date détectée ne signifie pas une absence de concert.

Sur l’installation PHP/Hostinger ou statique sans endpoint musical, le navigateur interroge directement ces mêmes jeux publics. Le contrôle des sites n’y est pas disponible ; l’interface l’annonce et ne simule aucun contrôle. Les cafés-concerts y proviennent de la sélection datée. Ce mode nécessite le CORS des services publics.

## Architecture et données

- Modèle : `dist/js/models/music-core.js` (profil privé, validation, qualification, intégration au répertoire et dédoublonnage des contacts).
- Service navigateur : `dist/js/services/music-search.js` (catalogue, critères publics et mode portable).
- Vue : `dist/js/views/music-ui.js` et `dist/music.css` (formulaires, résultats compacts, limites et sources).
- Contrôleur : `dist/js/controllers/music-actions.js` (activation, événements, abandon des recherches et isolation par espace).
- Service Worker : `worker/music-engine.mjs`, intégré par `build-source-worker.cjs` ; endpoint GET `/api/music/search`. Aucune URL arbitraire n’est acceptée en paramètre.
- Alternative PHP : le profil `state.music` est validé par `backend/src/tools.php` puis conservé dans le JSON de l’espace ; aucune nouvelle table requise.

Le profil complet, les notes techniques et les liens d’écoute ne sont pas transmis aux annuaires. Seuls style, type de lieu, page et communes demandées leur sont communiqués. Les nouveaux contacts restent privés à la structure ; aucun abonnement newsletter ni contribution collective n’est créé.

Tests : `node check-music.mjs` ; suite complète `npm run check -- --php`. Les fixtures vérifient le filtrage avant pagination, les événements futurs, l’exclusion restaurant/casino, la jauge inconnue, le dédoublonnage et la limitation des paramètres. Les vérifications réseau réelles sont complémentaires et ne rendent pas le test unitaire dépendant d’un service externe.
