<?php
declare(strict_types=1);

// These are troupe-owned references, never targets for a server-side crawler.
function validate_source_registry(array $data): void {
    if (isset($data['customSources'])) {
        $rows=$data['customSources'];
        if(!is_array($rows)||!array_is_list($rows)||count($rows)>300)fail(422,'Trop de sources personnelles.');
        $ids=[];
        foreach($rows as $row){
            if(!is_array($row))fail(422,'Source personnelle invalide.');
            $id=clean_text($row['id']??null,100,'identifiant de source',true);
            if(isset($ids[$id]))fail(422,'Source en double.');$ids[$id]=true;
            clean_text($row['name']??null,250,'nom de source',true);
            $url=clean_text($row['source']??null,2048,'adresse de source',true);
            $parts=parse_url($url);$host=$parts['host']??'';
            if(!filter_var($url,FILTER_VALIDATE_URL)||!in_array($parts['scheme']??'', ['http','https'],true)||isset($parts['user'])||isset($parts['pass'])||!str_contains($host,'.')||preg_match('~\.(local|internal|localhost)$~i',$host)||(filter_var($host,FILTER_VALIDATE_IP)&&!filter_var($host,FILTER_VALIDATE_IP,FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE)))fail(422,'Adresse publique de source invalide.');
            if(!in_array($row['type']??'', ['community','festival','venue','network','residence','care'],true))fail(422,'Type de source invalide.');
            if(!valid_date($row['checked']??''))fail(422,'Date de consultation invalide.');
            if(!is_array($row['tags']??null)||!array_is_list($row['tags'])||count($row['tags'])>30)fail(422,'Critères de source invalides.');
            foreach($row['tags'] as $tag)clean_text($tag,80,'critère de source',true);
            if(isset($row['archived'])&&!is_bool($row['archived']))fail(422,'État de source invalide.');
        }
    }
    if(isset($data['sourceRegistry'])){
        $registry=$data['sourceRegistry'];if(!is_array($registry))fail(422,'Registre de sources invalide.');
        foreach(['known'=>2000,'runs'=>20,'notifications'=>60] as $key=>$limit){
            $rows=$registry[$key]??[];if(!is_array($rows)||!array_is_list($rows)||count($rows)>$limit)fail(422,'Historique des sources trop volumineux.');
            foreach($rows as $row){if($key==='known')clean_text($row,250,'identifiant de piste',true);elseif(!is_array($row))fail(422,'Historique de source invalide.');}
        }
    }
    if(isset($data['organization'])){
        $p=$data['organization'];if(!is_array($p)||!in_array($p['kind']??'', ['association','company','artist','collective','venue'],true))fail(422,'Profil de structure invalide.');
        foreach(['name'=>160,'city'=>250,'contactName'=>120] as $key=>$limit)clean_text($p[$key]??null,$limit,$key,true);
        foreach(['email','publicEmail'] as $key){$email=clean_text($p[$key]??'',254,$key,$key==='email');if($email!==''&&!filter_var($email,FILTER_VALIDATE_EMAIL))fail(422,'Adresse e-mail de structure invalide.');}
    }
}
