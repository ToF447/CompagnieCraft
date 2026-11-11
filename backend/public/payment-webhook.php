<?php
declare(strict_types=1);
require __DIR__.'/../src/core.php';
require __DIR__.'/../src/finance-stripe.php';
header('Content-Type: application/json');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
try{if(($_SERVER['REQUEST_METHOD']??'')!=='POST')fail(405,'POST requis.');if((int)($_SERVER['CONTENT_LENGTH']??0)>1000000)fail(413,'Événement trop volumineux.');$raw=file_get_contents('php://input',false,null,0,1000001);if(strlen($raw)>1000000)fail(413,'Événement trop volumineux.');$structure=clean_text($_GET['structure']??null,32,'structure',true);echo json_encode(finance_stripe_event($structure,$raw,$_SERVER['HTTP_STRIPE_SIGNATURE']??''),JSON_THROW_ON_ERROR);}catch(AtelierError $e){http_response_code($e->status);echo json_encode(['message'=>$e->getMessage()]);}catch(Throwable){http_response_code(503);echo '{"message":"Événement non traité, nouvel essai nécessaire."}';}
