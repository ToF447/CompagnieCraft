<?php
declare(strict_types=1);
/* Relations only: accounts, payroll and issued finance stay outside these records. */
function validate_programming(array $data,array $ids): void {
    if(!isset($data['programming']))return;$v=$data['programming'];if(!is_array($v))fail(422,'Programmation invalide.');
    $requests=[];foreach($data['requests'] as $r)$requests[$r['id']]=$r;
    $slots=[];foreach($data['planningSlots']??[] as $s)$slots[$s['id']]=$s;
    $projects=[];foreach($data['productions']??[] as $p)$projects[$p['id']]=$p;
    $runs=[];$seen=[];foreach(op_rows($v['runs']??[],1000) as $run){$r=$requests[$run['requestId']??'']??null;$p=$projects[$run['productionId']??'']??null;$s=$slots[$run['anchorId']??'']??null;
        if(!$r||!$p||!$s||isset($seen[$r['id']])||!in_array($r['id'],$p['requestIds'],true)||$s['productionId']!==$p['id']||($s['programRunId']??'')!==$run['id']||($s['programOffset']??null)!==0||!$r['date'])fail(422,'Relations de programmation invalides.');
        clean_text($run['note']??'',4000,'consignes partagées');$seen[$r['id']]=true;$runs[$run['id']]=$run;
    }
    foreach($slots as $s){if(!isset($s['programRunId']))continue;$run=$runs[$s['programRunId']]??null;$offset=$s['programOffset']??null;if(!$run||$s['productionId']!==$run['productionId']||!is_int($offset)||abs($offset)>30)fail(422,'Lien du créneau de programmation invalide.');$r=$requests[$run['requestId']];$expected=(new DateTimeImmutable($r['date']))->modify(($offset>=0?'+':'').$offset.' days')->format('Y-m-d');if($s['date']!==$expected||$s['place']!==$r['place'])fail(422,'Le créneau doit suivre la date et le lieu source.');}
    $seen=[];foreach(op_list($v['assignments']??[],5000) as $a){if(!is_array($a))fail(422,'Affectation invalide.');$s=$slots[$a['slotId']??'']??null;$member=$a['member']??'';if(!$s||!is_string($member)||!in_array($member,$s['members'],true))fail(422,'Personne non affectée au créneau.');$key=$s['id'].'|'.$member;if(isset($seen[$key]))fail(422,'Affectation en double.');$seen[$key]=true;clean_text($a['role']??'',250,'mission',true);op_enum($a['response']??'',['pending','confirmed','unavailable']);$actual=$a['actualMinutes']??null;if($actual!==null&&(!is_int($actual)||$actual<0||$actual>1440))fail(422,'Temps réalisé invalide.');}
}
