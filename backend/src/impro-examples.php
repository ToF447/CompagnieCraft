<?php
declare(strict_types=1);
// Same fixed catalogue as Sites; no URL, artist or profile supplied by the user.
function impro_catalogue(): array {
    foreach([__DIR__.'/../public_html/impro-sources.json',__DIR__.'/../../dist/impro-sources.json'] as $path)if(is_file($path))return json_decode(file_get_contents($path),true,16,JSON_THROW_ON_ERROR);
    fail(503,'Catalogue de sources indisponible.');
}
function impro_url(string $raw,array $source): string {
    $raw=html_entity_decode($raw,ENT_QUOTES|ENT_HTML5,'UTF-8');$base=parse_url($source['url']);if(str_starts_with($raw,'/'))$raw='https://'.$base['host'].$raw;
    $u=parse_url($raw);if(!$u||($u['scheme']??'')!=='https'||($u['host']??'')!==$base['host']||isset($u['user'])||isset($u['pass'])||isset($u['port'])||isset($u['query'])||isset($u['fragment']))return '';
    $patterns=['dramaction'=>'~^/fr/(?!category/|tag/|ressources/|telechargements/|produit/|wp-)[a-z0-9-]+/$~','theatralement'=>'~^/exercices/[^/]+\.html$~','improwiki'=>'~^/fr/wiki/[^/]+$~'];
    return isset($patterns[$source['kind']])&&preg_match($patterns[$source['kind']],$u['path']??'')?$raw:'';
}
function impro_parse(string $html,array $source): array {
    $text=strtolower(strtr(html_entity_decode(strip_tags($html),ENT_QUOTES|ENT_HTML5,'UTF-8'),['é'=>'e','É'=>'e','è'=>'e','ê'=>'e','ë'=>'e','â'=>'a','à'=>'a','î'=>'i','ï'=>'i','ô'=>'o','ù'=>'u','û'=>'u','ç'=>'c']));
    if(stripos($text,$source['identity'])===false||preg_match('/casino en ligne|domain is for sale|just a moment|verify you are human/i',$text))throw new RuntimeException('Identité ou contenu non vérifiable.');
    if($source['kind']==='manual')return [];
    $pattern=$source['kind']==='dramaction'?'~<h[23]\b[^>]*>\s*<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>([\s\S]*?)</a>\s*</h[23]>~i':'~<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>([\s\S]*?)</a>~i';
    preg_match_all($pattern,$html,$matches,PREG_SET_ORDER);$rows=[];
    foreach($matches as $m){$url=impro_url($m[1],$source);if(!$url)continue;$heading=$m[2];if($source['kind']!=='dramaction'){if(!preg_match('~<h[23]\b[^>]*>([\s\S]*?)</h[23]>~i',$heading,$h))continue;$heading=$h[1];}$title=trim(preg_replace('/\s+/u',' ',html_entity_decode(strip_tags($heading),ENT_QUOTES|ENT_HTML5,'UTF-8')));if(strlen($title)<3||strlen($title)>400)continue;$rows[$url]=['id'=>$url,'url'=>$url,'title'=>$title,'sourceId'=>$source['id'],'sourceName'=>$source['name']];}
    return array_slice(array_values($rows),0,60);
}
function impro_read(array $source,string $url,bool $raw=false): array|string {
    if(!function_exists('curl_init'))throw new RuntimeException('Extension cURL nécessaire.');
    for($step=0;$step<2;$step++) {
        $host=parse_url($source['url'],PHP_URL_HOST);$u=parse_url($url);if(($u['scheme']??'')!=='https'||($u['host']??'')!==$host)throw new RuntimeException('Redirection hors de la source.');
        $ips=gethostbynamel($host);if(!$ips)throw new RuntimeException('DNS indisponible.');foreach($ips as $ip)if(!filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV4|FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE))throw new RuntimeException('Destination non publique.');
        $html='';$curl=curl_init($url);curl_setopt_array($curl,[CURLOPT_RETURNTRANSFER=>false,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_TIMEOUT=>5,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_RESOLVE=>[$host.':443:'.$ips[0]],CURLOPT_USERAGENT=>'CompagnieCraft-ImproReferences/1.0',CURLOPT_HTTPHEADER=>['Accept: text/html','Cache-Control: no-cache'],CURLOPT_WRITEFUNCTION=>function($c,$chunk)use(&$html){if(strlen($html)+strlen($chunk)>160000)return 0;$html.=$chunk;return strlen($chunk);}]);
        curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE);$redirect=curl_getinfo($curl,CURLINFO_REDIRECT_URL);$type=curl_getinfo($curl,CURLINFO_CONTENT_TYPE);curl_close($curl);
        if($status>=300&&$status<400&&$redirect){$url=$redirect;continue;}
        if($status!==200||!str_contains(strtolower($type??''),'text/html'))throw new RuntimeException('Lecture non disponible (HTTP '.$status.').');
        return $raw?$html:impro_parse($html,$source);
    }
    throw new RuntimeException('Redirection non résolue.');
}
function impro_examples(): array {
    $now=gmdate('c');$reports=[];$references=[];
    foreach(impro_catalogue() as $source){$report=['id'=>$source['id'],'name'=>$source['name'],'url'=>$source['url'],'checkedAt'=>$now,'status'=>'unavailable','count'=>0,'message'=>''];$rows=[];
        try{$rows=impro_read($source,$source['url']);$report['status']=$rows?'ok':'manual';$report['message']=$rows?'Titres et liens de fiches relevés.':'Catalogue à consulter manuellement ; aucune fiche lisible automatiquement.';
            if(isset($source['extraPages']))try{array_push($rows,...impro_read($source,$source['url'].'page/'.random_int(2,$source['extraPages']).'/'));}catch(Throwable){$report['message'].=' Page complémentaire indisponible.';}
        }catch(Throwable $e){$report['message']=$e->getMessage();}
        $unique=[];foreach($rows as $row)$unique[$row['url']]=$row;$rows=array_values($unique);$report['count']=count($rows);$reports[]=$report;array_push($references,...$rows);
    }
    return ['checkedAt'=>$now,'sources'=>$reports,'references'=>$references,'scope'=>'Titres et liens des index publics ; consignes et conditions à consulter chez les auteurs. Aucun profil transmis.'];
}
// Mirror the Worker reader: exact catalogue host/path, bounded public fetch,
// plaintext only and a permissive licence verified on this particular page.
function impro_article(array $input): array {
    $source=null;foreach(impro_catalogue() as $entry)if($entry['id']===($input['source']??null))$source=$entry;
    $url=$source&&is_string($input['url']??null)?impro_url($input['url'],$source):'';
    if(!$url)fail(422,'Source ou adresse de fiche non autorisée.');
    try{return impro_article_parse(impro_read($source,$url,true),$source,$url);}catch(Throwable $e){fail(502,$e->getMessage());}
}
function impro_article_parse(string $html,array $source,string $url): array {
    $plain=static fn($text)=>trim(preg_replace('/\s+/u',' ',html_entity_decode(strip_tags($text),ENT_QUOTES|ENT_HTML5,'UTF-8')));
    $identity=strtolower($plain($html));
    if(stripos($identity,$source['identity'])===false||preg_match('/casino en ligne|domain is for sale|just a moment|verify you are human/i',$identity))throw new RuntimeException('Identité de la fiche non vérifiable.');
    if(!preg_match('~<h1\b[^>]*>([\s\S]*?)</h1>~i',$html,$heading))throw new RuntimeException('Titre de fiche introuvable.');
    $license=[];
    preg_match('~<div\b[^>]*id=["\']license-info["\'][^>]*>([\s\S]*?)</div>~i',$html,$licenseInfo);
    if($source['kind']==='improwiki')preg_match('~https://creativecommons\.org/licenses/(by-sa|by)/(3\.0|4\.0)/(de/)?~i',$licenseInfo[1]??'',$license);
    $blocks=[];
    if($license){
        if(!preg_match('~<div\b[^>]*class=["\'][^"\']*\barticle-content\b[^"\']*["\'][^>]*>~i',$html,$start,PREG_OFFSET_CAPTURE))throw new RuntimeException('Le format de la fiche a changé. Consultez la source.');
        $offset=$start[0][1]+strlen($start[0][0]);$end=strlen($html);$depth=1;
        preg_match_all('~</?div\b[^>]*>~i',$html,$tags,PREG_OFFSET_CAPTURE,$offset);
        foreach($tags[0] as [$tag,$pos]){$depth+=str_starts_with($tag,'</')?-1:1;if(!$depth){$end=$pos;break;}}
        if($depth)throw new RuntimeException('Texte incomplet reçu. Consultez la fiche d’origine.');
        $body=substr($html,$offset,$end-$offset);
        $body=preg_replace('~<(script|style|iframe|video|audio|figure)\b[^>]*>[\s\S]*?</\1>|<!--[\s\S]*?-->~i','',$body);
        preg_match_all('~<(p|h[2-4]|li)\b[^>]*>([\s\S]*?)</\1>~i',$body,$parts,PREG_SET_ORDER);
        $length=0;foreach($parts as $part){$text=$plain($part[2]);if($text!==''){$blocks[]=['kind'=>strtolower($part[1]),'text'=>$text];$length+=strlen($text);}}
        if(!$blocks)throw new RuntimeException('Le format de la fiche a changé. Consultez la source.');
        if(count($blocks)>120||$length>24000)throw new RuntimeException('Fiche trop longue pour la lecture intégrée. Consultez la source.');
    }
    $author='Contributeurs de '.$source['name'];if(preg_match('~Dernière modification par\s*([\s\S]*?)\s*·\s*<a~i',$html,$credit))$author=$plain($credit[1]);
    $excerpt='';if(!$license&&preg_match('~<meta\b[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']~i',$html,$description))$excerpt=implode(' ',array_slice(preg_split('/\s+/u',$plain($description[1])),0,12));
    return ['title'=>$plain($heading[1]),'url'=>$url,'sourceId'=>$source['id'],'sourceName'=>$source['name'],'checkedAt'=>gmdate('c'),'full'=>(bool)$license,'blocks'=>$blocks,'excerpt'=>$excerpt,'author'=>$author,'historyURL'=>$source['kind']==='improwiki'?$url.'/history':'','licenceURL'=>$license[0]??'','licence'=>$license?'CC '.strtoupper($license[1]).' '.$license[2].(!empty($license[3])?' DE':''):'','notice'=>$license?'Texte repris sans modification de fond ; présentation adaptée, médias exclus. La licence du texte reste celle indiquée par la source.':'La source ne présente pas de licence de reprise compatible vérifiée. Seul un court aperçu est affiché ; les consignes complètes restent sur le site d’origine.'];
}
