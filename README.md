# SpeedArti — Équipe & Planning

## Démonstration V1.9.9 — ergonomie Planning, Chantiers, Rapports, Expert et Ultra

Démo : https://thibaultmourlane7.github.io/-speedarti-equipe-planning-demo./

Dépôt de démonstration autonome sur `main`. **Ne jamais modifier le dépôt source `GSTAI-Sp/speedarti-v2`.**

### Nouveautés V1.9.9

- Planning : Gantt, panneaux Expert et outils avancés accessibles, sans supprimer le planning simple.
- Chantiers : recherche dans la liste à partir de cinq chantiers, boutons Plus pointant vers le suivi métier concerné.
- À traiter : navigation contextualisée vers Terrain, planning, réserves ou suivi client selon le type de demande.
- Rapport : retour arrière sans perte de saisie, dictée conservée, avancement à renseigner sans 50 % fictif, droits create_reports et create_requests respectés.
- Accueil : Expert montre l'aide à la décision ; Ultra montre l'accès à l'optimisation. Standard conserve son écran simple.
- Téléphone : navigation vers Chantiers revient à la liste et ramène au haut de page.
- Ángel : base globale equipe_planning enrichie, version 1.9.0, sans doublon.

**Recette V1.9.9 à confirmer humainement** : iPhone 320/375/414 px, recherche de chantiers, navigation Plus, alertes, rapport avec retour et dictée, visibilité Standard/Expert/Ultra. Les vérifications syntaxiques et de rendu simulé sont passées, mais ne remplacent pas les clics sur appareil réel.

### Correctifs V1.9.8 (téléphone)

- Suppression **dans la feuille de styles source** des règles de barre latérale fixe à 82px et de marge supplémentaire à 82px : correction du double décalage constaté sur iPhone.
- Initialisation du menu fermé par défaut sur téléphone, y compris avec des données enregistrées avant la correction.
- Sécurisation de l’ordre d’exécution des scripts (app initialisée avant les extensions) et règles de largeur pleine page présentes dès le HTML initial.
- Actualisation du cache de service worker et des versions des ressources, sans toucher aux moteurs métiers.
- Connaissance Ángel globale existante `equipe_planning` actualisée.

### Nouveautés V1.9.7 conservées

- Sur téléphone (320–700 px) : interface **pleine largeur** au lieu d'un menu fixe de 82 px.
- Navigation principale **Aujourd'hui / Planning / Chantiers / À traiter** fixée en bas avec de grands boutons.
- Menu complet dans un **tiroir latéral** qui s'ouvre à la demande, avec bouton Fermer et fond cliquable.
- En-tête et sélection de profil adaptés au téléphone, cartes et boutons réorganisés, formulaires sur une colonne.
- Fiche mission, rapport guidé, listes, planning et Gantt présentés sans forcer la largeur de l'écran.
- Le Gantt avancé conserve le défilement horizontal nécessaire à sa représentation.
- Cache hors connexion réactualisé et connaissances Ángel existantes enrichies.

### Nouveautés V1.9.6 conservées

- Accueil « Ma journée » : prochain chantier, horaires, collaborateurs, consignes, bouton **Voir ma fiche de mission** et trois grandes actions.
- Planning simple : boutons **Personnes / Équipes / Chantiers**, vues **Semaine / Mois**, flèches de navigation et ouverture de chaque intervention.
- Fiche de mission intégrée au chantier : lieu, intervention, collègues, consignes, ressources connues, météo reçue, actions rapport / signalement / documents / planning.
- Rapport journalier guidé en **quatre étapes** : intervention, travaux et avancement, difficultés et fichiers, récapitulatif et confirmation.
- Menu latéral et accès aux fonctionnalités existantes : **Gantt avancé**, suivi chantier, qualité, sécurité, réunions, transmissions client, historique, permissions, Expert et Ultra.
- Enrichissement de la connaissance **Ángel globale `equipe_planning`** existante avec le vocabulaire des nouveaux parcours.

