<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Ephemera API Key
    |--------------------------------------------------------------------------
    |
    | Your Ephemera API key for authentication. Get this from your
    | Ephemera dashboard at https://app.ephemera.email
    |
    */
    'api_key' => env('EPHEMERA_API_KEY'),

    /*
    |--------------------------------------------------------------------------
    | API Base URL
    |--------------------------------------------------------------------------
    |
    | The base URL for the Ephemera API. You typically don't need to
    | change this unless you're using a self-hosted instance.
    |
    */
    'base_url' => env('EPHEMERA_BASE_URL', 'https://api.manhquy.id.vn'),

    /*
    |--------------------------------------------------------------------------
    | Webhook Secret
    |--------------------------------------------------------------------------
    |
    | Secret key used to verify webhook signatures. Get this from your
    | Ephemera dashboard webhook settings.
    |
    */
    'webhook_secret' => env('EPHEMERA_WEBHOOK_SECRET'),
];
