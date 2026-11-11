<?php
// Copy to private/config.php OUTSIDE public_html; never commit filled credentials.
return [
    'dsn'=>'mysql:host=127.0.0.1;port=3306;dbname=DATABASE_NAME;charset=utf8mb4',
    'user'=>'DATABASE_USER',
    'password'=>'REPLACE_ON_SERVER',
    'origin'=>'https://YOUR_APP_DOMAIN',
    'private_dir'=>'/ABSOLUTE/PATH/TO/private',
    'development'=>false,
    // Enable on the dedicated app site after testing signup and quota limits.
    'registration_enabled'=>false,
    // Optional: one merchant account per troupe; never a shared platform collection account.
    // Configure only after validating the invoicing route and the merchant's own account.
    'finance'=>[
        // 'STRUCTURE_ID'=>[
        //     'issue_enabled'=>false,
        //     'stripe_secret'=>'SERVER_ONLY_TEST_OR_LIVE_KEY',
        //     'stripe_webhook_secret'=>'SERVER_ONLY_WEBHOOK_SECRET',
        //     'allow_sepa'=>false,
        // ],
    ],
];
