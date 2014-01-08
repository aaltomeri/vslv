<header class="banner navbar navbar-default navbar-static-top collapsed" role="banner">

  <div>

    <div class="navbar-header">

      <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target=".navbar-collapse">
        <span class="sr-only">Toggle navigation</span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
      </button>

      <a class="navbar-brand" href="/"><?php bloginfo('name'); ?></a>

    </div>

    <nav class="collapse navbar-collapse width" role="navigation">
      
      <?php $languages = icl_get_languages('skip_missing=N&orderby=KEY&order=DIR&link_empty_to=str'); ?>
      
      <?php //var_dump($languages); ?>

      <ul class="language-switcher">
        <?php foreach($languages as $lang): ?>
          <li class="<?php echo $lang['language_code']; ?>"><a href="<?php echo $lang['url']; ?>" data-bypass><?php echo $lang['language_code']; ?></a> | </li>
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
