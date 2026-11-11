# Revue UI/UX — 6 novembre 2026

## Objectif

Voir les outils d'un coup d'œil, conserver une description utile et laisser davantage de place au travail. Les palettes et préférences personnelles sont conservées. Les règles transversales sont centralisées dans `dist/ui-efficiency.css` ; les ajouts clavier et les noms accessibles des fenêtres dans `dist/ui-efficiency.js`. Aucune modification des profils, données ou droits.

## Changements appliqués

- Catalogue public sur toute la largeur, hors de la colonne de présentation. Tuiles de base de 204 px, illustration de 38 × 32 px, titre et description visibles. Trois colonnes sur ordinateur courant, quatre sur grand écran, deux sur tablette, une sur téléphone. Pas de texte tronqué.
- Même grammaire pour le catalogue privé et le tableau de bord ; ordre personnel et commandes de déplacement conservés. Les chiffres du tableau de bord restent propres à la troupe.
- Pas d'infobulle répétant le texte déjà présent sur les cartes ; l'aide des champs, les sources photographiques et les délais progressifs sont conservés.
- Espacements des pages, champs et actions harmonisés ; commandes principales d'au moins 44 px, cases natives distinctes, zones de fermeture des fenêtres plus confortables.
- Barre de travail plus courte sur téléphone. Libellés secondaires masqués uniquement dans les raccourcis mobiles, titres conservés. Sélecteur de troupe préservé dans l'en-tête. Sur écran très bas, la seconde barre cesse d'être fixe.
- Lien « Aller au contenu » disponible avant et après connexion. Focus visible avec la couleur du thème, champs invalides signalés après interaction, réduction des animations respectée.
- Fenêtres natives nommées par leur titre, y compris après leur mise à jour. Aucun remplacement du comportement natif de Tab, Échap ou retour du focus.
- Tableaux qui débordent accessibles au clavier via leur conteneur ; les tableaux sans débordement n'ajoutent pas d'arrêt Tab.

## Vérifications effectuées

Contrôle DOM de 19 écrans à la largeur d'ordinateur, puis 29 rubriques de la navigation à une largeur de viewport de 320 px (305 px utiles avec la barre de défilement de l'aperçu) : titre principal présent, aucun débordement horizontal de la page, aucun champ visible sans label associé ou nom ARIA dans ces états.

Rubriques : découverte, accueil, parcours, prospection, veille, sources, demandes, contacts, programmation, spectacles, productions, troupe, création, planning, agenda, équipe, partage, collectif, contribution, ressources, aides, matériel, communication, modules, interface, profil de départ, qualité, accès et connexion.

Contrôles visuels : catalogue public compact, tableau de bord privé, recherche sur téléphone. Interaction réelle : ouverture et fermeture de la présentation d'un module, nom accessible de la fenêtre, lien clavier « Aller au contenu » aboutissant au contenu. Tests existants : modules, résumé du tableau de bord, déplacement, infobulles, préférences personnelles, moteur de lieux côté client et architecture MVC.

## Références et limites

Repères WCAG 2.2 consultés : [reflow 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [focus non masqué 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [cibles 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). La cible de 44 px choisie ici est une règle de confort pour les commandes principales ; le minimum AA 2.5.8 est de 24 px avec des exceptions.

Cette revue ne constitue pas une certification WCAG/RGAA : pas de session avec un lecteur d'écran ni de contrôle exhaustif de chaque état de dialogue, thème personnalisé, contraste ou parcours métier. Les calendriers et tableaux conservent leur défilement interne. Les vérifications ne certifient ni les pages externes ni les informations des sources. La facturation facultative désactivée n'a pas été activée pendant le parcours visuel. Les actions d'envoi, publication communautaire et paiement n'ont pas été exécutées.
