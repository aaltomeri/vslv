<div class="wrap">
    <div id="icon-wpml" class="icon32"><br /></div>
    <h2><?php echo __('Translation options', 'sitepress') ?></h2>
    <br />
    <?php include dirname(__FILE__) . '/_posts_sync_options.php'; ?>

    <?php if(defined('WPML_ST_VERSION')): ?>
    <div style="width:48%;float:right;margin-left:10px;">
    <?php  include WPML_ST_PATH . '/menu/_slug-translation-options.php'; ?>
    </div>
    <?php endif; ?>

    <br clear="all" />
    <?php include dirname(__FILE__) . '/_custom_types_translation.php'; ?>

    <?php do_action('icl_menu_footer'); ?>
</div>