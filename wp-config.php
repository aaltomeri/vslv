<?php
/**
 * The base configurations of the WordPress.
 *
 * This file has the following configurations: MySQL settings, Table Prefix,
 * Secret Keys, WordPress Language, and ABSPATH. You can find more information
 * by visiting {@link http://codex.wordpress.org/Editing_wp-config.php Editing
 * wp-config.php} Codex page. You can get the MySQL settings from your web host.
 *
 * This file is used by the wp-config.php creation script during the
 * installation. You don't have to use the web site, you can just copy this file
 * to "wp-config.php" and fill in the values.
 *
 * @package WordPress
 */

// composer autoload mechanism
require __DIR__ . '/vendor/autoload.php';

// disable default attachments for Attachments plugin
// as we will be implementing our own
define( 'ATTACHMENTS_DEFAULT_INSTANCE', false );

define('CONTENT_DIR', '/wp-content');
define('WP_CONTENT_DIR', dirname(__FILE__) . CONTENT_DIR);
define('WP_CONTENT_URL', 'http://' . $_SERVER['HTTP_HOST'] . CONTENT_DIR);

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define('DB_NAME', getenv('DB_NAME'));

/** MySQL database username */
define('DB_USER', getenv('DB_USER'));

/** MySQL database password */
define('DB_PASSWORD', getenv('DB_PASSWORD'));

/** MySQL hostname */
define('DB_HOST', getenv('DB_HOST'));

/** Database Charset to use in creating database tables. */
define('DB_CHARSET', 'utf8');

/** The Database Collate type. Don't change this if in doubt. */
define('DB_COLLATE', '');

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define('AUTH_KEY',         'fgLDWa-o.=P_|qU?0?Hv?2%zotS3-+MS)TBsW.HT[~J}9$|KEEv0*q?}>-e,wA{~');
define('SECURE_AUTH_KEY',  'S.n%+4HD7i$ j,r|yP0]`#8-Fb$YWRhgq`Ruj36POCi;TX.tJUN+op[e^Kps*5O3');
define('LOGGED_IN_KEY',    '7m:_GMFtO)DR#S@3,h0V3QzK;7qHqXeTH-C2+N1C4FdK6-$0dH!ANv.}n-2Q<A7T');
define('NONCE_KEY',        'qW(!7hg`OnI{M+%(uOFtvTtW<PNw+r2l8XD#4 ZF~jq8Zn,`@aIb?afIjy!xqNuh');
define('AUTH_SALT',        '%/|zl?9kxdZ-S`pP]+W-7gZer~-EUR?cS(hj>9^_!t8hhA~=[AK= y`H/5Q <**2');
define('SECURE_AUTH_SALT', 'I-?Mf5Y||wDe8-Y0+HGUKYv<W$I:]V2W|H$!+0uU>^4|2m]=DL~Bl+}rpLj-0c/-');
define('LOGGED_IN_SALT',   'D.36lo=u&mi|:1;~l|xeq?M7!IfHJEjgu)a%]5ZA`?{3HD%rs(oNCVgLG)|dxjtR');
define('NONCE_SALT',       'z^$*.R`lx$dJ2F?Y,J#41qZ(:s.3egQ?.#(v |M}AJ~P)<LO85v9kNGox}isum!-');

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each a unique
 * prefix. Only numbers, letters, and underscores please!
 */
$table_prefix  = 'wp_';

/**
 * WordPress Localized Language, defaults to English.
 *
 * Change this to localize WordPress. A corresponding MO file for the chosen
 * language must be installed to wp-content/languages. For example, install
 * de_DE.mo to wp-content/languages and set WPLANG to 'de_DE' to enable German
 * language support.
 */
define('WPLANG', '');

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 */
define('WP_DEBUG', false);

/* That's all, stop editing! Happy blogging. */

/** Absolute path to the WordPress directory. */
if ( !defined('ABSPATH') )
	define('ABSPATH', dirname(__FILE__) . '/wp-core/');

/** Sets up WordPress vars and included files. */
require_once(ABSPATH . 'wp-settings.php');
