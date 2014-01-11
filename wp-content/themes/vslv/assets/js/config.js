var VSLV_CONFIG = {

	lang: APP_DATA.lang || 'fr',
	base_url: '/wp-json.php/',

	// the Wordpress image size name used in Discovery process
	discovery_wp_image_size: 'discovery',
	discovery_hide_content_delay: 5000, //ms

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