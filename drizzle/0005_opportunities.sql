-- Public registry and bounded metadata, separate from troupe/private data.
CREATE TABLE opportunity_sources (id TEXT PRIMARY KEY,data TEXT NOT NULL,last_attempt TEXT,last_success TEXT,status TEXT NOT NULL DEFAULT 'pending',message TEXT NOT NULL DEFAULT '',new_count INTEGER NOT NULL DEFAULT 0,changed_count INTEGER NOT NULL DEFAULT 0,lease_until TEXT,lease_token TEXT);
--> statement-breakpoint
CREATE TABLE opportunity_items (source_id TEXT NOT NULL REFERENCES opportunity_sources(id),url TEXT NOT NULL,data TEXT NOT NULL,first_seen TEXT NOT NULL,last_seen TEXT NOT NULL,changed_at TEXT NOT NULL,PRIMARY KEY(source_id,url));
--> statement-breakpoint
CREATE INDEX opportunity_items_changed ON opportunity_items(changed_at DESC);
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('spectable','{"id":"spectable","name":"Spectable · appels à artistes","url":"https://www.spectable.com/appels-projets-artistiques/n_2654.php","category":"calls","territory":"France","connector":"spectable","note":"Demandes de prestations ; collecte sous réserve d’accès public du serveur."}','pending','Première collecte à effectuer.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('artesine','{"id":"artesine","name":"Artésine · demandes de spectacles","url":"https://www.artesine.fr/liste-annonces.html","category":"calls","territory":"France","connector":"artesine","note":"Liste nationale. Les coordonnées de certains organisateurs nécessitent un abonnement chez Artésine."}','pending','Première collecte à effectuer.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('artesine-pdl','{"id":"artesine-pdl","name":"Artésine · Pays de la Loire","url":"https://www.artesine.fr/annonces-region-7.html","category":"calls","territory":"Pays de la Loire","connector":"artesine","note":"Complément régional de la liste nationale ; dédoublonnage par URL d’annonce."}','pending','Première collecte à effectuer.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('artcena','{"id":"artcena","name":"ARTCENA · appels à projets","url":"https://www.artcena.fr/annonces/appels-a-projets","category":"calls","territory":"France","connector":"artcena","note":"Appels artistiques uniquement ; emplois et stages en entreprise exclus de ce collecteur."}','pending','Première collecte à effectuer.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('cnd','{"id":"cnd","name":"Centre national de la danse","url":"https://www.cnd.fr/fr/appels-a-projets?sort_by=date_limite","category":"calls","territory":"France / international","connector":"cnd","note":"Appels chorégraphiques ; échéance de candidature distincte des dates de spectacle."}','pending','Première collecte à effectuer.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('fnar','{"id":"fnar","name":"Fédération nationale des arts de la rue","url":"https://www.federationartsdelarue.org/ressources/petites-annonces-et-appels-projets","category":"calls","territory":"France","connector":null,"note":"Portail vers les petites annonces et appels ; consultation directe."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('arsud','{"id":"arsud","name":"Arsud · appels à projets","url":"https://arsud-regionsud.com/arsudez-vous/appels-projets","category":"calls","territory":"Sud / France","connector":"arsud","note":"Appels et dispositifs de soutien ; une aide n’est pas une réservation de spectacle."}','pending','Première collecte à effectuer.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('artcena-directory','{"id":"artcena-directory","name":"Annuaire ARTCENA","url":"https://www.artcena.fr/annuaire/map","category":"directory","territory":"France","connector":null,"note":"Festivals et structures à contacter ; aucune candidature ouverte présumée."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('radar','{"id":"radar","name":"Réseau RADAR","url":"https://ruedesarts.net/Le-reseau-RADAR","category":"directory","territory":"Bretagne","connector":null,"note":"Accompagnement des arts de la rue et festivals de proximité."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('renar','{"id":"renar","name":"ReNAR · événements","url":"https://reseau-renar.fr/index.php/festivals/","category":"directory","territory":"Normandie","connector":null,"note":"Carte des événements ; vérifier la prochaine édition auprès de l’organisateur."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('risotto','{"id":"risotto","name":"Réseau Risotto","url":"https://reseaurisotto.fr/risotto/","category":"directory","territory":"Île-de-France","connector":null,"note":"Création et diffusion dans l’espace public."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('reseau535','{"id":"reseau535","name":"Réseau 535 · appels et formations","url":"https://www.reseau535.fr/appels-a-projets/","category":"calls","territory":"Nouvelle-Aquitaine / France","connector":null,"note":"Page mêlant aides et formations ; consultation directe en attendant un extracteur validé."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('fedec','{"id":"fedec","name":"FEDEC · opportunités","url":"https://www.fedec.eu/fr/opportunities/","category":"calls","territory":"Europe / international","connector":null,"note":"Cirque : participation, formation et emploi ; vérifier la nature de chaque annonce."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('circostrada','{"id":"circostrada","name":"Circostrada · On the Move","url":"https://on-the-move.org/network/members/circostrada","category":"directory","territory":"Europe / international","connector":null,"note":"Cette adresse présente le réseau ; elle n’est pas un flux d’appels ouverts."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('clowns','{"id":"clowns","name":"La Grande Famille des Clowns","url":"https://lagrandefamilledesclowns.art/formations","category":"training","territory":"France / international","connector":null,"note":"Stages de pratique clown, à distinguer des propositions de prestations."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('spectable-pdl','{"id":"spectable-pdl","name":"Spectable · improvisation en Pays de la Loire","url":"https://www.spectable.com/Improvisation/pays-de-la-loire/l_41.php","category":"training","territory":"Pays de la Loire","connector":null,"note":"Stages, cours et annonces ; consultation directe."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('citron','{"id":"citron","name":"Cours CITRON","url":"https://www.courscitron.fr/stages/","category":"training","territory":"Nantes","connector":null,"note":"Théâtre, improvisation, clown et jeu caméra."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('fabrique','{"id":"fabrique","name":"La Fabrique à Impros","url":"https://lafabriqueaimpros.com/stages/","category":"training","territory":"Nantes","connector":null,"note":"Stages d’improvisation pour adultes, enfants et adolescents."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('abracos','{"id":"abracos","name":"Abraços · stages et jams","url":"https://abracos-danse-nantes.org/stages-jams","category":"training","territory":"Nantes","connector":null,"note":"Danse et improvisation contact."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('artsenscene','{"id":"artsenscene","name":"Arts en Scène","url":"https://www.artsenscene.com/","category":"training","territory":"France","connector":null,"note":"Théâtre, danse, clown, mime et voix."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('cercle','{"id":"cercle","name":"Théâtre du Cercle","url":"https://theatreducercle.com/les-activites/stages/","category":"training","territory":"Rennes","connector":null,"note":"Stages de pratique artistique."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('pole-pdl','{"id":"pole-pdl","name":"Pôle spectacle vivant des Pays de la Loire","url":"https://pole-spectacle-vivant-pdl.fr/petites-annonces-et-offres-demploi/","category":"relay","territory":"Pays de la Loire","connector":null,"note":"Petites annonces, emploi et mutualisation ; tous les résultats ne sont pas des dates de jeu."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('nantes-projets','{"id":"nantes-projets","name":"Nantes · À vos projets","url":"https://metropole.nantes.fr/mes-services-mon-quotidien/aides-et-bons-plans/a-vos-projets","category":"relay","territory":"Nantes","connector":null,"note":"Appels et soutiens selon les dispositifs et les porteurs éligibles."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
INSERT INTO opportunity_sources(id,data,status,message) VALUES('fede-breizh','{"id":"fede-breizh","name":"Fédé Breizh · contact et diffusion","url":"https://www.federationartsdelarue.org/fede-breizh/contacter-fede-breizh","category":"relay","territory":"Bretagne","connector":null,"note":"Relais professionnel ; inscription aux listes de diffusion à demander personnellement."}','manual','Consultation directe ; aucun import automatique.');
--> statement-breakpoint
