<?php
// A private, structured draft. Workspace membership/revision checks apply upstream.
// This validator never fetches remote images and never sends mail.
function validate_newsletter(array $state): void {
    if(!isset($state['newsletter']))return;
    $n=$state['newsletter'];
    if(!is_array($n)||strlen(json_encode($n))>120000||($n['version']??null)!==1)fail(422,'Maquette de newsletter invalide.');
    clean_text($n['subject']??null,250,'objet de newsletter',true);
    clean_text($n['preheader']??'',250,'texte d’aperçu');
    clean_text($n['updated']??'',40,'date de maquette');
    $s=$n['style']??[];if(!is_array($s))fail(422,'Style de newsletter invalide.');
    if(isset($s['harmony'])){$h=$s['harmony'];if(!is_array($h)||!is_int($h['hue']??null)||$h['hue']<0||$h['hue']>359||!in_array($h['theme']??null,['atelier','studio','coulisses','papier','contraste'],true))fail(422,'Harmonie de newsletter invalide.');}
    foreach(['accent','paper'] as $key)if(!is_string($s[$key]??null)||!preg_match('/^#[0-9a-f]{6}$/i',$s[$key]))fail(422,'Couleur de newsletter invalide.');
    foreach(['font'=>['sans','serif'],'align'=>['left','center'],'layout'=>['letter','poster']] as $key=>$values)if(!in_array($s[$key]??null,$values,true))fail(422,'Style de newsletter invalide.');
    if(!is_int($s['radius']??null)||$s['radius']<0||$s['radius']>20)fail(422,'Arrondi invalide.');
    $blocks=$n['blocks']??null;if(!is_array($blocks)||!array_is_list($blocks)||count($blocks)<1||count($blocks)>24)fail(422,'Nombre de zones invalide.');
    $ids=[];foreach($blocks as $b){
        if(!is_array($b)||!in_array($b['type']??null,['brand','hero','image','text','cta','dates','footer'],true))fail(422,'Zone de newsletter invalide.');
        $id=clean_text($b['id']??null,100,'zone',true);if(isset($ids[$id]))fail(422,'Zone en double.');$ids[$id]=true;
        foreach(['title'=>250,'text'=>6000,'src'=>2000,'alt'=>250,'url'=>2000,'label'=>120,'credit'=>500,'creditUrl'=>2000,'license'=>80,'licenseUrl'=>2000] as $key=>$max){
            $value=clean_text($b[$key]??'',$max,'zone de newsletter');
            if(in_array($key,['src','url','creditUrl','licenseUrl'],true)&&$value!==''){
                if($key==='src'&&preg_match('~^assets/scenes-libres/[a-zA-Z0-9_-]+\.webp$~',$value))continue;
                $u=parse_url($value);$host=strtolower($u['host']??'');
                if(!$u||!in_array($u['scheme']??'', ['http','https'],true)||!$host||isset($u['user'])||isset($u['pass'])||preg_match('/^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[)|\.(local|internal|localhost)$/i',$host))fail(422,'Adresse de newsletter invalide.');
            }
        }
        $dates=$b['requestIds']??null;if(!is_array($dates)||!array_is_list($dates)||count($dates)>30)fail(422,'Dates de newsletter invalides.');
        $seen=[];foreach($dates as $id){$id=clean_text($id,100,'date sélectionnée',true);if(isset($seen[$id]))fail(422,'Date en double.');$seen[$id]=true;}
    }
}
