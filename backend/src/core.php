<?php
declare(strict_types=1);

final class AtelierError extends RuntimeException {
    public function __construct(public int $status, string $message, public array $details = []) { parent::__construct($message); }
}
function fail(int $status, string $message, array $details = []): never { throw new AtelierError($status, $message, $details); }
function uid(): string { return bin2hex(random_bytes(16)); }
function config(): array {
    static $loaded;
    if ($loaded !== null) return $loaded;
    $path = getenv('ATELIER_CONFIG') ?: (is_file(__DIR__.'/../private/config.php') ? __DIR__.'/../private/config.php' : '');
    $values = [];
    if ($path !== '') {
        $real = realpath($path);
        $public = realpath(($_SERVER['DOCUMENT_ROOT']??'') ?: __DIR__.'/../public');
        if (!$real || ($public && str_starts_with(strtolower($real), strtolower($public.DIRECTORY_SEPARATOR)))) fail(503, 'Configuration privée indisponible.');
        $values = require $real;
        if (!is_array($values)) fail(503, 'Configuration privée invalide.');
    }
    $loaded = [
        'dsn' => $values['dsn'] ?? getenv('ATELIER_DSN') ?: '',
        'user' => $values['user'] ?? getenv('ATELIER_DB_USER') ?: '',
        'password' => $values['password'] ?? getenv('ATELIER_DB_PASSWORD') ?: '',
        'origin' => rtrim($values['origin'] ?? getenv('ATELIER_ORIGIN') ?: '', '/'),
        'private_dir' => $values['private_dir'] ?? getenv('ATELIER_PRIVATE_DIR') ?: '',
        'development' => (bool)($values['development'] ?? false),
        'registration_enabled' => (bool)($values['registration_enabled'] ?? false),
        'finance' => $values['finance'] ?? [],
    ];
    if (!$loaded['dsn'] || !$loaded['origin'] || !$loaded['private_dir']) fail(503, 'Le serveur de la compagnie doit encore être configuré.');
    if (!preg_match('~^https://[^/]+$~', $loaded['origin']) && !($loaded['development'] && preg_match('~^http://(127\.0\.0\.1|localhost):[0-9]+$~', $loaded['origin']))) fail(503, 'Adresse du serveur invalide.');
    return $loaded;
}
function db(): PDO {
    static $pdo;
    if ($pdo) return $pdo;
    $c = config();
    $pdo = new PDO($c['dsn'], $c['user'], $c['password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
    if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') { $pdo->exec('PRAGMA foreign_keys = ON'); $pdo->exec('PRAGMA busy_timeout = 5000'); }
    return $pdo;
}
function query(string $sql, array $args = []): PDOStatement { $q=db()->prepare($sql); $q->execute($args); return $q; }
function install_schema(): void {
    $text = db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?'LONGTEXT':'TEXT';
    $statements = [
        'CREATE TABLE IF NOT EXISTS atelier_manifesto_signatures (account_id VARCHAR(32) NOT NULL,version VARCHAR(40) NOT NULL,signer_name VARCHAR(120) NOT NULL,text_hash VARCHAR(64) NOT NULL,signed_at BIGINT NOT NULL,PRIMARY KEY(account_id,version))',
        'CREATE TABLE IF NOT EXISTS atelier_accounts (id VARCHAR(32) PRIMARY KEY,email VARCHAR(254) NOT NULL UNIQUE,display_name VARCHAR(120) NOT NULL,password_hash VARCHAR(255) NOT NULL,active INTEGER NOT NULL DEFAULT 1,session_version INTEGER NOT NULL DEFAULT 1,created_at BIGINT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS atelier_structures (id VARCHAR(32) PRIMARY KEY,name VARCHAR(160) NOT NULL,created_at BIGINT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS atelier_memberships (structure_id VARCHAR(32) NOT NULL,account_id VARCHAR(32) NOT NULL,role VARCHAR(16) NOT NULL,PRIMARY KEY(structure_id,account_id),FOREIGN KEY(structure_id) REFERENCES atelier_structures(id),FOREIGN KEY(account_id) REFERENCES atelier_accounts(id))',
        "CREATE TABLE IF NOT EXISTS atelier_workspaces (structure_id VARCHAR(32) PRIMARY KEY,revision INTEGER NOT NULL,data $text NOT NULL,updated_at BIGINT NOT NULL,FOREIGN KEY(structure_id) REFERENCES atelier_structures(id))",
        "CREATE TABLE IF NOT EXISTS atelier_revisions (structure_id VARCHAR(32) NOT NULL,revision INTEGER NOT NULL,data $text NOT NULL,actor_id VARCHAR(32) NOT NULL,created_at BIGINT NOT NULL,PRIMARY KEY(structure_id,revision),FOREIGN KEY(structure_id) REFERENCES atelier_structures(id))",
        'CREATE TABLE IF NOT EXISTS atelier_audit (id VARCHAR(32) PRIMARY KEY,structure_id VARCHAR(32) NOT NULL,actor_id VARCHAR(32) NOT NULL,action VARCHAR(80) NOT NULL,created_at BIGINT NOT NULL,FOREIGN KEY(structure_id) REFERENCES atelier_structures(id))',
        'CREATE TABLE IF NOT EXISTS atelier_attempts (key_hash VARCHAR(64) PRIMARY KEY,failures INTEGER NOT NULL,window_start BIGINT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS atelier_preferences (account_id VARCHAR(32) PRIMARY KEY,theme VARCHAR(20) NOT NULL,updated_at BIGINT NOT NULL,FOREIGN KEY(account_id) REFERENCES atelier_accounts(id))',
        "CREATE TABLE IF NOT EXISTS atelier_interface_preferences (account_id VARCHAR(32) PRIMARY KEY,settings $text NOT NULL,updated_at BIGINT NOT NULL,FOREIGN KEY(account_id) REFERENCES atelier_accounts(id))",
    ];
    foreach($statements as $sql) db()->exec($sql);
    require_once __DIR__.'/finance.php';finance_schema();
    require_once __DIR__.'/access.php';access_schema();
}
function clean_text(mixed $value, int $max, string $field, bool $required=false): string {
    if (!is_string($value) || strlen($value)>$max || str_contains($value,"\0")) fail(422, 'Champ invalide : '.$field.'.');
    $value=trim($value); if ($required && $value==='') fail(422, 'Renseignez '.$field.'.'); return $value;
}
function valid_date(mixed $value, bool $required=false): bool {
    if ($value==='' || $value===null) return !$required;
    if(!is_string($value)) return false;
    $d=DateTimeImmutable::createFromFormat('!Y-m-d',$value);return $d && $d->format('Y-m-d')===$value;
}
function empty_workspace(string $name): array {
    return ['version'=>1,'profile'=>['name'=>$name,'shows'=>[]],'contacts'=>[],'requests'=>[],'schedule'=>[],'activity'=>[], 'company'=>[
        'name'=>$name,'city'=>'','type'=>'Compagnie de spectacle vivant','founded'=>'','pitch'=>'','audiences'=>'','values'=>'','mail'=>'','team'=>[],'shows'=>[],'contacts'=>[],'needs'=>[],'context'=>'','care'=>false,
        'admin'=>['structure'=>'À compléter','address'=>'À compléter','identifiers'=>'À compléter','insurance'=>'À compléter','employment'=>'À compléter','payment'=>'À compléter'],
        'communication'=>['subject'=>'Une proposition artistique','body'=>'Présentation à préparer par la compagnie.'],
    ]];
}
function validate_workspace(array $data): string {
    if (($data['version']??null)!==1) fail(422,'Version de données inconnue.');
    if (!is_array($data['profile']??null)) fail(422,'Fiche de structure manquante.');
    clean_text($data['profile']['name']??null,160,'nom de la structure',true);
    if (!is_array($data['profile']['shows']??null) || count($data['profile']['shows'])>100) fail(422,'Répertoire invalide.');
    $shows=[];foreach($data['profile']['shows'] as $show){$show=clean_text($show,250,'spectacle',true);if(isset($shows[$show]))fail(422,'Titre de spectacle en double.');$shows[$show]=true;}
    $limits=['contacts'=>3000,'requests'=>5000,'schedule'=>5000,'activity'=>100];
    $ids=[];
    foreach($limits as $kind=>$limit){
        if(!is_array($data[$kind]??null)||!array_is_list($data[$kind])||count($data[$kind])>$limit)fail(422,'Liste invalide ou trop volumineuse : '.$kind.'.');
        foreach($data[$kind] as $row){
            if(!is_array($row))fail(422,'Fiche invalide.');
            if($kind==='activity')continue;
            $id=clean_text($row['id']??null,100,'identifiant',true);if(isset($ids[$kind][$id]))fail(422,'Identifiant en double.');$ids[$kind][$id]=true;
            if($kind==='contacts'){clean_text($row['place']??null,250,'lieu',true);$email=$row['email']??'';if($email!==''&&(!is_string($email)||!filter_var($email,FILTER_VALIDATE_EMAIL)))fail(422,'Adresse e-mail invalide.');}
            if($kind==='requests'){
                if(!in_array($row['status']??'', ['new','proposal','waiting','option','confirmed','done','cancelled'],true))fail(422,'Étape de demande invalide.');
                if(!valid_date($row['date']??'')||!valid_date($row['deadline']??''))fail(422,'Date de demande invalide.');
                clean_text($row['place']??null,250,'lieu de la demande',true);
            }
            if($kind==='schedule'){clean_text($row['title']??null,250,'intitulé du rendez-vous',true);if(!valid_date($row['date']??'',true))fail(422,'Date de rendez-vous invalide.');}
        }
    }
    foreach($data['requests'] as $r){if(!isset($ids['contacts'][$r['contactId']??'']))fail(422,'Une demande référence un contact absent.');if(!isset($shows[$r['show']??'']))fail(422,'Une demande référence un spectacle absent.');
        if(!empty($r['groupedProposal'])){
            $proposed=$r['proposedShows']??null;if(!is_array($proposed)||!array_is_list($proposed)||!count($proposed)||count($proposed)>100)fail(422,'Répertoire de proposition invalide.');
            foreach($proposed as $show){if(!is_string($show)||!isset($shows[$show]))fail(422,'Une proposition référence un spectacle absent.');}
            if(count(array_unique($proposed))!==count($proposed))fail(422,'Spectacle en double dans la proposition.');if(!in_array($r['show'],$proposed,true))fail(422,'Le spectacle retenu doit appartenir à la proposition.');
            if(in_array($r['status'],['option','confirmed','done'],true)&&($r['groupedShowConfirmed']??false)!==true)fail(422,'Confirmez le spectacle retenu pour cette date.');
        }
    }
    foreach(['teamNotes'=>200,'absences'=>500] as $key=>$limit){if(isset($data[$key])&&(!is_array($data[$key])||!array_is_list($data[$key])||count($data[$key])>$limit))fail(422,'Liste trop volumineuse : '.$key.'.');}
    foreach($data['absences']??[] as $absence){if(!valid_date($absence['from']??'',true)||!valid_date($absence['to']??'',true)||$absence['from']>$absence['to'])fail(422,'Période d’indisponibilité invalide.');}
    foreach($data['teamNotes']??[] as $note){if(!is_array($note))fail(422,'Note invalide.');clean_text($note['id']??null,100,'identifiant de note',true);clean_text($note['text']??null,16000,'note',true);clean_text($note['author']??null,250,'auteur',true);if(!valid_date($note['date']??'',true))fail(422,'Date de note invalide.');}
    foreach(['prospectEntries'=>300,'prospectProfiles'=>100,'watchProfiles'=>100,'socialSignals'=>300] as $key=>$limit){if(isset($data[$key])&&(!is_array($data[$key])||!array_is_list($data[$key])||count($data[$key])>$limit))fail(422,'Liste de prospection trop volumineuse : '.$key.'.');}
    foreach(['fundingProfile','fundingDocuments','fundingTracks','prospectLocation'] as $key){if(isset($data[$key])&&(!is_array($data[$key])||count($data[$key])>100))fail(422,'Données territoriales ou dossier invalides.');}
    foreach($data['socialSignals']??[] as $signal){if(!is_array($signal))fail(422,'Signal invalide.');clean_text($signal['name']??null,250,'événement',true);if(!valid_date($signal['deadline']??''))fail(422,'Date de veille invalide.');}
    foreach($data['prospectEntries']??[] as $entry){if(!is_array($entry)||!is_array($entry['source']??null))fail(422,'Piste de prospection invalide.');clean_text($entry['id']??null,100,'identifiant de piste',true);clean_text($entry['sourceId']??null,250,'source de la piste',true);clean_text($entry['show']??null,250,'spectacle prospecté',true);if(!valid_date($entry['deadline']??''))fail(422,'Relance de prospection invalide.');}
    if(isset($data['company'])){
        $company=$data['company'];if(!is_array($company))fail(422,'Fiche de compagnie invalide.');
        foreach(['team','shows','needs'] as $key)if(!is_array($company[$key]??null)||!array_is_list($company[$key]))fail(422,'Liste de compagnie invalide : '.$key.'.');
        if(count($company['team'])>100||count($company['shows'])>100||count($company['needs'])>100)fail(422,'Fiche de compagnie trop volumineuse.');
        foreach($company['team'] as $member){if(!is_array($member)||count($member)!==2)fail(422,'Fiche de membre invalide.');clean_text($member[0]??null,250,'nom du membre',true);clean_text($member[1]??null,500,'rôle du membre');}
        foreach($company['shows'] as $show){if(!is_array($show))fail(422,'Fiche spectacle invalide.');clean_text($show['name']??null,250,'titre du spectacle',true);}
        if(!is_array($company['admin']??null)||!is_array($company['communication']??null))fail(422,'Informations de compagnie manquantes.');
    }
    require_once __DIR__.'/operations.php';
    validate_operations($data,$shows,$ids);
    require_once __DIR__.'/finance.php';validate_finance_workspace($data);
    require_once __DIR__.'/source-registry.php';validate_source_registry($data);
    require_once __DIR__.'/booking.php';validate_booking($data,$shows,$ids);
    require_once __DIR__.'/programming.php';validate_programming($data,$ids);
    require_once __DIR__.'/newsletter.php';validate_newsletter($data);
    require_once __DIR__.'/tools.php';validate_optional_tools($data);
    // Limit individual strings and overall structure, including optional fields.
    $count=0;$walk=function(mixed $value,int $depth=0)use(&$walk,&$count):void{if(++$count>120000||$depth>12)fail(422,'Structure de données trop complexe.');if(is_string($value)&&strlen($value)>16000)fail(422,'Un texte dépasse la longueur autorisée.');if(is_array($value))foreach($value as $v)$walk($v,$depth+1);};$walk($data);
    $json=json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);if(strlen($json)>1500000)fail(413,'Espace trop volumineux pour ce premier lot.');return $json;
}
function audit(string $structure,string $actor,string $action): void { query('INSERT INTO atelier_audit(id,structure_id,actor_id,action,created_at) VALUES(?,?,?,?,?)',[uid(),$structure,$actor,$action,time()]); }
function membership(string $structure,string $actor,bool $write=false): array {
    $row=query('SELECT role FROM atelier_memberships WHERE structure_id=? AND account_id=?',[$structure,$actor])->fetch();
    if(!$row)fail(404,'Espace introuvable.');if($write&&!in_array($row['role'],['owner','editor'],true))fail(403,'Ce compte dispose d’un accès en lecture.');return $row;
}
function read_workspace(string $structure,string $actor): array { $member=membership($structure,$actor);$row=query('SELECT revision,data,updated_at FROM atelier_workspaces WHERE structure_id=?',[$structure])->fetch();if(!$row)fail(404,'Espace introuvable.');return ['role'=>$member['role'],'revision'=>(int)$row['revision'],'state'=>json_decode($row['data'],true,512,JSON_THROW_ON_ERROR),'updated_at'=>(int)$row['updated_at']]; }
function write_workspace(string $structure,string $actor,int $revision,array $data): array {
    membership($structure,$actor,true);$json=validate_workspace($data);$pdo=db();$pdo->beginTransaction();
    try{
        // Compare-and-swap prevents a stale browser from overwriting another member.
        $q=query('UPDATE atelier_workspaces SET data=?,revision=revision+1,updated_at=? WHERE structure_id=? AND revision=?',[$json,time(),$structure,$revision]);
        if($q->rowCount()!==1)fail(409,'Une autre personne a modifié cet espace. Votre saisie est conservée dans cette page.');
        query('INSERT INTO atelier_revisions(structure_id,revision,data,actor_id,created_at) VALUES(?,?,?,?,?)',[$structure,$revision+1,$json,$actor,time()]);
        query('DELETE FROM atelier_revisions WHERE structure_id=? AND revision<?',[$structure,max(1,$revision-28)]);
        query('UPDATE atelier_structures SET name=? WHERE id=?',[$data['profile']['name'],$structure]);audit($structure,$actor,'workspace.saved');$pdo->commit();return ['revision'=>$revision+1];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function add_structure(string $name,string $owner): string {
    $name=clean_text($name,160,'nom de structure',true);$id=uid();$json=validate_workspace(empty_workspace($name));$pdo=db();$pdo->beginTransaction();
    try{query('INSERT INTO atelier_structures(id,name,created_at) VALUES(?,?,?)',[$id,$name,time()]);query('INSERT INTO atelier_memberships(structure_id,account_id,role) VALUES(?,?,?)',[$id,$owner,'owner']);query('INSERT INTO atelier_workspaces(structure_id,revision,data,updated_at) VALUES(?,?,?,?)',[$id,1,$json,time()]);query('INSERT INTO atelier_revisions(structure_id,revision,data,actor_id,created_at) VALUES(?,?,?,?,?)',[$id,1,$json,$owner,time()]);$pdo->commit();return $id;}catch(Throwable $e){$pdo->rollBack();throw $e;}
}
function add_account(string $email,string $name,string $password): string {
    $email=strtolower(trim($email));if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>254)fail(422,'Adresse e-mail invalide.');clean_text($name,120,'nom du membre',true);
    if(strlen($password)<12||strlen($password)>72)fail(422,'Le mot de passe doit contenir entre 12 et 72 octets.');
    $id=uid();query('INSERT INTO atelier_accounts(id,email,display_name,password_hash,created_at) VALUES(?,?,?,?,?)',[$id,$email,$name,password_hash($password,PASSWORD_DEFAULT),time()]);return $id;
}
