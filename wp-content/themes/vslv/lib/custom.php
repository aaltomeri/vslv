<?php
/**
 * Custom functions
 */

/**
 * JSON API related inits
 */

// add Project post type Json API capability
function vslv_project_api_init() {

    global $vslv_api_project, $wp_json_server;

    require_once dirname( __FILE__ ) . '/../post-types/class-vslv-api-project.php';

    $vslv_api_project = new VSLV_API_Project($wp_json_server);

}
add_action( 'wp_json_server_before_serve', 'vslv_project_api_init' );

// add certain query vars to the allowed query vars array
// allows to query for children of posts for instance
// useful for attachments which are children of posts
function vslv_add_json_api_query_vars($json_query_vars) {

  array_push($json_query_vars, 'post__in');
  array_push($json_query_vars, 'post_parent');

  return $json_query_vars;

}
add_action( 'json_query_vars', 'vslv_add_json_api_query_vars' );

/**
 * Attachments
 */
function projects_medias( $attachments )
{
  $fields         = array(
    array(
      'name'      => 'title',                         // unique field name
      'type'      => 'text',                          // registered field type
      'label'     => __( 'Title', 'attachments' ),    // label to display
      'default'   => 'title',                         // default value upon selection
    ),
    array(
      'name'      => 'caption',                       // unique field name
      'type'      => 'textarea',                      // registered field type
      'label'     => __( 'Caption', 'attachments' ),  // label to display
      'default'   => 'caption',                       // default value upon selection
    ),
  );

  $args = array(

    // title of the meta box (string)
    'label'         => 'Project Medias',

    // all post types to utilize (string|array)
    'post_type'     => array( 'project' ),

    // meta box position (string) (normal, side or advanced)
    'position'      => 'normal',

    // meta box priority (string) (high, default, low, core)
    'priority'      => 'high',

    // allowed file type(s) (array) (image|video|text|audio|application)
    'filetype'      => null,  // no filetype limit

    // include a note within the meta box (string)
    //'note'          => 'Attach files here!',

    // by default new Attachments will be appended to the list
    // but you can have then prepend if you set this to false
    'append'        => true,

    // text for 'Attach' button in meta box (string)
    'button_text'   => __( 'Attach Files', 'attachments' ),

    // text for modal 'Attach' button (string)
    'modal_text'    => __( 'Attach', 'attachments' ),

    // which tab should be the default in the modal (string) (browse|upload)
    'router'        => 'browse',

    // fields array
    'fields'        => $fields,

  );

  $attachments->register( 'projects_medias', $args ); // unique instance name
}

add_action( 'attachments_register', 'projects_medias' );

/**
 * Allow connecting Projects to Clients
 */
function vslv_connection_types() {
  p2p_register_connection_type( array(
    'name' => 'clients_to_projects',
    'from' => 'client',
    'to' => 'project'
  ) );
}
add_action( 'p2p_init', 'vslv_connection_types' );


function populate_posts_with_connected_posts( $posts ) {

  global $wp_query;

  // populate clients with connected projects
  if($wp_query->query_vars['post_type'] == 'client') {

    if(function_exists('p2p_type')) {

      p2p_type('clients_to_projects')->each_connected( $wp_query );

    }

  }

  return $posts;

}
add_action('wp_head', 'populate_posts_with_connected_posts');






