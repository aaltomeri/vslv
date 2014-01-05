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
              this.get('featured_image').attachment_meta.sizes.thumbnail
            );
          }

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
      },

      show: function() {

        this.$el.show();

      },

      hide: function() {

        this.$el.hide();

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

            var $link = $('<a />').attr('href', this.model.get('link')),
                $image = $('<img />').attr('src',
                  this.model.get('thumbnail')? this.model.get('thumbnail').url : '#');

            this.$el.html($link.append($image));

            return this;

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

          module.collection.fetch({reset: true, data: {filter: {posts_per_page: -1, orderby: 'title', order: 'ASC'}}});
          
        }

    };

  // exports
  module.init = init;

	return module;


}(window, jQuery, createjs));