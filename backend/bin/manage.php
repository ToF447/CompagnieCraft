<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../src/core.php';
try{
    $action=$argv[1]??'';
    if($action==='install'){install_schema();echo "Schéma installé.\n";exit;}
    // Secrets arrive on stdin, never in process arguments or output.
    $data=json_decode(stream_get_contents(STDIN),true,32,JSON_THROW_ON_ERROR);
    if(!is_array($data))fail(422,'JSON attendu sur stdin.');
    if($action==='account'){$id=add_account($data['email']??'',$data['name']??'',$data['password']??'');echo json_encode(['account_id'=>$id])."\n";exit;}
    if($action==='structure'){$id=add_structure($data['name']??'',$data['owner_id']??'');echo json_encode(['structure_id'=>$id])."\n";exit;}
    if($action==='member'){$role=$data['role']??'';if(!in_array($role,['editor','viewer'],true))fail(422,'Rôle attendu : editor ou viewer.');query('INSERT INTO atelier_memberships(structure_id,account_id,role) VALUES(?,?,?)',[$data['structure_id'],$data['account_id'],$role]);echo "Membre rattaché.\n";exit;}
    if($action==='password'){$password=$data['password']??'';if(strlen($password)<12||strlen($password)>72)fail(422,'Mot de passe trop court ou trop long.');$q=query('UPDATE atelier_accounts SET password_hash=?,session_version=session_version+1 WHERE id=?',[password_hash($password,PASSWORD_DEFAULT),$data['account_id']??'']);if(!$q->rowCount())fail(404,'Compte introuvable.');echo "Mot de passe remplacé, sessions révoquées.\n";exit;}
    fail(400,'Actions : install, account, structure, member, password.');
}catch(Throwable $e){fwrite(STDERR,$e instanceof AtelierError?$e->getMessage()."\n":"Commande impossible.\n");exit(1);}
