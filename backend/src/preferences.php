<?php
declare(strict_types=1);
function preference_data(string $actor): array {
    $row=query('SELECT theme,updated_at FROM atelier_preferences WHERE account_id=?',[$actor])->fetch();
    return ['theme'=>$row['theme']??'atelier','scope'=>hash('sha256','appearance|'.$actor),'updatedAt'=>$row?(int)$row['updated_at']:null];
}
function preference_save(string $actor,array $v): array {
    if(!in_array($v['theme']??null,['atelier','studio','coulisses','papier','contraste'],true))fail(422,'Choisissez une des cinq apparences.');
    if(!is_string($v['scope']??null)||!hash_equals(hash('sha256','appearance|'.$actor),$v['scope']))fail(409,'Le compte connecté a changé. Relisez vos préférences.');
    $now=(int)round(microtime(true)*1000);
    $sql=db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?'INSERT INTO atelier_preferences(account_id,theme,updated_at) VALUES(?,?,?) ON DUPLICATE KEY UPDATE theme=?,updated_at=?':'INSERT INTO atelier_preferences(account_id,theme,updated_at) VALUES(?,?,?) ON CONFLICT(account_id) DO UPDATE SET theme=excluded.theme,updated_at=excluded.updated_at';
    query($sql,db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?[$actor,$v['theme'],$now,$v['theme'],$now]:[$actor,$v['theme'],$now]);return preference_data($actor);
}
