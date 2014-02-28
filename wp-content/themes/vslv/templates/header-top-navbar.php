<header class="banner navbar navbar-default navbar-static-top" role="banner">

  <div class="header-inner-wrap">

    <div class="navbar-header">

      <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
        
        <span class="sr-only">Toggle navigation</span>

        <span class="hi-response hi-response-menu"></span>

      </button>

      <a class="navbar-brand" href="/">
        <img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/logo-vslv-color.svg" alt="<?php bloginfo('name'); ?>" />
      </a>

    </div>

    <nav class="navbar-collapse width in" role="navigation">
      
      <?php $languages = icl_get_languages('skip_missing=0&orderby=name&order=DESC&link_empty_to=""'); ?>
      
      <?php //var_dump($languages); ?>

      <ul class="language-switcher">
        <?php foreach($languages as $lang): ?>
          <li class="<?php echo $lang['language_code']; ?><?php echo ($lang['language_code'] == ICL_LANGUAGE_CODE)? ' active' : ''; ?>"><a href="<?php echo $lang['url']; ?>" data-bypass><?php echo $lang['language_code']; ?></a></li>
        <?php endforeach; ?>
      </ul>

      <?php
        if (has_nav_menu('primary_navigation')) :
          wp_nav_menu(array('theme_location' => 'primary_navigation', 'menu_class' => 'nav navbar-nav'));
        endif;
      ?>

    </nav>

  </div>

</header>
