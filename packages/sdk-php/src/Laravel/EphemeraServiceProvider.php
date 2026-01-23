<?php

declare(strict_types=1);

namespace Ephemera\Laravel;

use Illuminate\Support\ServiceProvider;
use Ephemera\EphemeraClient;

/**
 * Laravel Service Provider for Ephemera SDK
 *
 * Add to config/app.php providers array:
 * Ephemera\Laravel\EphemeraServiceProvider::class
 *
 * Or it will be auto-discovered via composer.json extra.laravel.providers
 */
class EphemeraServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/config/ephemera.php', 'ephemera');

        $this->app->singleton(EphemeraClient::class, function ($app) {
            return new EphemeraClient(
                config('ephemera.api_key'),
                config('ephemera.base_url', 'https://api.manhquy.click')
            );
        });

        $this->app->alias(EphemeraClient::class, 'ephemera');
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/config/ephemera.php' => config_path('ephemera.php'),
        ], 'ephemera-config');
    }
}
