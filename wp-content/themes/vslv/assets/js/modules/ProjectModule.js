var PROJECT_MODULE = (function(win, $, cjs) {

  if(typeof cjs === "undefined") {
    throw "Project module depends on CreateJS library. It seems to be missing.";
  }

  var module = _.extend({

        collection: null,
        portfolioView: null


      }, Backbone.Events),
      
      name = "project",

      /**
       * Project Model
       */
      Model = Backbone.Model.extend({

        mediasLoaded: false,

        initialize: function() {
          
          // add convenient thumbnail attribute
          if(this.get('featured_image')) {
            this.set('thumbnail',
              this.get('featured_image').attachment_meta.sizes["portfolio-thumbnail"]
            );
          }

          var panel_type = this.get('post_meta')['panel-type']? this.get('post_meta')['panel-type'][0] : 'left';

          this.set('panel-type', panel_type);

        },

        /**
         * populate 'medias' attribute for model - an array of objects
         * based on the presence of meta attachments (Attachments WP plugin)
         * we actually want to get more infos than just the ID and name of the attachments
         */
        getMediasInfos: function() {

          var attachments = this.get('post_meta').attachments || null,
              medias = [],
              attachments_ids = [];


          if(!attachments) {
            return null;
          }

          attachments = $.parseJSON(attachments[0]);

          // loop through attachments and get each attachement data 
          // build an array of attachments ids for mass retrieval
          _.each(attachments.attachments, function(attachment) {

            attachments_ids.push(attachment.id);

          });

          // make a request to get all attachments for the project
          // filter with the attachments ids we got from above
          // Note: post__in query vars need to be enable for this to work
          // @see custom.php vslv_add_json_api_query_vars()
          var promise = $.get(VSLV_CONFIG.base_url + 'media/', {fields: 'ID', filter: { post__in: attachments_ids }})
              
              .success(function(data) {

                medias = data;

              })
              .error(function() {

                throw('Error retrieving medias for project: ' + this.get('ID'));

              });

          // when all attachments data have been retrieved
          // set a 'medias' attribute on the model with all the attachments data
          $.when.call($, promise).done(

            $.proxy(function() {

              this.set('medias', medias);
              this.trigger('Project:MediasLoaded');

              },
              this
            )
          );

          return promise;

        }

      }),

      /**
       * Project Collection
       */
      Collection = Backbone.Collection.extend({
        
        url: VSLV_CONFIG.base_url + VSLV_CONFIG.modules[name].route + '?lang=' + VSLV_CONFIG.lang,
        
        model: Model,

        initialize: function() {

          var medias_promises = [];

          this.on('reset', function() {

            module.trigger('Projects:loaded');

          });

        }


      }),

    
    /**
     * manage portfolio
     *
     * a list of links - thumbnails
     * a click on a link will close the portfolio
     * and trigger an event that will make the clicked project the current one
     * i.e. 'move' the main Discovery timeline to the project 
     *
     * this will be done by triggering an event that the Projects collection will handle
     * the collection will in turn trigger a 'project changed' event and the Dicsovery View
     * will act accordingly
     * 
     * @type View
     */
    PortfolioView = Backbone.View.extend({

      id: 'portfolio',
      project_thumbs_queue: null,
      project_thumbs_loaded: false,
      items: [],
      item_animation_delay: 40,
      item_animation_time: 400,
      swiper: null,
      is_showing: false,
      is_open: false,

      events: {

        'mouseenter li': 'onItemEnterHandler',
        'mouseleave li': 'onItemLeaveHandler'

      },

      initialize: function() {

        var view = this;

        this.listenTo(this.collection, 'reset', this.preloadThumbs);

        // adjust size pf open portfolio when resizing
        // this is aimed at rotating a device 
        // so that we get the proper PF height
        $(window).on('resize', function() {

          if(view.is_open) {

            view.$el.css({

              height: (device.landscape() && device.mobile())? "56%" : "36%"

            });

          }

        });

      },

      // preload portfolio thumbnails
      preloadThumbs: function() {
        
        var view = this,
            project_thumbs_loading_manifest = [];

        this.project_thumbs_queue = new createjs.LoadQueue();

        // build load manifest
        this.collection.each(function(model) {

          if(model.get('thumbnail')) {
            // add to the loading queue
            project_thumbs_loading_manifest.push({
              id: 'project_' + model.get('slug') + '_thumbnail',
              src: model.get('thumbnail').url
            });
          }
        });

        this.project_thumbs_queue.on('progress', function(e) {

          this.$el.css({
            x: -this.$el.parent().width() * e.progress
          });


        },
        this);
        
        // render portfolio when all images are preloaded
        this.project_thumbs_queue.on('complete', function() {
          this.project_thumbs_loaded = true;
          this.render();
          
          // notify we're ready
          module.trigger('PortfolioView:thumbs-loaded');

        },
        this);
        
        this.project_thumbs_queue.loadManifest(project_thumbs_loading_manifest);

      },

      render: function() {

        var view = this;

        this.listenToOnce(this, 'PortfolioView:is-open', function() {

          this.collection.each(function(model, index) {
            
            // create single items
            var item = new PortofolioItemView({ model: model });
            this.items.push(item);
            item.render();

            // add them to the portfolio dom element
            this.$el.find('ul').append(item.$el);

          },
          this);

          // init Swiper
          this.swiper = this.$el.swiper({

            freeMode: true,
            freeModeFluid: true,
            momentumRatio: 1,

            initialSlide: 10,
            
            loop: true,
            slidesPerView: 'auto',
            loopedSlides: this.items.length,
            
            resizeReInit: true,

            preventLinksPropagation: true

          });

          // this.swiper.reInit();

        });

      },

      /**
       * positioning the over deco element at the top right corner of the item
       * as the display css ppty for the item is 'inline'
       * all attempts to do this with css had failed (crossbrower safe that is)
       * so we're just resorting to js here and be done with it ...
       */
      onItemEnterHandler: function(e) {

        // do nothing on touch devices
        if(device.mobile() || device.tablet()) {

          return;

        }

        var $item = $(e.currentTarget),
            $img = $item.find('img:eq(0)'),
            $hoverElement = $('<div></div>').css({
              position: 'absolute',
              top: -$img.height()/2+$item.height()/2, // li display: inline = no height for the actual element
              right: 0
            }).addClass('portfolio-item-hover');

        if(!$item.find('.portfolio-item-hover').length) {

          $item.append($hoverElement);

        }

        // compute dynaic font size for hover element
        // based on the base font size for an approximatively 250px high image
        // the base font size is set in the .portfolio-item-hover class
        // so we can get it at this point
        var base_image_height = 250,
            base_font_size = $hoverElement.css('font-size').match(/^[0-9]+/)[0],
            base_line_height = $hoverElement.css('line-height').match(/^[0-9]+/)[0],
            font_size = base_font_size/base_image_height*$img.height(),
            line_height = base_line_height/base_image_height*$img.height();

        $hoverElement.css({
          'font-size': font_size + 'px',
          'line-height': line_height + 'px'
        });

      },

      onItemLeaveHandler: function(e) {

        // do nothing on touch devices
        if(device.mobile() || device.tablet()) {

          return;

        }

        var $item = $(e.currentTarget),
            $hoverElement = $item.find('.portfolio-item-hover');

        $hoverElement.remove();

      },

      show: function() {

        var view = this;

        // quick fix to avoid trying to show PF
        // when PF is already in the process of ...
        if(this.is_showing) {
          return;
        }

        this.is_showing = true;
        this.on('PortfolioView:items-shown', function() {
          this.is_showing = false;
        });

        this.trigger('PortfolioView:show');

        this.stopListening(this, 'PortfolioView:items-hidden');

        this.$el.transition({

          x: -this.$el.parent().width(),
          duration: 400

        }, function() {


            setTimeout(function() {

              // anchor portfolio so that it reacts well to resize
              // if we did not do this we would have to setup a resize handler to deal with translate transform (I think)
              view.$el.css({
                  x: 0,
                  left: 0
                }
              );
              
            },
            2000);

          }

        );

        if(this.project_thumbs_loaded) {

          this.open();

        }
        else {
             
          this.listenTo(module, 'PortfolioView:thumbs-loaded', this.open);
            
        }

      },

      hide: function() {

        var view = this;

        this.trigger('PortfolioView:hide');

        this.stopListening(this, 'PortfolioView:items-hidden');

        this.hideItems();

        this.listenTo(this, 'PortfolioView:items-hidden', function() {

            this.close();

            this.$el.transition({

              x: this.$el.parent().width(),
              duration: 1000

            }, function() {

              // anchor portfolio so that it reacts well to resize
              // if we did not do this we would have to setup a resize handler to deal with translate transform (I think)
              view.$el.css({
                  x: 0,
                  left: "100%"
                }
              );

          });

        });

      },

      open: function() {

        var view = this;

        this.trigger('PortfolioView:open');

        this.$el.transition({

          height: (device.landscape() && device.mobile())? "56%" : "36%",
          duration: 600

        }, function() {

          view.trigger('PortfolioView:is-open');

          view.$el.addClass('is-open');

          view.showItems();

        });

      },

      close: function() {

        var view = this;

         this.trigger('PortfolioView:close');

        this.$el.removeClass('is-open');

        this.$el.transition({

          height: "1px",
          duration: 200

        }, function() {

          view.trigger('PortfolioView:is-closed');

        });

      },

      slideTimeout: null,
      showItems: function() {

        var view = this,
            delay = 0,
            timeout = 0;

        console.log("show items");

        var n_slides = this.$('.swiper-slide').length,
            n_actual_slides = n_slides/3;

        this.$('.swiper-slide').each(function(index, el) {

          // as there are 3 times the noral number of slides because of the swiper loop mode
          // we apply the same delay to each slide every n slide
          // for instance if there are 12 slides originally
          // we apply the same delay to slide 1, 13 and 25
          // this is done to avoid setting delay as if there were actually 3 times the number of slides

          // so we set the index to be the same for each group of slides
          index = index - (n_actual_slides*Math.floor(index/n_actual_slides));
          delay = index*view.item_animation_delay;

          //$(this).transition({ opacity: 1, delay: delay, duration: this.item_animation_time });

          $(this).transition({ opacity: 1});

        });

        timeout = delay + this.item_animation_time;

        if(this.slideTimeout) {
          clearTimeout(this.slideTimeout);
        }

        this.slideTimeout = setTimeout(function() {

            view.trigger('PortfolioView:items-shown');

            view.is_open = true;

          },
          timeout
        );

      },

      hideItems: function() {

        var view = this,
            delay = 0,
            timeout = 0,
            n_slides = this.$('.swiper-slide').length,
            n_actual_slides = n_slides/3;

        this.$('.swiper-slide').each(function(el, index) {

          // as there are 3 times the noral number of slides because of the swiper loop mode
          // we apply the same delay to each slide every n slide
          // for instance if there are 12 slides originally
          // we apply the same delay to slide 1, 13 and 25
          // this is done to avoid setting delay as if there were actually 3 times the number of slides

          // so we set the index to be the same for each group of slides
          index = index - (n_actual_slides*Math.floor(index/n_actual_slides));
          delay = index*view.item_animation_delay/2;

          //$(this).transition({ opacity: 0, delay: delay, duration: this.item_animation_time });
          $(this).transition({ opacity: 0});

        });

        timeout = delay + this.item_animation_time/2;

        setTimeout(function() {
            view.trigger('PortfolioView:items-hidden');
            view.is_open = false;
          },
          timeout
        );

      }

    }),

    /**
     * Portfolio Single Item 
     * should be associated with a Project model
     */
    PortofolioItemView = Backbone.View.extend({

        tagName: 'li',
        className: 'swiper-slide',
        animation_duration: 400,

        events: {

        },

        initialize: function() {

        },

        render: function() {

            var $link = $('<a />').attr('href', this.model.get('link')),
                $image = $('<img />').attr('src',
                  this.model.get('thumbnail')? this.model.get('thumbnail').url : '#');

            this.$el.html($link.append($image));

            return this;

        },

        show: function(delay, duration) {

          var _delay = delay? delay : 0,
              _duration = duration? duration : this.animation_duration;

          this.$el.transition({
            opacity: 1,
            delay: _delay,
            duration: _duration
          });

        },

        hide: function(delay, duration) {

          var _delay = delay? delay : 0,
              _duration = duration? duration : this.animation_duration;

          this.$el.transition({
            opacity: 0,
            delay: _delay,
            duration: _duration
          });

        },

        launchProject: function() {

            //console.log(this.model);

        }

    }),

    init = function(projects) {

        module.collection = new Collection();
        module.portfolioView = new PortfolioView({ el: '#portfolio', collection: module.collection });

        // fetch projects if no projects have been passed
        if(projects.length) {

          module.collection.reset(projects);

        }
        else {

          module.collection.fetch({reset: true, data: {filter: {posts_per_page: -1, orderby: 'menu_order', order: 'ASC'}}});
          
        }

    };

  // exports
  module.init = init;

	return module;


}(window, jQuery, createjs));