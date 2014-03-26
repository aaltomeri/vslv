<?php

// as this file is called from a function in lib/scripts.php
// we need to declare $post as global to be able to use it
global $post;

// use JSON API to get data formatted as JSON like the JSON API would return it
// this is done this way for consistency as the API formats data a certain way
// Note: we will need to parse the returned string in our app init function to make them into js objects

// current post
if($post !== null) {

	// put GET params at the end of the uri
	// useful for lang param for now
	preg_match('/^(.*)?\?(.*)?/',home_url(), $matches);
	$home_url = empty($matches)? home_url() : $matches[1];
	$query_string = isset($matches[2])? '?' . $matches[2] : '';

	/* 
	 as we need to use filters on get_posts results we can not use the more direct /posts/id approach
	 @see json api getPost
	 we need to use /post_types/?filter[p]=post_id 
	 and then convert the resulting array into an object
	*/
	//$request_uri = $home_url . '/wp-json.php/posts/' . $post->ID . $query_string;
	$type = $post->post_type;
	$request_uri = $home_url . '/wp-json.php/'.$type.'s/' . ($query_string?"$query_string&":'?') . 'filter[p]=' . $post->ID;
	$post_json = file_get_contents($request_uri);
	$post_json = json_decode($post_json);
	$post_json = $post_json[0];
	$post_json = json_encode($post_json);
	
}
else {
	$post_json = null;
}



// projects list
$projects_params = http_build_query(array('filter' => array('orderby'=>'title', 'order'=>'ASC')));
//$projects_json = file_get_contents(home_url() . '/wp-json.php/projects?' . $projects_params);
$projects_json = array();

$data = array(

	"AppName" => get_bloginfo('name'),
	"currentPost" => $post_json,
	"projects" => $projects_json,
	"home_page_slug" => get_post(get_option('page_on_front'))->post_name,
	"lang" => defined("ICL_LANGUAGE_CODE")? ICL_LANGUAGE_CODE : 'fr',
	"discovery_hint_message" => __('Follow me >', 'vslv')

);

return $data;