# Priorités de consolidation

Cette feuille de route organise le travail ; elle n’annonce pas des fonctionnalités livrées ni un calendrier garanti. Le [modèle économique](MODELE-ECONOMIQUE.md) reste applicable : aucun tarif publié et aucun paiement du service activé.

## 1. Rendre le parcours principal fiable

| Chantier | Point de départ | Critère de sortie |
| --- | --- | --- |
| Trois essais pilotes | Démo guidée existante | [Protocole](docs/troupes-pilotes.md) exécuté et résultats consignés |
| Continuité lieu → candidature → date | Plusieurs écrans et relations existent | Vérifier les liens réels avant modification ; pas de ressaisie évitable ni de doublon après double action |
| Recherche autonome sur Hostinger | Service public JavaScript ; PHP non raccordé | Choisir un service autonome ou un portage ; conserver bornes réseau, sources, dates et erreurs ; tester la destination |
| Informations sur les lieux | Sources et vérifications déjà prises en compte | Source et fraîcheur compréhensibles ; inconnus explicites ; signalement avec validation avant publication |
| Comptes PHP | Sessions et inscriptions présentes | Validation MySQL et isolation des troupes ; récupération du mot de passe par e-mail testée avant ouverture autonome |

## 2. Consolider le partage et la sortie du service

- Tester le carnet de diffusion avec deux personnes : responsable du contact, dernier échange, prochaine action et doublons.
- Raccorder le collectif au service autonome avec identité, modération et séparation des notes privées.
- Définir puis tester la récupération complète des données. L’export CSV ZIP existe ; sa restauration automatique n’existe pas. Une restauration de révision n’est pas une restauration complète.
- Compléter les salles de répétition à partir des besoins des pilotes : capacité, sol, hauteur, accessibilité, conditions d’accueil et date de vérification. Ne pas annoncer de disponibilité non confirmée.

## 3. Préparer une première version distribuable

Ne pas qualifier le paquet actuel de service complet prêt à l’emploi.

Avant une préversion numérotée :
- choisir le commit exact et obtenir les contrôles JavaScript/PHP réussis ;
- installer depuis un téléchargement propre, selon la notice ;
- préparer séparément la démo Node.js et le paquet PHP, avec leurs limites ;
- vérifier le contenu des archives : licences, crédits, documentation et aucun secret ou donnée réelle ;
- tester les paquets extraits, identifier leur version et fournir leur empreinte SHA-256 ;
- rédiger les notes de version : usages validés, services manquants, mise à jour et retour arrière ;
- publier en préversion tant que les critères de production restent ouverts.

Une publication de code ne vaut pas un déploiement, une bascule DNS ou une ouverture des inscriptions.

## 4. Financer et entretenir le commun

Définir un bilan périodique simple : dépenses, recettes, travail financé et besoins à venir. Ne pas publier l’identité des bénéficiaires de l’accès solidaire. La forme de la participation reste à décider.

## Premières contributions possibles

| Tâche | Livrable utile |
| --- | --- |
| Tester l’installation sur son système | Version testée, étapes réellement suivies et corrections proposées |
| Relire une notice | Passage incompris et proposition de formulation |
| Vérifier une source de lieu | URL publique, date de lecture et faits confirmés ou manquants |
| Tester le parcours au clavier ou sur téléphone | Étape, action impossible et résultat attendu |
| Essayer le parcours pilote | Fiche anonymisée, même si le parcours bloque |

Consulter [CONTRIBUTING.md](CONTRIBUTING.md) avant de modifier le code. Discuter les gros chantiers avant de les implémenter pour éviter les doublons.
