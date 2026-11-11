# Manifeste des participants

Le texte éditorial est conservé dans `MANIFESTE.md`. Le site le propose à la lecture depuis la présentation publique, la connexion et le pied de page. `dist/manifeste.html` permet aussi son impression.

À l’inscription PHP, le prénom et le nom du signataire et une case non cochée par défaut sont obligatoires. Le serveur valide l’accord et la version avant de créer le compte. La signature est enregistrée dans la même transaction que le compte et son espace : identifiant de compte, nom déclaré, version, empreinte SHA-256 du fichier éditorial et date serveur. Aucun nom de signataire n’est publié.

Les comptes existants, y compris ceux créés par invitation, rencontrent le manifeste après leur connexion dans l’interface PHP. Ils peuvent signer ou se déconnecter. Les signatures déjà enregistrées ne sont pas réécrites lors d’un nouvel envoi. L’API `manifesto` est liée au compte authentifié et aux protections CSRF habituelles. Cet engagement ne change pas les autorisations métier des API.

Avant d’installer cette version sur un serveur existant, exécuter `php backend/bin/manage.php install` avec sa configuration privée pour ajouter la table `atelier_manifesto_signatures`. Cette commande conserve les données existantes. La distribution Sites reste une démonstration : aucune signature personnelle n’y est enregistrée.

Une nouvelle édition du manifeste exige de mettre à jour ensemble le texte, les deux rendus HTML, la version navigateur/serveur et l’empreinte serveur. Les signatures d’une ancienne version sont conservées.

## Vérifications du 9 novembre 2026

54 contrôles du projet et le contrôle de format passent. Le test PHP/PDO SQLite vérifie notamment le refus sans engagement, le refus d’une ancienne version, le stockage de la signature, son rattachement à la session, la conservation de la première signature et le refus d’un accès anonyme. La création de compte conserve les contrôles d’origine et d’isolation existants.

Contrôle Chrome avec données fictives : lecture à l’inscription, case non cochée par défaut, refus du formulaire incomplet, signature d’un compte existant et ouverture de son espace après signature. Aucun message d’erreur JavaScript. Les rendus ordinateur et mobile de 390 pixels ont été capturés ; le rendu mobile a été relu et ne déborde pas horizontalement.

Le paquet Hostinger est préparé localement. Aucun déploiement ni contrôle MySQL de production n’a été effectué.

## Mise à jour du 11 novembre 2026

La version `2026-11-11.1` précise que la gratuité concerne le code à installer soi-même. Les textes de présentation et de catalogue ont été corrigés selon le modèle validé : participation annuelle à définir, accès solidaire, contributions reconnues et Chapeau volontaire. Aucun tarif n’est publié et aucun paiement n’est activé. Voir `MODELE-ECONOMIQUE.md`. L’empreinte du manifeste et ses rendus ont été mis à jour ensemble. Les contrôles du projet, y compris PHP, passent (56 contrôles).
