<?php

function project_init() {
	register_post_type( 'project', array(
		'hierarchical'      => true,
		'public'            => true,
		'show_in_nav_menus' => true,
		'show_ui'           => true,
		'supports'          => array( 'title', 'editor', 'thumbnail', 'page-attributes', 'custom-fields' ),
		'has_archive'       => true,
		'query_var'         => true,
		'rewrite'           => array('slug' => 'projects'),
		'labels'            => array(
			'name'                => __( 'Projects', 'vslv' ),
			'singular_name'       => __( 'Project', 'vslv' ),
			'all_items'           => __( 'Projects', 'vslv' ),
			'new_item'            => __( 'New project', 'vslv' ),
			'add_new'             => __( 'Add New', 'vslv' ),
			'add_new_item'        => __( 'Add New project', 'vslv' ),
			'edit_item'           => __( 'Edit project', 'vslv' ),
			'view_item'           => __( 'View project', 'vslv' ),
			'search_items'        => __( 'Search projects', 'vslv' ),
			'not_found'           => __( 'No projects found', 'vslv' ),
			'not_found_in_trash'  => __( 'No projects found in trash', 'vslv' ),
			'parent_item_colon'   => __( 'Parent project', 'vslv' ),
			'menu_name'           => __( 'Projects', 'vslv' ),
		),
	) );

}
add_action( 'init', 'project_init' );

function project_updated_messages( $messages ) {
	global $post;

	$permalink = get_permalink( $post );

	$messages['project'] = array(
		0 => '', // Unused. Messages start at index 1.
		1 => sprintf( __('Project updated. <a target="_blank" href="%s">View project</a>', 'vslv'), esc_url( $permalink ) ),
		2 => __('Custom field updated.', 'vslv'),
		3 => __('Custom field deleted.', 'vslv'),
		4 => __('Project updated.', 'vslv'),
		/* translators: %s: date and time of the revision */
		5 => isset($_GET['revision']) ? sprintf( __('Project restored to revision from %s', 'vslv'), wp_post_revision_title( (int) $_GET['revision'], false ) ) : false,
		6 => sprintf( __('Project published. <a href="%s">View project</a>', 'vslv'), esc_url( $permalink ) ),
		7 => __('Project saved.', 'vslv'),
		8 => sprintf( __('Project submitted. <a target="_blank" href="%s">Preview project</a>', 'vslv'), esc_url( add_query_arg( 'preview', 'true', $permalink ) ) ),
		9 => sprintf( __('Project scheduled for: <strong>%1$s</strong>. <a target="_blank" href="%2$s">Preview project</a>', 'vslv'),
		// translators: Publish box date format, see http://php.net/date
		date_i18n( __( 'M j, Y @ G:i' ), strtotime( $post->post_date ) ), esc_url( $permalink ) ),
		10 => sprintf( __('Project draft updated. <a target="_blank" href="%s">Preview project</a>', 'vslv'), esc_url( add_query_arg( 'preview', 'true', $permalink ) ) ),
	);

	return $messages;
}
add_filter( 'post_updated_messages', 'project_updated_messages' );
