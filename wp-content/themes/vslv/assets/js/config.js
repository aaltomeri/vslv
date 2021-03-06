var VSLV_CONFIG = {

	lang: APP_DATA.lang || 'fr',
	base_url: '/wp-json.php/',

	// the Wordpress image size name used in Discovery process
	discovery_wp_image_size: 'discovery',
	discovery_wp_image_small_size_breakpoint: 568,
	discovery_wp_image_small_size: 'discovery_small',
	discovery_hide_content_delay: 5000, //ms
	discovery_hint_interval: 14000, //ms
	discovery_hint_show_duration: 2000, //ms
	discovery_hint_hide_duration: 500, //ms

	first_media_layer_opacity: 0.7,

	modules: {
		page: {
			name: "page",
			route: "pages"
		},
		project: {
			name: "project",
			route: "projects"
		}
	}

};