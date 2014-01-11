<?php while (have_posts()) : the_post(); ?>
  <article <?php post_class(); ?>>
    <header>
      <h1 class="entry-title"><?php the_title(); ?></h1>
      <?php //get_template_part('templates/entry-meta'); ?>
    </header>
    <div class="entry-content">
      <?php the_content(); ?>

      <?php $attachments = new Attachments( 'attachments' ); ?>

      <?php if( $attachments->exist() ) : ?>
        <h3>Medias</h3>
        <ul>
          <?php while( $attachment = $attachments->get() ) : ?>
            <li>
              <?php echo $attachments->image( 'thumbnail' ); ?>
            </li>
          <?php endwhile; ?>
        </ul>
      <?php endif; ?>

    </div>
    <footer>
      <?php wp_link_pages(array('before' => '<nav class="page-nav"><p>' . __('Pages:', 'vslv'), 'after' => '</p></nav>')); ?>
    </footer>
    <?php comments_template('/templates/comments.php'); ?>
  </article>
<?php endwhile; ?>
