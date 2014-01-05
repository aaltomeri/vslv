 var DISCOVERY_MODULE = (function() {

  var module = _.extend({

      collection: null,
      discoveryView: null

    }, Backbone.Events),

    /**
     * DiscoveryModel
     * 
     * Model for the Projects or Pages we are showing through the Discovery View
     */
    DiscoveryModel = Backbone.Model.extend({

      initialize: function() {
        
      }

    }),

    /**
     * DiscoveryCollection
     * 
     * Collection of Pages or Projects which medias we are sequentially displaying
     */
    DiscoveryCollection = Backbone.Collection.extend({

      model: DiscoveryModel,
      currentModel: null,
      currentModelIndex: -1,

      initialize: function() {},

      next: function() {

        console.group("Next Discovery");

        // loop
        if(this.currentModelIndex === this.length-1) {

          this.resetCurrentModelIndex();

        }

        this.currentModelIndex++;
        this.setCurrenModel(this.currentModelIndex);

        console.groupEnd();

        return this.currentModel;

      },

      setCurrenModel: function(indexOrModel) {

        if(typeof indexOrModel === 'object') {

          this.currentModel = indexOrModel;

        }
        else {

          this.currentModel = this.at(indexOrModel);

        }
          
        this.currentModelIndex = this.indexOf(this.currentModel);

        console.info("Discovery index: ", this.currentModelIndex, "/", this.length, ' - ', this.currentModel.get("slug"));
        console.info("Discovery Medias: ", this.currentModel.get("medias"));

        this.trigger("Discovery:set", this.currentModel);

        return this.currentModel;

      },

      setCurrentModelBySlug: function(slug) {

        var model = this.findWhere({slug: slug});

        return this.setCurrenModel(model);

      },

      resetCurrentModelIndex: function() {

        this.currentModelIndex = -1;

      }

    }),

    /** 
     * DiscoveryView
     * 
     * manages media navigation mechanism 
     * cycling through each project and its medias as full screen images or videos
     * medias displayed do not necessarily belong to a project and can for instance be featured images for pages 
     * 
     */
    DiscoveryView = Backbone.View.extend({

        currentMedia: null,

        initialize: function() {

          // there are medias we can work with
          if(this.model.get('medias') && this.model.get('medias').length !== 0) {

            this.renderRandomMedia();

          }
          else {

            // wait until medias have been set
            // and hope there is at least one media to be displayed
            this.model.on('change:medias', function() {

                this.renderRandomMedia();

            },
            this);
            
          }


        },

        getRandomMedia: function() {

          var rdm;

          if(!this.model.get('medias') || this.model.get('medias').length === 0) {

            return;

          }

          rdm = Math.floor(Math.random()*this.model.get('medias').length);

          return this.model.get('medias')[rdm].attachment_meta.sizes.large;

        },

        setCurrentMedia: function(media) {

          this.currentMedia = media;

          return media;

        },

        renderRandomMedia: function() {

          this.currentMedia = this.getRandomMedia();

          if(this.currentMedia !== null) {

            this.render();

          }

        },

        /**
         * Preloads all media for projects
         * 
         * @return {[type]} [description]
         */
        preloadAllMedias: function() {},

        /**
         * Preload a Project medias
         */
        preloadProjectMedias: function() {},

        /**
         * Should implement the transition between one media to the next
         * simply displaying the first media if none is displayed yet
         * switching to next model in collection when all medias have been displayed
         */
        render: function() {

            if(this.currentMedia === null) {
              console.warn('TRYING TO RENDER DISCOVERY VIEW BUT NO CURRENTMEDIA HAS BEEN SET');
              return;
            }

            this.$el.css({opacity : 0});
            this.$el.css({
              'background-image': "url(" + this.currentMedia.url + ")"
            });
            this.$el.transition({opacity : 1, duration: 2000 });


        }

    }),

    init = function(model) {

      module.collection = new DiscoveryCollection();
      
      if(model instanceof DiscoveryModel) {

        // first discovery model is added to collection
        module.collection.add(model);

        // Discovery View
        module.discoveryView = new DiscoveryView( { el: "#discovery", model: model });
       
      }

      return module.collection;

    },

    /**
     * returns a Discovery Model
     * mapping given project or page model parameter chosen attributes
     * to Discovery Model attributes
     * @todo check for mandatory attributes on the model parameter?
     * @param  model a Project or Page Model
     * @return a Discovery Model
     */
    make_discovery =  function(model) {

      var d = new DiscoveryModel();

      d.set({
        title: model.get('title') || '',
        slug: model.get('slug')  || '',
        content: model.get('content')  || '',
        medias: model.get('medias') || []
      });

      return d;

    },

    /**
     * build discoveries Collection
     */
    make_discoveries =  function(collection) {

      // extract required infos from projects
      // to build 'discovery' models
      var _discoveries = collection.map(function(model) {

        return {
          title: model.get('title'),
          slug: model.get('slug'),
          content: model.get('content'),
          medias : model.get('medias') || []
        };

      });

      module.collection.add(_discoveries);

    };

  // exports
  module.init = init;
  module.make_discovery = make_discovery;
  module.make_discoveries = make_discoveries;

  return module;

}(window, jQuery, createjs));