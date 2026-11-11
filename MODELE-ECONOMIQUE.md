# CompagnieCraft : un outil commun

Décision du 11 novembre 2026. Cette décision remplace la présentation d’un tarif fixe. **Aucun tarif ne doit être publié et aucun paiement ne doit être activé avant une nouvelle décision explicite.**

## Principes retenus

- Logiciel libre : objectif de code complet accessible, installation et adaptation possibles, avec documentation. Le dépôt public et la licence générale restent à publier ; les textes du site ne prétendent pas que cette étape est déjà faite.
- Service hébergé : participation annuelle pour éviter aux utilisateurs la gestion de l’installation et de l’entretien. Les fonctionnalités ne sont pas vendues par module. Les outils optionnels restent des choix d’usage.
- Accès solidaire : possibilité d’accès gratuit ou réduit pour les troupes sans moyens, selon des modalités à définir.
- Contributions : informations vérifiées, tests, documentation ou code pourront donner droit à un an de service hébergé, attribué par Christophe. La contribution reste volontaire, sans obligation de travail gratuit et sans droit automatique à une invitation.
- Le Chapeau 🎩 : soutien financier volontaire, supplémentaire, sans fonctionnalité exclusive.
- Ressources communes : consultation gratuite avec compte selon les parcours prévus ; contributions publiques distinctes des dossiers et échanges privés des troupes.
- « Les Coulisses » désigne un espace du projet, jamais une collection d’outils payants.

La participation doit financer l’hébergement, les sauvegardes, la maintenance, la sécurité, les améliorations et une rémunération raisonnable du travail. Les dépenses et l’utilisation des contributions doivent être expliquées simplement.

## Préparation opérationnelle

| Parcours prévu | Préparation requise | État |
| --- | --- | --- |
| Participation annuelle | Décider montant et forme : fixe avec exemptions, prix libre conseillé ou combinaison. Définir renouvellement, information et sortie du service avant tout raccordement de paiement. | Non décidé ; aucun paiement activé |
| Accès solidaire | Demande privée, décision humaine, durée et renouvellement expliqués. Ne pas afficher de justificatifs dans le collectif. | Modalités à définir |
| Invitation pour contribution | Christophe examine la contribution et attribue explicitement un an. Prévoir dates de début et de fin, historique de décision, prévention des doublons et information sur le renouvellement. Aucune attribution automatique au dépôt d’une contribution. | Parcours à développer ; les invitations de membres existantes ne constituent pas un droit de service annuel |
| Publications communautaires | Prévoir une proposition en attente, la validation ou correction par Christophe, puis la publication. Conserver l’auteur, la source, la date de vérification et un moyen de signalement. | Modération du dispositif à développer et vérifier sur chaque backend ; ne pas présenter toutes les contributions actuelles comme modérées |
| Transparence | Publier un bilan compréhensible des dépenses et du financement, sans exposer de données individuelles. | Format et périodicité à définir |
| Récupération des données | Maintenir les exports et l’isolation des espaces, expliquer comment quitter le service. | Export CSV structuré existant ; parcours complet de sortie à préciser |

Pour un futur paramétrage, l’état initial doit rester : `participation_mode = undecided`, `amount = null`, `public_pricing = false`, `payments_enabled = false`, `solidarity_rules = pending`, `contribution_grants = manual`. Il s’agit d’un contrat de préparation, pas de réglages déjà reliés à un prestataire.

## Engagements d’interface

L’accueil et les présentations des outils annoncent les principes sans montant, sans bouton de paiement et sans promesse d’assistance individuelle illimitée. Le Chapeau est expliqué sans formulaire de versement. Les mécanismes encore à développer sont présentés comme prévus. Les droits des espaces privés ne changent pas avec ces textes.

Ne jamais conditionner la consultation du commun à une contribution de travail. Un soutien financier ne donne pas de visibilité privilégiée aux publications. Les critères d’invitation et d’accès solidaire doivent être explicites avant leur ouverture.

## État de cette livraison

Les textes publics, le catalogue des outils et la documentation sont harmonisés. Les mécanismes de paiement, d’exemption, de récompense annuelle et de modération ne sont pas activés par cette livraison. La version PHP Hostinger est préparée séparément ; elle n’est pas déployée sur un hébergement réel par cette modification.
