<?php
declare(strict_types=1);
/* Individual access belongs to memberships, never to the artistic team list.
 * Owners can invite editors/viewers. Single-use bearer tokens are stored as hashes;
 * existing accounts must authenticate, so an invitation cannot reset a password. */
function access_schema(): void {db()->exec('CREATE TABLE IF NOT EXISTS atelier_invitations (id VARCHAR(32) PRIMARY KEY,structure_id VARCHAR(32) NOT NULL,email VARCHAR(254) NOT NULL,display_name VARCHAR(120) NOT NULL,role VARCHAR(16) NOT NULL,token_hash VARCHAR(64) NOT NULL UNIQUE,created_by VARCHAR(32) NOT NULL,created_at BIGINT NOT NULL,expires_at BIGINT NOT NULL,used_at BIGINT,cancelled_at BIGINT,FOREIGN KEY(structure_id) REFERENCES atelier_structures(id))');}
function access_owner(string $structure,string $actor): void {if(membership($structure,$actor)['role']!=='owner')fail(403,'Seul le responsable peut gérer les accès.');}
function access_email(mixed $value): string {$email=strtolower(clean_text($value,254,'adresse e-mail',true));if(!filter_var($email,FILTER_VALIDATE_EMAIL))fail(422,'Adresse e-mail invalide.');return $email;}
function access_token(mixed $value): string {if(!is_string($value)||!preg_match('/^[a-f0-9]{64}$/D',$value))fail(410,'Invitation invalide ou expirée.');return hash('sha256',$value);}
function access_team(string $structure,string $actor): array {
    $membership=membership($structure,$actor);if($membership['role']!=='owner')return ['role'=>$membership['role'],'members'=>[],'invitations'=>[]];
    return ['role'=>'owner','members'=>query('SELECT a.id,a.display_name AS name,a.email,m.role FROM atelier_memberships m JOIN atelier_accounts a ON a.id=m.account_id WHERE m.structure_id=? AND a.active=1 ORDER BY a.display_name',[$structure])->fetchAll(),'invitations'=>query('SELECT id,email,display_name AS name,role,created_at,expires_at,used_at,cancelled_at FROM atelier_invitations WHERE structure_id=? ORDER BY created_at DESC LIMIT 100',[$structure])->fetchAll()];
}
function access_invite(string $structure,string $actor,array $v): array {
    access_owner($structure,$actor);$email=access_email($v['email']??null);$name=clean_text($v['name']??'',120,'nom');$role=$v['role']??'';if(!in_array($role,['editor','viewer'],true))fail(422,'Choisissez gestion ou lecture seule.');
    $pdo=db();$pdo->beginTransaction();try{
        query('UPDATE atelier_workspaces SET revision=revision WHERE structure_id=?',[$structure]);
        if((int)query('SELECT COUNT(*) FROM atelier_memberships WHERE structure_id=?',[$structure])->fetchColumn()>=100)fail(422,'Limite de membres atteinte.');
        if(query('SELECT a.id FROM atelier_memberships m JOIN atelier_accounts a ON a.id=m.account_id WHERE m.structure_id=? AND a.email=?',[$structure,$email])->fetch())fail(409,'Cette personne dispose déjà d’un accès. Modifiez son rôle depuis la liste.');
        if((int)query('SELECT COUNT(*) FROM atelier_invitations WHERE structure_id=? AND used_at IS NULL AND cancelled_at IS NULL AND expires_at>?',[$structure,time()])->fetchColumn()>=30)fail(422,'Trop d’invitations en attente. Annulez celles devenues inutiles.');
        query('UPDATE atelier_invitations SET cancelled_at=? WHERE structure_id=? AND email=? AND used_at IS NULL AND cancelled_at IS NULL',[time(),$structure,$email]);
        $id=uid();$token=bin2hex(random_bytes(32));$expires=time()+172800;
        query('INSERT INTO atelier_invitations(id,structure_id,email,display_name,role,token_hash,created_by,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)',[$id,$structure,$email,$name,$role,hash('sha256',$token),$actor,time(),$expires]);audit($structure,$actor,'access.invited');$pdo->commit();
        return ['id'=>$id,'url'=>config()['origin'].'/#invitation='.$token,'expires_at'=>$expires];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function access_cancel(string $structure,string $actor,string $id): void {access_owner($structure,$actor);$q=query('UPDATE atelier_invitations SET cancelled_at=? WHERE id=? AND structure_id=? AND used_at IS NULL AND cancelled_at IS NULL',[time(),$id,$structure]);if(!$q->rowCount())fail(404,'Invitation active introuvable.');audit($structure,$actor,'access.invitation_cancelled');}
function access_member(string $structure,string $actor,string $member,string $role): void {
    access_owner($structure,$actor);if(!in_array($role,['editor','viewer','remove'],true))fail(422,'Rôle invalide.');$pdo=db();$pdo->beginTransaction();try{
        query('UPDATE atelier_workspaces SET revision=revision WHERE structure_id=?',[$structure]);$r=query('SELECT role FROM atelier_memberships WHERE structure_id=? AND account_id=?',[$structure,$member])->fetch();if(!$r)fail(404,'Membre introuvable.');
        if($r['role']==='owner'||$actor===$member)fail(422,'Le compte responsable ne peut pas être retiré ou rétrogradé ici.');
        if($role==='remove')query('DELETE FROM atelier_memberships WHERE structure_id=? AND account_id=?',[$structure,$member]);else query('UPDATE atelier_memberships SET role=? WHERE structure_id=? AND account_id=?',[$role,$structure,$member]);
        audit($structure,$actor,'access.membership_changed');$pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function access_find_invite(string $token): array {
    $r=query('SELECT i.*,s.name AS structure_name FROM atelier_invitations i JOIN atelier_structures s ON s.id=i.structure_id WHERE i.token_hash=?',[access_token($token)])->fetch();
    if(!$r||$r['used_at']!==null||$r['cancelled_at']!==null||(int)$r['expires_at']<=time())fail(410,'Invitation invalide ou expirée. Demandez un nouveau lien au responsable.');return $r;
}
function access_invite_info(string $token): array {$r=access_find_invite($token);[$name,$domain]=explode('@',$r['email']);return ['structure'=>$r['structure_name'],'role'=>$r['role'],'email_hint'=>substr($name,0,1).'…@'.$domain,'name'=>$r['display_name'],'expires_at'=>(int)$r['expires_at']];}
function access_accept(array $v,?array $actor): array {
    $token=$v['token']??'';$r=access_find_invite($token);$email=access_email($v['email']??null);if(!hash_equals($r['email'],$email))fail(422,'Utilisez l’adresse à laquelle le responsable a attribué l’invitation.');
    if(!in_array($r['role'],['editor','viewer'],true))fail(422,'Rôle d’invitation invalide.');$account=query('SELECT id,email,active,session_version FROM atelier_accounts WHERE email=?',[$email])->fetch();
    if($account&&(!$actor||$actor['id']!==$account['id']))fail(409,'Ce compte existe déjà. Connectez-vous avec ce compte avant d’accepter l’invitation.');
    if($actor&&(!$account||$actor['id']!==$account['id']))fail(409,'Déconnectez le compte actuel pour rejoindre avec l’adresse invitée.');
    if($account&&!(int)$account['active'])fail(403,'Ce compte est désactivé.');
    $pdo=db();$pdo->beginTransaction();try{
        // Claim under a condition: two concurrent submissions cannot consume one token twice.
        $claimed=query('UPDATE atelier_invitations SET used_at=? WHERE id=? AND used_at IS NULL AND cancelled_at IS NULL AND expires_at>?',[time(),$r['id'],time()]);if(!$claimed->rowCount())fail(410,'Invitation déjà utilisée ou expirée.');
        query('UPDATE atelier_workspaces SET revision=revision WHERE structure_id=?',[$r['structure_id']]);if((int)query('SELECT COUNT(*) FROM atelier_memberships WHERE structure_id=?',[$r['structure_id']])->fetchColumn()>=100)fail(422,'Limite de membres atteinte.');
        $new=!$account;if($new){if(!is_string($v['password']??null))fail(422,'Mot de passe invalide.');$id=add_account($email,clean_text($v['name']??'',120,'nom du compte',true),$v['password']);$account=query('SELECT id,email,active,session_version FROM atelier_accounts WHERE id=?',[$id])->fetch();}
        if(query('SELECT role FROM atelier_memberships WHERE structure_id=? AND account_id=?',[$r['structure_id'],$account['id']])->fetch())fail(409,'Un accès existe déjà. Le responsable peut en ajuster le rôle.');
        query('INSERT INTO atelier_memberships(structure_id,account_id,role) VALUES(?,?,?)',[$r['structure_id'],$account['id'],$r['role']]);audit($r['structure_id'],$account['id'],'access.invitation_accepted');$pdo->commit();return ['account'=>$account,'structure_id'=>$r['structure_id'],'new_account'=>$new];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
