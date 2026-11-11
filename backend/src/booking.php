<?php
declare(strict_types=1);
/* Supplementary diffusion records use the workspace's existing membership and CAS.
 * No invitation, account, session or issued accounting record is imported here. */
function booking_choices(mixed $values,array $allowed): void {
    if(!is_array($values)||!array_is_list($values)||count($values)>20)fail(422,'Critères de diffusion invalides.');
    foreach($values as $value)if(!is_string($value)||!in_array($value,$allowed,true))fail(422,'Critère de diffusion inconnu.');
}
function booking_amount(mixed $v,float $max=1000000): void {if($v!==null&&(!is_int($v)&&!is_float($v)||!is_finite((float)$v)||$v<0||$v>$max))fail(422,'Valeur de diffusion invalide.');}
function validate_booking(array $data,array $shows,array $ids): void {
    if(!isset($data['booking']))return;
    $b=$data['booking'];if(!is_array($b))fail(422,'Données de diffusion invalides.');
    $tags=['rue','theatre','cirque','jeune','objets','soin','mediation'];$topics=['enfance','lien','memoire','ecologie','recit','inclusion'];
    foreach(['shows'=>100,'venues'=>1000,'applications'=>1000,'catalog'=>500,'changes'=>80] as $key=>$limit){$rows=op_list($b[$key]??[],$limit);$seen=[];
        foreach($rows as $r){if(!is_array($r))fail(422,'Fiche de diffusion invalide.');
            $id=clean_text($r[$key==='shows'?'show':($key==='applications'?'requestId':($key==='venues'?'sourceId':'id'))]??null,250,'référence de diffusion',true);if(isset($seen[$id]))fail(422,'Référence de diffusion en double.');$seen[$id]=true;
            if($key==='shows'&&!isset($shows[$id]))fail(422,'Spectacle de diffusion absent du répertoire.');
            if($key==='applications'){if(!isset($ids['requests'][$id]))fail(422,'Démarche de candidature introuvable.');clean_text($r['subject']??null,500,'objet',true);clean_text($r['body']??null,14000,'message',true);if(!valid_date($r['sentAt']??''))fail(422,'Date d’envoi invalide.');}
            if(in_array($key,['shows','venues'],true)){booking_choices($r['tags']??[],$tags);booking_choices($r['topics']??[],$topics);op_enum($r['setting']??'unknown',['unknown','inside','outside','both']);foreach(['capacity','budget','fee','duration','width','depth'] as $n)booking_amount($r[$n]??null);if(!valid_date($r['checked']??'')||!valid_date($r['deadline']??'')||($r['checked']??'')>gmdate('Y-m-d'))fail(422,'Date de qualification invalide.');if($key==='venues'){op_enum($r['active']??'unknown',['unknown','yes','no']);op_enum($r['audience']??'unknown',['unknown','all','young','care']);op_enum($r['themeStatus']??'unknown',['unknown','free','imposed']);}}
            if($key==='catalog'&&(!is_array($r['source']??null)||($r['source']['id']??null)!==$id))fail(422,'Source de l’annuaire invalide.');
        }
    }
}
function booking_portable_restore(string $structure,string $actor,array $input): array {
    if(membership($structure,$actor,true)['role']!=='owner')fail(403,'Restauration réservée au responsable.');
    $backup=$input['backup']??null;if(!is_array($backup)||($backup['format']??'')!=='compagniecraft-workspace-v1'||($backup['structure']??'')!==$structure||!is_array($backup['state']??null)||!is_int($input['revision']??null))fail(422,'Sauvegarde incompatible avec cet espace.');
    return write_workspace($structure,$actor,$input['revision'],$backup['state']);
}
