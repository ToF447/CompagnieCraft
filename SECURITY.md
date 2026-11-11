# Signaler un problème de sécurité

Ne publiez pas de mots de passe, données de troupe, jetons ou démonstrations exploitables dans une issue publique. Utilisez le signalement privé de vulnérabilité du dépôt lorsqu’il est disponible ; sinon, demandez au mainteneur un canal privé sans divulguer le détail de la faille.

Le projet est en bêta. Les contrôles automatisés ne constituent pas une certification de sécurité. Les comptes `admin/admin` servent uniquement à la démonstration : ils ne protègent pas des données confidentielles. Pour un espace réel, utiliser le backend PHP avec comptes individuels et configuration privée hors de `public_html`, puis vérifier l’installation et les droits sur l’hébergement choisi.

Les déploiements Sites et PHP ne présentent pas encore une équivalence complète. Lire `backend/DEPLOY.md` et `docs/maintainer-guide.md` avant une mise en service.
