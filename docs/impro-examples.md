# Exemples d’improvisation renouvelés

À chaque entrée ou retour dans **Créer → Improvisation**, les vingt situations originales sont renouvelées et les index publics du catalogue `dist/impro-sources.json` sont consultés. Une simple modification d’un champ ou un rendu de la page ne déclenche pas une nouvelle collecte. Le bouton « 20 autres idées d’impro » renouvelle aussi la sélection et relit les sources.

Le tirage principal, le chronomètre et les éléments cochés « Garder » ne sont jamais remplacés par une réponse réseau. Effectif et durée servent au tirage des situations originales. Si tous les éléments sont gardés, la combinaison peut être épuisée ; l’interface le précise.

Deux onglets séparent clairement :

- **Fiches des sources** : jusqu’à vingt références externes, avec titre, fournisseur et lien vers la fiche. Aucune consigne ou description protégée n’est recopiée. L’effectif et la durée doivent être vérifiés sur la source. Un partage vers l’équipe reste une action préparée, jamais un envoi automatique.
- **Situations originales** : compositions locales du générateur CompagnieCraft, sélectionnables, exportables et enregistrables comme auparavant.

Sources répertoriées : Dramaction (catégorie improvisations et une page complémentaire variable), Théâtralement (imagination/improvisation), Improwiki (jeux), Improvisez (catalogue) et Improvisation Théâtrale (boîte à outils). Les deux derniers catalogues peuvent nécessiter une consultation manuelle ou un accès propre au site. Les protections anti-robots ne sont pas contournées. La disponibilité est constatée à chaque collecte ; aucun succès n’est inventé lorsque la page ne livre pas de fiches.

La collecte est bornée aux premières pages définies et à une page supplémentaire de Dramaction : elle ne parcourt pas tout le Web ni l’intégralité des bibliothèques. Les références sont réparties entre les fournisseurs disponibles, dédupliquées par URL et renouvelées en privilégiant celles absentes des sélections récentes. Quand le corpus disponible est épuisé, des références peuvent revenir. Les erreurs et l’heure de consultation sont visibles dans « Sources consultées, liens et couverture ».

Le service Sites `/api/impro/examples` effectue au plus six lectures HTML, avec trois tâches en parallèle, délais courts, DNS publics vérifiés, hôtes fixes et redirections limitées au même hôte. L’alternative PHP `impro-examples` utilise le même catalogue et vérifie les IP publiques avant cURL, avec HTTPS et résolution épinglée. Aucun profil, texte de troupe ou critère personnel n’est envoyé. Le corps HTML est limité à 160 Ko ; les catalogues chargés uniquement par JavaScript restent à consulter manuellement. Aucune clé IA ni dépendance à un assistant n’est nécessaire.

MVC : modèle `dist/js/models/impro-examples.js`, vue `dist/js/views/impro-examples.js`, contrôleur `dist/js/controllers/impro-examples.js`, service `worker/impro-examples.mjs` et alternative `backend/src/impro-examples.php`. Les informations de sélection et de consultation restent temporaires ; les changements de compte ou de troupe abandonnent les anciennes réponses.

Tests : `check-impro-examples.mjs` (parsing limité aux titres, URLs autorisées, erreurs, fraîcheur, dédoublonnage et renouvellement), `check-practice.cjs` (tirages et éléments gardés), suite complète `npm run check -- --php`.
