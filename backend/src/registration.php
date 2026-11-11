<?php
declare(strict_types=1);
/* An account starts with an empty, private workspace and one declared show.
 * Legal status, bank details and payment activation are never signup prerequisites. */
function signup_city(mixed $v): array {
    if(!is_array($v)||!is_array($v['departement']??null)||!is_array($v['region']??null))fail(422,'Choisissez votre commune dans les propositions.');
    $city=['nom'=>clean_text($v['nom']??null,180,'commune',true),'code'=>clean_text($v['code']??null,5,'code communal',true),'codesPostaux'=>[], 'departement'=>['nom'=>clean_text($v['departement']['nom']??null,100,'département',true),'code'=>clean_text($v['departement']['code']??null,3,'code du département',true)],'region'=>['nom'=>clean_text($v['region']['nom']??null,100,'région',true),'code'=>clean_text($v['region']['code']??null,2,'code de région',true)]];
    if(!preg_match('/^[0-9A-Z]{5}$/iD',$city['code'])||!preg_match('/^[0-9A-Z]{2,3}$/iD',$city['departement']['code'])||!preg_match('/^[0-9]{2}$/D',$city['region']['code']))fail(422,'Références de commune invalides.');return $city;
}
function register_workspace(array $v): array {
    if(!config()['registration_enabled'])fail(403,'La création de comptes n’est pas encore ouverte sur ce serveur.');
    require_once __DIR__.'/manifesto.php';$signer=manifesto_validate($v);
    $name=clean_text($v['name']??null,120,'nom de scène ou de troupe',true);$email=strtolower(clean_text($v['email']??null,254,'adresse e-mail',true));
    if(!filter_var($email,FILTER_VALIDATE_EMAIL))fail(422,'Adresse e-mail invalide.');
    $password=$v['password']??null;if(!is_string($password)||str_contains($password,"\0")||strlen($password)<12||strlen($password)>72)fail(422,'Choisissez un mot de passe de 12 à 72 octets.');
    $city=signup_city($v['city']??null);$show=clean_text($v['show']??null,250,'premier spectacle',true);
    $genres=['rue'=>'Arts de la rue','theatre'=>'Théâtre','cirque'=>'Cirque','objets'=>'Objets / marionnettes','musique'=>'Musique','danse'=>'Danse','conte'=>'Conte / récit','autre'=>'Autre forme artistique'];
    $genre=$v['genre']??'';if(!is_string($genre)||!isset($genres[$genre]))fail(422,'Choisissez la forme de votre spectacle.');
    $audiences=['all'=>'Tout public','young'=>'Jeune public','care'=>'Publics en lieux de soin'];$audience=$v['audience']??'';if(!is_string($audience)||!isset($audiences[$audience]))fail(422,'Choisissez le public visé.');
    $scope=$v['scope']??'';if(!in_array($scope,['city','department','region','france'],true))fail(422,'Choisissez votre zone de déplacement.');
    $topics=clean_text($v['topics']??'',700,'sujets du spectacle');
    $state=empty_workspace($name);$state['profile']['shows']=[$show];$state['company']['city']=$city['nom'];$state['company']['type']='Équipe artistique';
    $state['company']['shows']=[['name'=>$show,'genre'=>$genres[$genre],'age'=>$audiences[$audience],'topics'=>$topics,'story'=>'','duration'=>'','capacity'=>'','cast'=>'','space'=>'','tech'=>'','setup'=>'','access'=>'','weather'=>'','price'=>'']];
    $state['organization']=['kind'=>'company','name'=>$name,'city'=>$city['nom'],'location'=>$city,'contactName'=>$name,'email'=>$email,'publicEmail'=>''];
    $state['prospectLocation']=$city;$state['prospectScope']=$scope;$state['prospectSelection']=$show;
    $tags=in_array($genre,['rue','theatre','cirque','objets'],true)?[$genre]:[];if($audience==='young')$tags[]='jeune';if($audience==='care')$tags[]='soin';
    $state['prospectProfiles']=[['show'=>$show,'tags'=>$tags]];$state['features']=['finances'=>false];
    $json=validate_workspace($state);$key=hash('sha256','registration:'.($_SERVER['REMOTE_ADDR']??''));
    $bucket=query('SELECT failures,window_start FROM atelier_attempts WHERE key_hash=?',[$key])->fetch();
    if($bucket&&(int)$bucket['window_start']>time()-900&&(int)$bucket['failures']>=3)fail(429,'Plusieurs espaces ont déjà été créés depuis cette connexion. Réessayez plus tard.');
    $pdo=db();$pdo->beginTransaction();
    try{
        if(query('SELECT id FROM atelier_accounts WHERE email=?',[$email])->fetch())fail(409,'Un compte utilise déjà cette adresse. Connectez-vous avec ce compte.');
        $actor=add_account($email,$name,$password);$structure=uid();$now=time();
        query('INSERT INTO atelier_structures(id,name,created_at) VALUES(?,?,?)',[$structure,$name,$now]);
        query('INSERT INTO atelier_memberships(structure_id,account_id,role) VALUES(?,?,?)',[$structure,$actor,'owner']);
        query('INSERT INTO atelier_workspaces(structure_id,revision,data,updated_at) VALUES(?,?,?,?)',[$structure,1,$json,$now]);
        query('INSERT INTO atelier_revisions(structure_id,revision,data,actor_id,created_at) VALUES(?,?,?,?,?)',[$structure,1,$json,$actor,$now]);
        if($bucket)query('UPDATE atelier_attempts SET failures=?,window_start=? WHERE key_hash=?',[(int)$bucket['window_start']>time()-900?(int)$bucket['failures']+1:1,$now,$key]);else query('INSERT INTO atelier_attempts(key_hash,failures,window_start) VALUES(?,?,?)',[$key,1,$now]);
        manifesto_sign($actor,$signer);
        audit($structure,$actor,'account.registered');$pdo->commit();return ['account_id'=>$actor,'structure_id'=>$structure];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
