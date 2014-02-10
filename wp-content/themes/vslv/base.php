<?php get_template_part('templates/head'); ?>
<body <?php body_class(); ?>>

  <!--[if lt IE 8]>
    <div class="alert alert-warning">
      <?php _e('You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.', 'vslv'); ?>
    </div>
  <![endif]-->

  <?php
    do_action('get_header');
    // Use Bootstrap's navbar if enabled in config.php
    if (current_theme_supports('bootstrap-top-navbar')) {
      get_template_part('templates/header-top-navbar');
    } else {
      get_template_part('templates/header');
    }
  ?>
  
  <main class="main" role="main">

    <div class="preloader animate"></div>

    <?php //var_dump(roots_template_path()); ?>

    <div id="discovery">
      <div class="preloader"></div>
    </div>
    <div id="content" class="is-hidden swiper-container">
      <script type="text/template" id="content-template">
        
        <!-- icons -->
        <span class="hi-response hi-response-remove toggle"></span>
        <span class="hi-response hi-response-down-arrow scroll-hint"></span>
        
        <div class="swiper-wrapper content <%= data.type %>">
          <div class="swiper-slide inner-content">
          
            <% if(data.type == 'project') { %>
              <h1><%= data.client.title %></h1>
              <h3><%= data.title %></h3>
            <% } %>
            
            <%= data.content %>
            
            </div>
        </div>
      </script>
    </div>
    <div id="portfolio" class="swiper-container">
      <div class="content swiper-wrapper">
        <ul class="swiper-slide"></ul>
      </div>
    </div>
    
  </main><!-- /.main -->

  <div class="seo-content">
    <?php include roots_template_path(); ?>
  </div>

  <?php get_template_part('templates/footer'); ?>

</body>
</html>
