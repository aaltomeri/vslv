<?php

// as this file is called from a function in lib/scripts.php
// we need to declare $post as global to be able to use it
global $post;

// use JSON API to get data formatted as JSON like the JSON API would return it
// this is done this way for consistency as the API formats data a certain way
// Note: we will need to parse the returned string in our app init function to make them into js objects

// current post
if($post !== null) {
	$post_json = file_get_contents(home_url() . '/wp-json.php/posts/' . $post->ID);
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
	"projects" => $projects_json

);

return $data;