### Frontières métier à préserver

- **Agenda Chantier** : source unique des dates et des interventions. Les vues planning / Gantt n'enregistrent pas une deuxième date métier.
- **Temps & Présence** : seul propriétaire du pointage et des heures réelles. Aucun système de pointage ici.
- **RH** : données administratives et congés ; **Parc matériel** : identité des véhicules ; **Stock** : quantités ; **Documents** : originaux et versions.
- **Ángel** : une seule connaissance globale, aucune base parallèle.
- Les propositions Expert / Ultra restent soumises à validation humaine et au traitement par leur module propriétaire.

### Démonstration des éditions

- **Standard** : planning, équipe, rapports, signalements, suivi chantier, Gantt et préparation de transmission client.
- **Expert** : Standard + analyses de rapports/messages, propositions d'action, aide à la recherche d'effectifs et analyse de retards / ressources.
- **Ultra** : Expert + charge prévisionnelle et propositions d'optimisation / réorganisation explicables.

Les chiffres et tarifs d'édition de la démo ne valent pas publication commerciale. Les connecteurs SpeedArti restent **simulés ou préparés** tant que le raccordement n'a pas été validé.

### Recette humaine avant validation commerciale

1. Depuis un téléphone de largeur 320–390 px, vérifier qu'aucun menu fixe n'écrase le contenu, puis ouvrir **Aujourd'hui** et **Voir ma fiche de mission**.
2. Vérifier les quatre boutons fixes en bas et le menu hamburger : tiroir ouvrable et refermable sans perte de page.
3. Vérifier qu'aucun élément du formulaire de rapport ou de l'en-tête ne dépasse horizontalement.
4. Faire les mêmes vérifications sur un grand téléphone (~430 px) et une tablette (~768 px) avant de poursuivre les parcours ci-dessous.

5. Depuis un téléphone, ouvrir **Aujourd'hui**, puis **Voir ma fiche de mission**.
2. Vérifier le chantier, les horaires, les collègues, les documents et le bouton de retour.
3. Aller dans **Planning** et changer successivement **Personnes**, **Équipes**, **Chantiers**, puis semaine/mois et période précédente/suivante.
4. Ouvrir une intervention depuis les cartes ; vérifier qu'il s'agit d'une intervention de l'Agenda simulé.
5. Faire un rapport guidé : conserver la sélection, le résumé, le pourcentage, une difficulté et une photo jusqu'à la confirmation ; vérifier le rapport enregistré dans Terrain.
6. Refaire le parcours en utilisant **Retour**, en annulant et en rouvrant le formulaire ; vérifier l'absence de doublons.
7. Signaler un problème et demander du matériel, puis consulter **À traiter**.
8. Passer sur des profils ouvrier, chef d'équipe et dirigeant ; vérifier les droits et chantiers accessibles.
9. Ouvrir **Gantt avancé**, puis revenir au planning simple.
10. Comparer **Standard**, **Expert** et **Ultra** sans supposer que des connecteurs externes fonctionnent réellement.
11. Tester petit téléphone (~320 px), mobile (~375 px), tablette, ordinateur et menu réduit/ouvert.
12. Rafraîchir et vérifier la persistance locale, l'absence d'erreurs console et le renouvellement du cache.

**Statut :** ergonomie V1.9.9 poussée sur la démo ; les tests navigateur humains ci-dessus restent à exécuter / confirmer. Les contrôles syntaxiques ne remplacent pas une recette manuelle.

### Contrôle spécifique après retour de capture iPhone (14/10/2026)

La capture montrait une barre latérale de 82px + une marge de 82px produisant un contenu extrêmement étroit. Après déploiement, contrôler sur vrai iPhone l'absence de double décalage, puis l'affichage plein écran, la barre de navigation basse, les menus, les formulaires et les rôles. Pour écarter le cache navigateur, ouvrir dans un nouvel onglet avec `?mobile=199` en suffixe. Aucun parcours humain complet n'est réputé validé tant qu'il n'a pas été testé réellement.
