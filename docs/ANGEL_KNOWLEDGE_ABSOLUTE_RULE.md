# RÈGLE MAÎTRE ABSOLUE — CONNAISSANCES ÁNGEL

Statut : ABSOLUE — PRIORITAIRE — PERMANENTE

Cette règle s'applique à tout nouveau module, sous-module ou évolution métier SpeedArti.

1. Chaque évolution métier doit obligatoirement prévoir l'enrichissement des connaissances Ángel correspondantes.
2. Il est interdit de créer une seconde base de connaissances Ángel ou un système parallèle.
3. Les connaissances existantes doivent être réutilisées et enrichies, jamais dupliquées inutilement.
4. Le pack de connaissances du module doit au minimum couvrir :
   - vocabulaire métier ;
   - synonymes et formulations d'artisans ;
   - fonctions disponibles ;
   - champs/données utiles ;
   - intentions utilisateur ;
   - workflows ;
   - règles métier ;
   - sources de vérité ;
   - permissions/restrictions ;
   - actions qu'Ángel peut préparer ;
   - actions nécessitant validation humaine ;
   - cas où aucune donnée ne doit être inventée ;
   - exemples de questions naturelles ;
   - tests de compréhension.
5. Les calculs critiques, DTU, règles fabricant, droits et automatismes sensibles restent dans leurs moteurs métier respectifs. Ángel les consulte/explique mais ne les invente pas.
6. Un module ne peut pas être considéré TERMINÉ si son adaptation Ángel n'est pas traitée ou explicitement identifiée comme dépendance.
7. PILOTE et FORGE doivent contrôler cette règle à chaque sprint.
8. Aucun agent ne peut supprimer, désactiver ou contourner cette règle. Seule une décision explicite ultérieure de Thibault peut la remplacer.

Application V1.8.1 : le module Transmission client inclut son pack `client_transmission@1.0.0`.


## RÈGLE DE STRUCTURE PAR MODULE

Pour chaque module SpeedArti, les connaissances Ángel doivent former **une connaissance globale cohérente du module**.

Il est interdit de considérer chaque petite fonctionnalité comme une base de connaissances indépendante sans vision globale du module.

Les sous-domaines restent autorisés uniquement pour :
- organiser le contenu ;
- router les demandes ;
- ne charger que le contexte utile ;
- versionner les parties internes.

### Application obligatoire à Équipe & Planning

Équipe & Planning utilise un seul pack global : `equipe_planning`.

Il couvre notamment :
- collaborateurs, rôles, permissions et équipes ;
- Agenda Chantier, affectations et Gantt ;
- jalons, dépendances, besoins à pourvoir et modèles ;
- rapports, messages, demandes matériel et brief terrain ;
- compétences, habilitations, permis, disponibilités et remplacements ;
- véhicules, engins, météo, cartographie et déplacements ;
- Chiffrage, prévu/réalisé et Temps & Présence ;
- cockpit Conducteur ;
- Point chantier ;
- plans et révisions ;
- réserves / OPR ;
- non-conformités ;
- contrôles qualité ;
- sécurité ;
- réunions ;
- comptes rendus ;
- journal chantier ;
- validations ;
- Documents ;
- Transmission client.

Toute future évolution de l'un de ces domaines doit enrichir ce même pack global `equipe_planning`, sans créer une connaissance concurrente ou parallèle.

Le routage interne peut sélectionner seulement le domaine utile à une demande, mais Ángel doit conserver la compréhension des relations entre les domaines du module.
