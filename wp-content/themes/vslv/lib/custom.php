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
function _attachments( $attachments )
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
    'post_type'     => array( 'post', 'page', 'project' ),

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

  $attachments->register( 'attachments', $args ); // unique instance name
}

add_action( 'attachments_register', '_attachments' );

/**
 * Allow connecting Projects to Clients
 */
function vslv_connection_types() {
  p2p_register_connection_type( array(
    'name' => 'clients_to_projects',
    'from' => 'client',
    'to' => 'project',
    'sortable' => 'any'
  ) );
}
add_action( 'p2p_init', 'vslv_connection_types' );


function populate_posts_with_connected_posts( $posts, $query ) {

  global $wp_query;

  if(!$query) {
    $query = $wp_query;
  }


  // populate clients with connected projects
  if($query->query_vars['post_type'] == 'client' || 
    $query->query_vars['post_type'] == 'project') 
  {

    if(function_exists('p2p_type')) {

      p2p_type('clients_to_projects')->each_connected($query);

    }

  }

  return $posts;

}
add_action('the_posts', 'populate_posts_with_connected_posts', 10, 2);

/**
 * shortcode to display a list of VSLV clients
 * @param  $atts 
 * @return string The list as HTML
 */
function vslvs_clients_list_sc( $atts ) {
  
  global $post;
  
  $atts = shortcode_atts( array(
    ), $atts );

  $output = '<ul class="clients-list">';
  
  $wp_q = new WP_Query(array('post_type' => 'client', 'posts_per_page' => -1, 'orderby' => 'name', 'order' => 'ASC'));
  $clients = $wp_q->get_posts();

  foreach ($clients as $key => $client) {


    // add projects to client
    // connected posts are connected in @see populate_posts_with_connected_posts
    if($client->connected) {

      $output .= '<li class="client-with-projects">';    
      
      $output .= '<div>'.$client->post_title.'</div>';

      $output .= '<ul class="client-projects">';

      foreach($client->connected as $project) {

        $project_link = get_permalink($project->ID);
        
        $output .= '<li>';
          $output .= "<a href='$project_link'>{$project->post_title}</a>";
        $output .= '</li>';
        
      }
      
      $output .= '</ul>';

    }
    else {

      $output .= '<li>';    
      $output .= $client->post_title;

    }
    
    
    $output .= '</li>';  

  }

  $output .= '<ul>';

  return $output;
  
}
add_shortcode("vslv-clients", 'vslvs_clients_list_sc');

function VSLV_get_Media_formats($post_ID) {

  $args = array(
          'post_mime_type' => 'video',
          'post_parent' => $post_ID,
          'post_status' => null,
          'post_type' => 'attachment',
        );

  $video_attachments = get_posts($args);
  echo 'hi';
  foreach ($video_attachments as $k => $v) {
    var_dump($v);
  }

  return $video_attachments;

}

/**
 * Get all available additional video formats for a video given its id
 *
 * @param $attachment_id
 * @param $format_as_source_tags
 * @return an array of urls or of already formatted source tags depending on second parameter
 * 
 * @param [type] $attachment_id [description]
 */
function VSLV_get_video_formats($attachment_id, $format_as_source_tags = false) {

  $sources = array();

  // get attachment
  $original_url = wp_get_attachment_url($attachment_id);

  // make sure it's a video
  if(!strstr(get_post_mime_type($attachment_id), 'video')) {
    return false;
  }

  // get file type
  $moviefiletype = pathinfo($original_url, PATHINFO_EXTENSION);
  
  $encodevideo_info = kgvid_encodevideo_info($original_url, $attachment_id);

  $order = 0;

  // Original
  $sources[$order] = array(
    'url' => $original_url, 
    'type' => $moviefiletype,
    'order' => $order,
    'media-query' => 'min-device-width: 1280px'
  );
  
  // hard coded KGVID plugin video formats
  // those need to be exactky as they are here
  // since they are used in video info
  $video_formats = array(
    '1080' => array('type' => 'mp4', 'media-query' => 'min-device-width: 1280px'),
    '720' => array('type' => 'mp4', 'media-query' => 'min-device-width: 768px'),
    'mobile' => array('type' => 'mp4', 'media-query' => 'min-device-width: 320px'),
    'webm' => array('type' => 'webm', 'media-query' => 'min-device-width: 320px'),
    'ogg' => array('type' => 'ogg', 'media-query' => 'min-device-width: 320px')
  );

  foreach ($video_formats as $name => $infos) {

    if ($encodevideo_info[$name."_exists"]) { 
    
      $order++;

      $url = $encodevideo_info[$name."url"];
        
      $sources[$order] = array(
        'url' => $url, 
        'order' => $order,
        'type' => $infos['type'],
        'media-query' => $infos['media-query']
      );

    }
    

  }
  
  if(!$format_as_source_tags) {

    return $sources;

  }
  else {

    return VSLV_make_video_formats_tags($sources);
    
  }

  return $sources;

}

function VSLV_make_video_formats_tags($sources) {

  $source_tags = array();

  foreach ($sources as $name => $infos) {

    $source_tags[$name] = sprintf('<source src="%s" type="video/%s" media="(%s)">',
      $infos['url'],
      $infos['type'],
      $infos['media-query']
    );

  }

  return $source_tags;

}

/**
 * WP EDITOR CUSTOM STYLES
 */

// Callback function to insert 'styleselect' into the $buttons array
function vslv_mce_buttons_2( $buttons ) {
  array_unshift( $buttons, 'styleselect' );
  return $buttons;
}
// Register our callback to the appropriate filter
add_filter('mce_buttons_2', 'vslv_mce_buttons_2');

// Callback function to filter the MCE settings
function vslv_mce_before_init_insert_formats( $init_array ) {  
  // Define the style_formats array
  $style_formats = array(  
    // Each array child is a format with it's own settings
    array(  

      'title' => '.contact1',  
      'block' => 'div',  
      'classes' => 'contact1',
      'wrapper' => true,
      
    ), 
    array(  
      
      'title' => '.contact2',  
      'block' => 'div',  
      'classes' => 'contact2',
      'wrapper' => true,
      
    ), 
    array(  
      
      'title' => '.contact3',  
      'block' => 'div',  
      'classes' => 'contact3',
      'wrapper' => true,
      
    ),
    
  );  
  // Insert the array, JSON ENCODED, into 'style_formats'
  $init_array['style_formats'] = json_encode( $style_formats );  
  
  return $init_array;  
  
} 
// Attach callback to 'tiny_mce_before_init' 
add_filter( 'tiny_mce_before_init', 'vslv_mce_before_init_insert_formats' );

/** 404 redirects to Portfolio **/
function vslv_template_redirect()
{
    if( is_404() )
    {
        wp_redirect( home_url( ) );
        exit();
    }
}
add_action( 'template_redirect', 'vslv_template_redirect' );









