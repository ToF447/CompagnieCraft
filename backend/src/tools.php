<?php
// Optional workspace modules and workshop preparation. No executable plugin code
// or arbitrary CSS is accepted from workspace JSON.
function validate_optional_tools(array $state): void {
    if(isset($state['music'])) {
        $m=$state['music'];if(!is_array($m))fail(422,'Projet musical invalide.');
        foreach(['title'=>160,'notes'=>3000,'listen'=>500] as $key=>$limit)clean_text($m[$key]??'', $limit, 'projet musical '.$key);
        if(!in_array($m['style']??null,['chanson','jazz','rock','rap','electro','world','trad','metal','classique','rnb'],true)||!in_array($m['format']??null,['acoustique','amplifie'],true)||!in_array($m['scope']??null,['city','km25','km50','km100','france'],true))fail(422,'Style, format ou périmètre musical invalide.');
        foreach(['members'=>30,'duration'=>300,'capacity'=>2000] as $key=>$max)if(!is_int($m[$key]??null)||$m[$key]<1||$m[$key]>$max)fail(422,'Effectif, durée ou jauge musicale invalide.');
        if(!empty($m['listen'])){$u=parse_url($m['listen']);if(!$u||!in_array($u['scheme']??'', ['http','https'],true)||empty($u['host'])||isset($u['user'])||isset($u['pass']))fail(422,'Lien d’écoute invalide.');}
        if(isset($m['city'])&&(!is_array($m['city'])||!preg_match('/^(?:[0-9]{5}|2[AB][0-9]{3})$/',$m['city']['code']??'')||!is_string($m['city']['nom']??null)))fail(422,'Commune du projet musical invalide.');
    }
    if(isset($state['modules'])){$m=$state['modules'];if(!is_array($m)||($m['version']??null)!==1||!is_array($m['enabled']??null)||!array_is_list($m['enabled'])||count($m['enabled'])>80)fail(422,'Configuration de modules invalide.');$seen=[];foreach($m['enabled'] as $id){if(!is_string($id)||!preg_match('/^[a-z0-9-]{2,40}$/',$id)||isset($seen[$id]))fail(422,'Module inconnu ou en double.');$seen[$id]=true;}}
    if(!isset($state['practice']))return;$p=$state['practice'];if(!is_array($p)||($p['version']??null)!==1)fail(422,'Préparation d’atelier invalide.');
    foreach(['references'=>80,'favorites'=>200,'workshop'=>20,'impros'=>30] as $key=>$max)if(!is_array($p[$key]??null)||!array_is_list($p[$key])||count($p[$key])>$max)fail(422,'Liste de préparation invalide.');
    $seen=[];foreach($p['references'] as $r){if(!is_array($r))fail(422,'Référence invalide.');$id=clean_text($r['id']??null,100,'référence',true);if(isset($seen[$id])||!is_int($r['roles']??null)||$r['roles']<1||$r['roles']>80)fail(422,'Distribution invalide.');$seen[$id]=true;foreach(['title'=>800,'author'=>800,'genre'=>320,'source'=>2000,'note'=>4000] as $key=>$max)clean_text($r[$key]??'',$max,'référence '.$key,$key==='title');$source=$r['source']??'';if($source!==''){$url=parse_url($source);if(!$url||!in_array($url['scheme']??'', ['http','https'],true)||empty($url['host'])||isset($url['user'])||isset($url['pass']))fail(422,'Lien de référence invalide.');}}
    foreach($p['favorites'] as $id)clean_text($id,100,'favori',true);
    $exercises=['boussole','prenoms','intentions','objet','tableau','entree','vitesses','accord','replique','sons','decor','sortie'];foreach($p['workshop'] as $row){if(!is_array($row)||!in_array($row['exerciseId']??null,$exercises,true)||!is_int($row['minutes']??null)||$row['minutes']<1||$row['minutes']>120)fail(422,'Exercice de séance invalide.');clean_text($row['note']??'',4000,'note de séance');}
    foreach($p['impros'] as $row){clean_text($row['theatreNotes']??'',4000,'notes de mise en scène');if(!is_array($row))fail(422,'Improvisation invalide.');clean_text($row['id']??null,100,'improvisation',true);clean_text($row['created']??null,40,'date de tirage',true);foreach(['place','relation','objective','trigger','constraint'] as $key)clean_text($row[$key]??null,1200,'consigne',true);if(!is_int($row['players']??null)||$row['players']<2||$row['players']>12||!is_int($row['minutes']??null)||$row['minutes']<1||$row['minutes']>30)fail(422,'Effectif ou durée invalide.');}
}
