var PROJECT_MODULE = (function(win, $, cjs) {

  if(typeof cjs === "undefined") {
    throw "Project module depends on CreateJS library. It seems to be missing.";
  }


  var name = "project",
      collection,
      portfolioView;

	var Model = Backbone.Model.extend({
      
      initialize: function() {
        
        if(this.get('featured_image')) {
          this.set('thumbnail',
            this.get('featured_image').attachment_meta.sizes.thumbnail
          );
        }

      }

    }),

    Collection = Backbone.Collection.extend({
      url: VSLV_CONFIG.base_url + VSLV_CONFIG.modules[name].route + '?lang=' + VSLV_CONFIG.lang,
      model: Model
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
    PortofolioView = Backbone.View.extend({

      id: 'portfolio',
      items: [],

      initialize: function() {

        this.listenTo(this.collection, 'reset', this.preloadThumbs);

      },

      // preload portfolio thumbnails
      preloadThumbs: function() {
        
        var view = this,
            project_thumbs_queue = new createjs.LoadQueue(),
            project_thumbs_loading_manifest = [];

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

        
        //project_thumbs_queue.on('fileload', function(o) { $('body').append(o.result); console.log(o); });
        
        // render portfolio when all images are preloaded
        project_thumbs_queue.on('complete', this.render, this);
        
        project_thumbs_queue.loadManifest(project_thumbs_loading_manifest);

      },

      render: function() {

        this.collection.each(function(model) {
          
          // create single items
          var item = new PortofolioItemView({ model: model });
          item.render();
          // add them to the portfolio dom element
          this.$el.append(item.$el);


        }, this);
      }

    }),

    /**
     * Portfolio Single Item 
     * should be associated with a Project model
     */
    PortofolioItemView = Backbone.View.extend({

        tagName: 'li',

        events: {

          'click': 'launchProject'

        },

        initialize: function() {

        },

        render: function() {

            this.$el.html($('<img />').attr('src', this.model.get('thumbnail').url));

            return this;

        },

        launchProject: function() {

            console.log(this.$el);

        }

    }),

    // manage main Projects navigation mechanism
    // cycling through each project and its medias as full screen images or videos
    // this View constitutes 
    DiscoveryView = Backbone.View.extend({

        initialize: function() {},

        /**
         * Preloads all media for projects
         * 
         * @return {[type]} [description]
         */
        preloadAllMedias: function() {},

        /**
         * Preload a Project medias
         * @return {[type]} [description]
         */
        preloadProjectMedias: function() {},

        render: function() {}

    }),

    init = function() {

        collection =  new Collection();
        portfolioView = new PortofolioView({ el: '#portfolio', collection: collection });

        // fetch projects
        collection.fetch({reset: true, data: {filter: {orderby: 'title', order: 'ASC'}}});

    };



	return {

		collection: collection,
    init: init

	};


}(window, jQuery, createjs));