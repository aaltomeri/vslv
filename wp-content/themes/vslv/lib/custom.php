<?php
/**
 * Custom functions
 */

// add Project post type
require_once locate_template('/post-types/project.php');

// add Client post type
require_once locate_template('/post-types/client.php');

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
    'post_type'     => array( 'project', 'page' ),

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





