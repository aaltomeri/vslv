<?php

// class-myplugin-api-mytype.php
class VSLV_API_Project extends WP_JSON_CustomPostType {

    protected $base = '/projects';
    protected $type = 'project';

    public function registerRoutes( $routes ) {

        $routes = parent::registerRoutes( $routes );

        return $routes;
    }

}