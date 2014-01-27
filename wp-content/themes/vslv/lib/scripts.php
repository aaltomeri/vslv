<?php

/**
 * augment post meta attachments (added by Attachments plugin) 
 * by retrieving the actual attachments
 * use the json_prepare_meta hook
 * @see prepare_meta in WP_JSON_Posts Class (JSON REST API plugin)
 */
function vslv_augment_posts_json_with_attachments($_post, $post, $context) {

  global $wp_json_server;

  // look for 'attachments' post meta
  foreach($_post['post_meta'] as $key => $value) {

    if($key == 'attachments') {

      // get first element of array as the actual value (because it is formatted this way)
      // and decode it (as it's been stored as json)
      $value = json_decode($value[0]);

      // ----- get attachments ------ //
      
      // get attachments ids
      $attachments_ids = array();
      foreach($value as $attachments_instance => $attachments) {
        $attachments_ids = array_merge($attachments_ids, array_map(
            function($value) { return $value->id; },
            $attachments
          )
        );
      }


      // as prepare_post is common to all Post Types 
      // we remove the filter here to avoid it being called recursively
      // as $wp_json_media->getPosts will use it as well
      remove_action( 'json_prepare_post', 'vslv_augment_posts_json_with_attachments', 10, 3 );

      $wp_json_media = new WP_JSON_Media($wp_json_server);
      $attachments = $wp_json_media->getPosts(array('post__in' => $attachments_ids, 'orderby' => 'post__in'), 'single');

      // re-add action for following requests
      add_action( 'json_prepare_post', 'vslv_augment_posts_json_with_attachments', 10, 3 );

      // // user WP_Query and attachments_ids 
      // // goal is to have only one query to retrieve attachments
      // $wp_q = new WP_Query(array('post_type' => 'attachment', 'post_status' => array('publish', 'inherit'), 'post__in' => $attachments_ids));
      // $attachments = $wp_q->get_posts();

      $_post['medias'] = $attachments;

    }

  }

  return $_post;

}
add_action( 'json_prepare_post', 'vslv_augment_posts_json_with_attachments', 10, 3 );

/**
 * Enqueue scripts and stylesheets
 *
 * Enqueue stylesheets in the following order:
 * 1. /theme/assets/css/main.min.css
 *
 * Enqueue scripts in the following order:
 * 1. jquery-1.10.2.min.js via Google CDN
 * 2. /theme/assets/js/vendor/modernizr-2.7.0.min.js
 * 3. /theme/assets/js/main.min.js (in footer)
 */
function roots_scripts() {

  wp_enqueue_style('roots_main', get_template_directory_uri() . '/assets/css/main.min.css', false, '22d899885c6fd53bf0789381f27f7e19');

  // jQuery is loaded using the same method from HTML5 Boilerplate:
  // Grab Google CDN's latest jQuery with a protocol relative URL; fallback to local if offline
  // It's kept in the header instead of footer to avoid conflicts with plugins.
  if (!is_admin() && current_theme_supports('jquery-cdn')) {
    wp_deregister_script('jquery');
    wp_register_script('jquery', '//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js', false, null, false);
    add_filter('script_loader_src', 'roots_jquery_local_fallback', 10, 2);
  }

  if (is_single() && comments_open() && get_option('thread_comments')) {
    wp_enqueue_script('comment-reply');
  }

  wp_register_script('modernizr', get_template_directory_uri() . '/assets/js/vendor/modernizr-2.7.0.min.js', false, null, false);
  wp_register_script('roots_scripts', get_template_directory_uri() . '/assets/js/scripts.min.js', false, '6c56f74279fd8eab629c94014a527022', true);
  wp_enqueue_script('modernizr');
  wp_enqueue_script('jquery');
  wp_enqueue_script('backbone');

  $appData = require_once(dirname(__FILE__) . '/../appData.php');
  wp_localize_script( 'roots_scripts', 'APP_DATA', $appData );
  wp_enqueue_script('roots_scripts');

}
add_action('wp_enqueue_scripts', 'roots_scripts', 100);

// http://wordpress.stackexchange.com/a/12450
function roots_jquery_local_fallback($src, $handle = null) {
  static $add_jquery_fallback = false;

  if ($add_jquery_fallback) {
    echo '<script>window.jQuery || document.write(\'<script src="' . get_template_directory_uri() . '/assets/js/vendor/jquery-1.10.2.min.js"><\/script>\')</script>' . "\n";
    $add_jquery_fallback = false;
  }

  if ($handle === 'jquery') {
    $add_jquery_fallback = true;
  }

  return $src;
}
add_action('wp_head', 'roots_jquery_local_fallback');

function roots_google_analytics() { ?>
<script>
  (function(b,o,i,l,e,r){b.GoogleAnalyticsObject=l;b[l]||(b[l]=
  function(){(b[l].q=b[l].q||[]).push(arguments)});b[l].l=+new Date;
  e=o.createElement(i);r=o.getElementsByTagName(i)[0];
  e.src='//www.google-analytics.com/analytics.js';
  r.parentNode.insertBefore(e,r)}(window,document,'script','ga'));
  ga('create','<?php echo GOOGLE_ANALYTICS_ID; ?>');ga('send','pageview');
</script>

<?php }
if (GOOGLE_ANALYTICS_ID && !current_user_can('manage_options')) {
  add_action('wp_footer', 'roots_google_analytics', 20);
}
