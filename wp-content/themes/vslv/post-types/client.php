<?php

function client_init() {
	register_post_type( 'client', array(
		'hierarchical'      => false,
		'public'            => true,
		'show_in_nav_menus' => true,
		'show_ui'           => true,
		'supports'          => array( 'title', 'editor' ),
		'has_archive'       => true,
		'query_var'         => true,
		'rewrite'           => array('slug' => '__clients'),// there exists at the time of this comment a page which slug is 'clients' so we disambiguate by adding __ in front of the client post type slug
		'labels'            => array(
			'name'                => __( 'Clients', 'vslv' ),
			'singular_name'       => __( 'Client', 'vslv' ),
			'all_items'           => __( 'Clients', 'vslv' ),
			'new_item'            => __( 'New client', 'vslv' ),
			'add_new'             => __( 'Add New', 'vslv' ),
			'add_new_item'        => __( 'Add New client', 'vslv' ),
			'edit_item'           => __( 'Edit client', 'vslv' ),
			'view_item'           => __( 'View client', 'vslv' ),
			'search_items'        => __( 'Search clients', 'vslv' ),
			'not_found'           => __( 'No clients found', 'vslv' ),
			'not_found_in_trash'  => __( 'No clients found in trash', 'vslv' ),
			'parent_item_colon'   => __( 'Parent client', 'vslv' ),
			'menu_name'           => __( 'Clients', 'vslv' ),
		),
	) );

}
add_action( 'init', 'client_init' );

function client_updated_messages( $messages ) {
	global $post;

	$permalink = get_permalink( $post );

	$messages['client'] = array(
		0 => '', // Unused. Messages start at index 1.
		1 => sprintf( __('Client updated. <a target="_blank" href="%s">View client</a>', 'vslv'), esc_url( $permalink ) ),
		2 => __('Custom field updated.', 'vslv'),
		3 => __('Custom field deleted.', 'vslv'),
		4 => __('Client updated.', 'vslv'),
		/* translators: %s: date and time of the revision */
		5 => isset($_GET['revision']) ? sprintf( __('Client restored to revision from %s', 'vslv'), wp_post_revision_title( (int) $_GET['revision'], false ) ) : false,
		6 => sprintf( __('Client published. <a href="%s">View client</a>', 'vslv'), esc_url( $permalink ) ),
		7 => __('Client saved.', 'vslv'),
		8 => sprintf( __('Client submitted. <a target="_blank" href="%s">Preview client</a>', 'vslv'), esc_url( add_query_arg( 'preview', 'true', $permalink ) ) ),
		9 => sprintf( __('Client scheduled for: <strong>%1$s</strong>. <a target="_blank" href="%2$s">Preview client</a>', 'vslv'),
		// translators: Publish box date format, see http://php.net/date
		date_i18n( __( 'M j, Y @ G:i' ), strtotime( $post->post_date ) ), esc_url( $permalink ) ),
		10 => sprintf( __('Client draft updated. <a target="_blank" href="%s">Preview client</a>', 'vslv'), esc_url( add_query_arg( 'preview', 'true', $permalink ) ) ),
	);

	return $messages;
}
add_filter( 'post_updated_messages', 'client_updated_messages' );
