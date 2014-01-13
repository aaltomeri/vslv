<?php get_template_part('templates/page', 'header'); ?>
<?php get_template_part('templates/content', 'page'); ?>

<?php

$args = array( 'posts_per_page' => -1, 'post_type' => 'project', 'suppress_filters' => false);

$projects = get_posts( $args );


foreach ( $projects as $post ) : 

	setup_postdata( $post ); 

?>

	<li>
		<h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>

		<?php if($post->connected): ?>
			
		<h4>Clients</h4>

		<ul>
			<?php foreach($post->connected as $connected_post): ?>
			
			<li><?php echo $connected_post->post_title; ?></li>

			<?php endforeach; ?>
		</ul>
		
		<?php endif; ?>

	</li>

<?php endforeach; 
wp_reset_postdata();?>
