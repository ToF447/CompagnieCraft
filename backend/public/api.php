<?php
declare(strict_types=1);
require __DIR__.'/../src/core.php';
require_once __DIR__.'/../src/manifesto.php';
function respond(array $data,int $status=200): never { http_response_code($status);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit; }
try {
    header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store, private');header('X-Content-Type-Options: nosniff');header('Referrer-Policy: same-origin');
    $c=config();$private=realpath($c['private_dir']);$root=realpath(__DIR__);
    if(!$private||($root&&str_starts_with(strtolower($private.DIRECTORY_SEPARATOR),strtolower($root.DIRECTORY_SEPARATOR))))fail(503,'Dossier privé indisponible.');
    $sessionDir=$private.'/sessions';if(!is_dir($sessionDir)&&!mkdir($sessionDir,0700,true))fail(503,'Session indisponible.');
    ini_set('display_errors','0');ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');session_save_path($sessionDir);session_name('atelier_session');session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>!$c['development'],'httponly'=>true,'samesite'=>'Strict']);session_start();
    $_SESSION['csrf']??=bin2hex(random_bytes(32));
    $method=$_SERVER['REQUEST_METHOD'];$action=$_GET['action']??'session';
    $input=[];
    if($method!=='GET'){
        if($method!=='POST')fail(405,'Méthode non autorisée.');
        if(($_SERVER['HTTP_ORIGIN']??'')!==$c['origin'])fail(403,'Origine non autorisée.');
        if(!str_starts_with($_SERVER['CONTENT_TYPE']??'','application/json'))fail(415,'Format JSON requis.');
        if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))fail(403,'Session de formulaire expirée. Rechargez les informations de connexion.');
        if((int)($_SERVER['CONTENT_LENGTH']??0)>1600000)fail(413,'Requête trop volumineuse.');
        $raw=file_get_contents('php://input',false,null,0,1600001);if(strlen($raw)>1600000)fail(413,'Requête trop volumineuse.');
        try{$input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);}catch(JsonException){fail(400,'JSON invalide.');}if(!is_array($input))fail(400,'Requête invalide.');
    }
    $actor=null;
    if(isset($_SESSION['account'])){
        if(time()-($_SESSION['seen']??0)>1800||time()-($_SESSION['started']??0)>28800){unset($_SESSION['account']);}
        else{$actor=query('SELECT id,email,display_name,active,session_version FROM atelier_accounts WHERE id=?',[$_SESSION['account']])->fetch();if(!$actor||!(int)$actor['active']||(int)$actor['session_version']!==($_SESSION['session_version']??0)){$actor=null;unset($_SESSION['account']);}else $_SESSION['seen']=time();}
    }
    if($action==='session'&&$method==='GET'){
        $structures=$actor?query('SELECT s.id,s.name,m.role FROM atelier_structures s JOIN atelier_memberships m ON m.structure_id=s.id WHERE m.account_id=? ORDER BY s.name',[$actor['id']])->fetchAll():[];
        respond(['csrf'=>$_SESSION['csrf'],'account'=>$actor?['id'=>$actor['id'],'email'=>$actor['email'],'name'=>$actor['display_name']]:null,'structures'=>$structures,'registrationEnabled'=>$c['registration_enabled'],'manifestoSignature'=>$actor?manifesto_signature($actor['id']):null]);
    }
    if($action==='register'&&$method==='POST'){
        if($actor)fail(409,'Déconnectez le compte actuel avant de créer un autre compte.');
        require_once __DIR__.'/../src/registration.php';$created=register_workspace($input);$account=query('SELECT session_version FROM atelier_accounts WHERE id=?',[$created['account_id']])->fetch();
        session_regenerate_id(true);$_SESSION=['account'=>$created['account_id'],'session_version'=>(int)$account['session_version'],'started'=>time(),'seen'=>time(),'csrf'=>bin2hex(random_bytes(32))];respond(['ok'=>true,'csrf'=>$_SESSION['csrf'],'structure_id'=>$created['structure_id']],201);
    }
    if($action==='login'&&$method==='POST'){
        $email=strtolower(clean_text($input['email']??'',254,'adresse e-mail'));$password=$input['password']??'';if(!is_string($password)||strlen($password)>72||str_contains($password,"\0"))fail(401,'Adresse ou mot de passe incorrect.');
        // Per-account and per-client buckets; values expire after fifteen minutes.
        query('DELETE FROM atelier_attempts WHERE window_start<?',[time()-900]);$keys=[hash('sha256','mail:'.$email),hash('sha256','ip:'.($_SERVER['REMOTE_ADDR']??''))];
        foreach($keys as $key){$a=query('SELECT failures FROM atelier_attempts WHERE key_hash=?',[$key])->fetch();if($a&&(int)$a['failures']>=10)fail(429,'Trop de tentatives. Réessayez dans quinze minutes.');}
        $account=query('SELECT * FROM atelier_accounts WHERE email=?',[$email])->fetch();
        $hash=$account['password_hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        if(!password_verify($password,$hash)||!$account||!(int)$account['active']){
            foreach($keys as $key){$q=query('UPDATE atelier_attempts SET failures=failures+1 WHERE key_hash=?',[$key]);if(!$q->rowCount()){try{query('INSERT INTO atelier_attempts(key_hash,failures,window_start) VALUES(?,?,?)',[$key,1,time()]);}catch(PDOException){query('UPDATE atelier_attempts SET failures=failures+1 WHERE key_hash=?',[$key]);}}}fail(401,'Adresse ou mot de passe incorrect.');
        }
        query('DELETE FROM atelier_attempts WHERE key_hash=?',[$keys[0]]);session_regenerate_id(true);$_SESSION=['account'=>$account['id'],'session_version'=>(int)$account['session_version'],'started'=>time(),'seen'=>time(),'csrf'=>bin2hex(random_bytes(32))];respond(['ok'=>true,'csrf'=>$_SESSION['csrf']]);
    }
    // Bind requests to the account displayed in the originating tab. This is
    // an additional consistency check, never a substitute for session authorization.
    $expectedAccount=$_SERVER['HTTP_X_ATELIER_ACCOUNT']??'';
    if($expectedAccount!==''&&$actor&&!hash_equals($actor['id'],$expectedAccount))fail(409,'Le compte connecté a changé. Rechargez votre session avant de continuer.');
    if(in_array($action,['invite-info','invite-accept'],true)&&$method==='POST'){
        require_once __DIR__.'/../src/access.php';
        if($action==='invite-info')respond(access_invite_info(clean_text($input['token']??null,64,'invitation',true)));
        $accepted=access_accept($input,$actor);$account=$accepted['account'];session_regenerate_id(true);$_SESSION=['account'=>$account['id'],'session_version'=>(int)$account['session_version'],'started'=>time(),'seen'=>time(),'csrf'=>bin2hex(random_bytes(32))];respond(['ok'=>true,'csrf'=>$_SESSION['csrf'],'structure_id'=>$accepted['structure_id'],'new_account'=>$accepted['new_account']]);
    }
    if(!$actor)fail(401,'Connectez-vous avec votre compte individuel.');
    if($action==='manifesto'){if($method==='GET')respond(['signature'=>manifesto_signature($actor['id'])]);respond(['signature'=>manifesto_sign($actor['id'],manifesto_validate($input))]);}
    if($action==='impro-read'&&$method==='POST'){require_once __DIR__.'/../src/impro-examples.php';respond(impro_article($input));}
    if($action==='impro-examples'&&$method==='GET'){require_once __DIR__.'/../src/impro-examples.php';respond(impro_examples());}
    if($action==='preferences'){
        require_once __DIR__.'/../src/preferences.php';
        if($method==='GET')respond(preference_data($actor['id']));
        if($method==='POST')respond(preference_save($actor['id'],$input));
    }
    if($action==='interface-preferences'){
        require_once __DIR__.'/../src/interface.php';
        if($method==='GET')respond(interface_data($actor['id']));
        if($method==='POST')respond(interface_save($actor['id'],$input));
    }
    if($action==='logout'&&$method==='POST'){$_SESSION=[];session_destroy();setcookie('atelier_session','',['expires'=>time()-3600,'path'=>'/','secure'=>!$c['development'],'httponly'=>true,'samesite'=>'Strict']);respond(['ok'=>true]);}
    $structure=clean_text($_GET['structure']??$input['structure']??'',32,'espace',true);
    if($action==='backup'&&$method==='GET'){require_once __DIR__.'/../src/backup.php';respond(backup_structure($structure,$actor['id']));}
    if(str_starts_with($action,'access-')){
        require_once __DIR__.'/../src/access.php';
        if($action==='access-team'&&$method==='GET')respond(access_team($structure,$actor['id']));
        if($action==='access-invite'&&$method==='POST')respond(access_invite($structure,$actor['id'],$input));
        if($action==='access-cancel'&&$method==='POST'){access_cancel($structure,$actor['id'],clean_text($input['id']??null,32,'invitation',true));respond(['ok'=>true]);}
        if($action==='access-member'&&$method==='POST'){access_member($structure,$actor['id'],clean_text($input['member']??null,32,'membre',true),clean_text($input['role']??null,16,'rôle',true));respond(['ok'=>true]);}
    }
    if(str_starts_with($action,'finance')){
        require_once __DIR__.'/../src/finance-stripe.php';
        if($action==='finance'&&$method==='GET')respond(finance_get($structure,$actor['id']));
        if($action==='finance-issue'&&$method==='POST')respond(finance_issue($structure,$actor['id'],clean_text($input['draftId']??null,100,'brouillon',true)));
        if($action==='finance-credit'&&$method==='POST')respond(finance_credit($structure,$actor['id'],clean_text($input['invoiceId']??null,32,'facture',true)));
        if($action==='finance-reverse'&&$method==='POST')respond(finance_reverse($structure,$actor['id'],clean_text($input['paymentId']??null,32,'règlement',true),clean_text($input['reference']??null,500,'motif',true)));
        if($action==='finance-payment'&&$method==='POST')respond(finance_payment($structure,$actor['id'],$input));
        if($action==='finance-checkout'&&$method==='POST')respond(finance_checkout($structure,$actor['id'],clean_text($input['invoiceId']??null,32,'facture',true)));
    }
    if($action==='workspace'&&$method==='GET')respond(read_workspace($structure,$actor['id']));
    if($action==='workspace'&&$method==='POST'){
        if(!is_int($input['revision']??null)||!is_array($input['state']??null))fail(422,'Révision et données nécessaires.');respond(write_workspace($structure,$actor['id'],$input['revision'],$input['state']));
    }
    if($action==='members'&&$method==='GET'){membership($structure,$actor['id']);respond(['members'=>query('SELECT a.display_name AS name,a.email,m.role FROM atelier_memberships m JOIN atelier_accounts a ON a.id=m.account_id WHERE m.structure_id=? AND a.active=1 ORDER BY a.display_name',[$structure])->fetchAll()]);}
    if($action==='history'&&$method==='GET'){membership($structure,$actor['id']);respond(['history'=>query('SELECT r.revision,r.created_at,a.display_name AS author FROM atelier_revisions r JOIN atelier_accounts a ON a.id=r.actor_id WHERE r.structure_id=? ORDER BY r.revision DESC',[$structure])->fetchAll()]);}
    if($action==='portable-restore'&&$method==='POST'){require_once __DIR__.'/../src/booking.php';respond(booking_portable_restore($structure,$actor['id'],$input));}
    if($action==='export'&&$method==='GET'){membership($structure,$actor['id']);$workspace=read_workspace($structure,$actor['id']);header('Content-Disposition: attachment; filename="compagnie-export.json"');respond(['format'=>'atelier-export-v1','exported_at'=>gmdate('c'),'workspace'=>$workspace]);}
    if($action==='restore'&&$method==='POST'){
        $m=membership($structure,$actor['id'],true);if($m['role']!=='owner')fail(403,'Restauration réservée au responsable.');
        if(!is_int($input['revision']??null)||!is_int($input['target_revision']??null))fail(422,'Révisions nécessaires.');
        $r=query('SELECT data FROM atelier_revisions WHERE structure_id=? AND revision=?',[$structure,$input['target_revision']])->fetch();if(!$r)fail(404,'Version introuvable.');respond(write_workspace($structure,$actor['id'],$input['revision'],json_decode($r['data'],true,512,JSON_THROW_ON_ERROR)));
    }
    fail(404,'Action introuvable.');
} catch(AtelierError $e){respond(['message'=>$e->getMessage(),...$e->details],$e->status);}catch(Throwable $e){error_log('Atelier API: '.get_class($e));respond(['message'=>'Le serveur ne peut pas traiter cette demande pour le moment.'],503);}
