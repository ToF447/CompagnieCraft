<?php
declare(strict_types=1);
const MANIFESTO_VERSION = '2026-11-11.1';
const MANIFESTO_HASH = '10d438a22166e461394196f15b8dba9f836525342e92450facf29f0d0a695f2e';
// Account identity and timestamp come from the server. The signature is private.
function manifesto_validate(array $input): string {
    $value=$input['manifesto']??null;
    if(!is_array($value)||($value['accepted']??null)!==true||($value['version']??null)!==MANIFESTO_VERSION)fail(422,'Lisez le manifeste actuel et confirmez votre engagement pour le signer.');
    return clean_text($value['name']??null,120,'prénom et nom du signataire',true);
}
function manifesto_signature(string $actor): ?array {
    $row=query('SELECT version,signer_name AS name,text_hash AS textHash,signed_at AS signedAt FROM atelier_manifesto_signatures WHERE account_id=? AND version=?',[$actor,MANIFESTO_VERSION])->fetch();
    return $row?:null;
}
function manifesto_sign(string $actor,string $name): array {
    // Repeated submissions preserve the original signer and timestamp.
    if($signature=manifesto_signature($actor))return $signature;
    try{query('INSERT INTO atelier_manifesto_signatures(account_id,version,signer_name,text_hash,signed_at) VALUES(?,?,?,?,?)',[$actor,MANIFESTO_VERSION,$name,MANIFESTO_HASH,time()]);}
    catch(PDOException $e){if(!manifesto_signature($actor))throw $e;}
    return manifesto_signature($actor);
}
