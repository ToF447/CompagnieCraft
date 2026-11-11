# Une option de l’atelier, pas une condition d’accès

La recherche de lieux, la prospection, les candidatures et les relances sont le cœur gratuit de l’application. L’option financière est désactivée par défaut, propre à chaque troupe, activable dans **La troupe → Les options de votre atelier**. La désactivation masque l’outil sans supprimer les dossiers. Aucun compte bancaire, abonnement ou prestataire de paiement n’est nécessaire pour utiliser le cœur de l’application.

## Ce qui est développé

- Brouillons de factures de prestations de services : plusieurs lignes, quantités à trois décimales, prix en centimes, taux de TVA choisis explicitement, totaux HT/TVA/TTC et mentions à compléter.
- Exemplaires figés, avoirs totaux liés, acomptes et soldes, journal des encaissements/remboursements constatés. Contrepassation des saisies manuelles sans effacer l’original. Exports HTML imprimables et CSV protégés contre les formules.
- Rémunérations : parcours distincts GUSO, paie spectacle, prestataire, droits d’auteur, frais réels et bénévolat. Orientation GUSO à trois états, échéance indicative fin + 15 jours, étapes documentées par références. Une modification de personne, employeur, circuit, lieu ou dates remet les étapes à vérifier.
- Backend optionnel : émission numérotée dans une transaction par structure, snapshots immuables hors des restaurations d’espace, contrôle des totaux côté serveur, opérations idempotentes, séparation des rôles et des comptes de troupe.
- Adaptateur Stripe Checkout : compte marchand propre à chaque troupe, montant depuis la facture serveur, page hébergée, notification signée et dédupliquée. Un retour de navigation ou une notification de paiement différé non confirmé ne solde jamais une facture.

## Limites de la version publiée

La version Sites conserve les données d’espace dans le navigateur. Les exemplaires financiers y portent **DEMO** ; ce ne sont pas des factures officielles. Aucun encaissement réel ni transmission GUSO/DPAE/DSN n’est activé. Les montants sociaux sont recopiés depuis un calcul officiel ou la paie ; aucun calcul de taux ni conversion brut/net n’est prétendu.

Les numéros de sécurité sociale, identifiants GUSO, coordonnées bancaires personnelles et dossiers salariés complets ne sont pas demandés. La déclaration reste dans le service officiel ou le logiciel de paie compétent. L’orientation n’est pas une décision juridique automatique.

Les exports HTML ne constituent pas une transmission via plateforme agréée ou Chorus Pro. L’émission serveur doit être activée seulement après validation du statut fiscal, des mentions, de la série de numéros et du circuit de facturation électronique requis. La série FAC-ANNÉE-NNNNNN appartient à cette installation : ne pas émettre parallèlement avec la même série depuis un autre logiciel. Les avoirs disponibles ici sont totaux ; les corrections partielles et les factures d’acompte dédiées restent à développer.

## Activation serveur et paiement, facultatifs

1. Installer le backend PHP/PDO sur un espace séparé, configurer les accès individuels et vérifier MySQL/HTTPS/sauvegardes. Relancer `manage.php install` pour créer les tables supplémentaires avant activation ; cette commande crée les tables manquantes sans vider les données.
2. Valider le circuit de facturation avec la structure. Dans sa configuration privée, activer `finance[STRUCTURE_ID].issue_enabled` si le circuit proposé lui convient. L’option d’interface ne suffit pas à autoriser une émission réelle.
3. Pour encaisser en ligne, raccorder **le propre compte Stripe de la troupe**, vérifié par le prestataire. Ses clés privées restent dans la configuration hors du répertoire public. Ne pas utiliser un compte central pour encaisser au nom des autres troupes.
4. Configurer l’endpoint HTTPS `payment-webhook.php?structure=STRUCTURE_ID` dans ce compte. Ajouter son secret privé. Événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Tester d’abord avec les clés et moyens fictifs du prestataire. Aucune clé réelle n’est incluse dans le dépôt.
5. Carte et wallets disponibles selon le prestataire. Le prélèvement SEPA est désactivé par défaut (`allow_sepa=false`) ; son activation demande une validation des mandats, délais et risques de paiements différés. Le retour signé « paid » confirme l’encaissement.

Un timeout de création laisse une réservation à réconcilier avec Stripe avec la clé d’idempotence `atelier-ID_TENTATIVE`, pour éviter un second lien débitant le même solde. La table `atelier_checkouts` conserve cette référence. Une réservation « creating » ne se supprime pas à l’aveugle : rechercher l’opération dans le compte du prestataire, puis réconcilier sa session ou constater son absence avant de la débloquer. Les liens actifs bloquent les écritures manuelles ou avoirs concurrents jusqu’à leur confirmation ou expiration.

Les remboursements bancaires, litiges et rétrofacturations sont à traiter dans le compte du prestataire puis à réconcilier. Le code ne lance aucun remboursement ni versement de salaire. La validation d’exploitation doit inclure ces parcours, les frais du prestataire, les échecs et les relevés bancaires. L’adaptateur n’est pas activé en production tant que cette recette n’est pas faite.

Le journal manuel admet virement, carte/TPE, chèque, espèces, prélèvement et autre moyen justifié. Il constate les opérations ; il n’exécute aucun ordre bancaire et ne vérifie pas automatiquement les conditions légales propres au moyen choisi.

## Références officielles consultées le 31 octobre 2026

- [Champ GUSO et démarches](https://entreprendre.service-public.gouv.fr/vosdroits/F1928)
- [GUSO : règlement des cotisations et salaire net](https://www.guso.fr/information/faq/paiement.html)
- [Mentions d’une facture](https://entreprendre.service-public.gouv.fr/vosdroits/F31808)
- [Régime des artistes-auteurs](https://www.secu-artistes-auteurs.fr/)
- [Stripe : confirmation des paiements Checkout](https://docs.stripe.com/checkout/fulfillment)
- [Stripe : signatures et notifications](https://docs.stripe.com/events/manage-webhook-endpoints)

Tests : `check-finance.cjs` et `check-finance-api.cjs`. Les tests d’API utilisent PHP/SQLite et des signatures fictives locales ; aucune requête de paiement externe n’est exécutée. La recette avec un compte marchand de test et MySQL reste nécessaire avant une activation réelle.
