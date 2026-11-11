# Textes et disponibilités en ligne

Dans **La troupe → Textes & disponibilités**, créez un espace privé avec le nom de votre équipe et votre nom d’usage. Aucune donnée des démonstrations n’y est copiée. L’identité est celle de la connexion personnelle au site, jamais le compte public `admin/admin`.

Dans **Membres & accès**, le responsable choisit lecture ou édition, puis crée un lien valable 48 heures pour une utilisation. Il transmet lui-même ce lien. La personne invitée doit déjà pouvoir accéder au site et choisit son nom dans l’équipe. Les invitations en attente peuvent être révoquées ; un membre peut être retiré puis réinvité. Seul le responsable gère les accès. Une personne en lecture peut déclarer ses propres disponibilités.

## Textes de travail

- Saisie ou import TXT UTF-8, jusqu’à 60 000 caractères par texte.
- Titre, auteur et lien de source/édition, avec confirmation de pouvoir partager le texte.
- Cinq versions conservées, chacune datée avec le nom de la personne qui a enregistré.
- La consultation d’une version antérieure ne modifie rien ; sa reprise prépare un brouillon à enregistrer explicitement.
- Un conflit de révision conserve le brouillon et demande de relire le serveur.
- Export TXT du brouillon possible avant sa sauvegarde. Archiver reste réversible depuis les archives.
- Pas de coédition caractère par caractère, d’import PDF/Word ni de mise en page riche dans cette première version.

Les brouillons restent dans la mémoire de la page, sans stockage local du contenu. Un avertissement de sortie protège les modifications non enregistrées. Le compte peut créer huit espaces ; chaque espace est limité à 40 membres, 60 textes et un million de caractères courants, archives comprises.

## Disponibilités

Chaque personne renseigne ses propres périodes : journée entière, matin, après-midi ou soir ; oui, peut-être ou non. Le tableau affiche 14 jours, avec une date de départ et une période au choix. Une réponse « journée entière » s’applique aux parties de journée. À l’inverse, une réponse du soir ne permet pas de conclure pour toute la journée. Une absence de déclaration reste « non renseigné » et n’est jamais comptée comme un accord.

Les périodes qui se recoupent pour une même personne et une même partie de journée nécessitent de modifier la réponse existante. Le retrait d’une réponse la rend non renseignée. Le tableau ne réserve ni date, ni lieu, ni prestation. Les sondages de dates et les créneaux récurrents restent à développer.

## Hébergement et confidentialité

Le service actuel utilise l’authentification Sites et une base D1 avec autorisations par espace. Les textes et disponibilités sont réellement enregistrés sur le serveur : ils ne sont donc plus de simples données locales de démo. La liste des textes ne transmet que les métadonnées ; le contenu est demandé à l’ouverture. Les invitations sont stockées par empreinte et les droits sont revérifiés sur chaque requête. Les liens d’invitation utilisent un fragment d’URL, non transmis au serveur dans l’adresse d’une page.

Un contrôle toutes les 30 secondes actualise les métadonnées et le tableau, sans écraser le texte en cours de saisie. Les brouillons et réponses d’un ancien compte sont rejetés lors d’un changement d’identité. Aucun e-mail n’est envoyé automatiquement et rien n’est publié dans le catalogue collectif.

La distribution PHP/Hostinger conserve ses sessions et espaces existants. Le raccordement de ce nouveau service à cette distribution reste à effectuer ; l’interface l’indique plutôt que simuler un partage.
