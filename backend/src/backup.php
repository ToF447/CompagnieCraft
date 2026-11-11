<?php
declare(strict_types=1);
// Read-only structure export. Caller identity is from the authenticated session;
// membership is checked here, not inferred from a browser role or workspace name.
function backup_structure(string $structure,string $actor): array {
    require_once __DIR__.'/access.php';access_owner($structure,$actor);
    $pdo=db();$pdo->beginTransaction();
    try {
        $workspace=read_workspace($structure,$actor);
        $queries=[
            'structure'=>['SELECT id,name,created_at FROM atelier_structures WHERE id=?',$structure],
            'comptes_membres'=>['SELECT a.id,a.email,a.display_name,a.active,a.created_at,m.role FROM atelier_memberships m JOIN atelier_accounts a ON a.id=m.account_id WHERE m.structure_id=?',$structure],
            'invitations_statuts'=>['SELECT id,email,display_name,role,created_at,expires_at,used_at,cancelled_at FROM atelier_invitations WHERE structure_id=?',$structure],
            'historique_espace'=>['SELECT revision,data,actor_id,created_at FROM atelier_revisions WHERE structure_id=?',$structure],
            'journal_structure'=>['SELECT id,actor_id,action,created_at FROM atelier_audit WHERE structure_id=?',$structure],
            'apparence_compte'=>['SELECT theme,updated_at FROM atelier_preferences WHERE account_id=?',$actor],
            'interface_compte'=>['SELECT settings,updated_at FROM atelier_interface_preferences WHERE account_id=?',$actor],
            'factures_emises'=>['SELECT id,source_id,number,issued,data FROM atelier_invoices WHERE structure_id=?',$structure],
            'paiements'=>['SELECT id,invoice_id,provider_ref,data FROM atelier_payments WHERE structure_id=?',$structure],
            'numerotation_factures'=>['SELECT year,value FROM atelier_finance_sequences WHERE structure_id=?',$structure],
            'suivi_paiements'=>['SELECT id,invoice_id,amount,status,created_at,expires_at FROM atelier_checkouts WHERE structure_id=?',$structure]
        ];
        $tables=[];$size=0;
        foreach($queries as $name=>[$sql,$scope]) {
            $tables[$name]=[];
            for($offset=0;;$offset+=500) {
                $rows=query($sql.' ORDER BY 1 LIMIT 500 OFFSET '.(int)$offset,[$scope])->fetchAll();
                $size+=strlen(json_encode($rows,JSON_THROW_ON_ERROR));
                if($size>24000000||$offset>=50000)fail(413,'Export trop volumineux. Aucune sauvegarde partielle ne sera fournie.');
                foreach($rows as &$row)foreach(['data','settings'] as $field)if(isset($row[$field]))$row[$field]=json_decode($row[$field],true,32,JSON_THROW_ON_ERROR);
                unset($row);array_push($tables[$name],...$rows);if(count($rows)<500)break;
            }
        }
        $pdo->commit();
        return ['schema'=>'compagniecraft-server-backup-v1','exportedAt'=>gmdate('c'),'structure'=>$structure,'revision'=>$workspace['revision'],'workspace'=>$workspace['state'],'tables'=>$tables,'coverage'=>['Espace enregistré de la structure sélectionnée','Historique conservé, membres et droits, journal, factures émises et paiements','Préférences du compte connecté'],'excluded'=>['Mots de passe, sessions et jetons d’invitation ou de paiement','Données des autres structures','Configuration serveur et caches publics','Pièces jointes binaires : seuls leurs liens et métadonnées présents dans les fiches sont exportés']];
    } catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
