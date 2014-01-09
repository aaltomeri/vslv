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

      currentMedia: null,
      currentMediaIndex: 0,

      initialize: function() {
        
      },

      setCurrentMediaIndex: function(index) {

        this.currentMediaIndex = index;

      },

      setCurrentMedia: function(index) {

        var cm;

        cm = this.currentMedia = this.getMediaAt(index);

        if(cm) {

          // update address bar
          var type = this.get('type'),
              slug = this.get('slug'),
              route = VSLV_CONFIG.modules[type].route;

          if(type==="project") {
            Backbone.history.navigate(route + '/' + slug + '/' + (this.currentMediaIndex+1));
          }

          this.trigger('Discovery:setCurrentMedia', cm);

        }

        return cm;

      },

      setNextMedia: function() {

        this.currentMediaIndex++;

        return this.setCurrentMedia(this.currentMediaIndex);

      },

      getMediaAt: function(index) {

        try {
            if(!this.get('medias') || this.get('medias').length === 0) {
            throw new Error('There is no media for this Discovery');
          }
        }
        catch(error) {
          console.log(error.message, this);
          return;
        }
        

        if(index > this.get('medias').length-1) {
          return false;
        }

        return this.get('medias')[index];

      },

      getNextMedia: function() {

        this.currentMediaIndex++;

        if(this.currentMediaIndex > this.get('medias').length-1) {

          return false;

        }

        return this.getMediaAt(this.currentMediaIndex);

      },

      getRandomMedia: function() {

        var rdm;

        rdm = Math.floor(Math.random()*this.model.get('medias').length);

        return this.getMediaAt(rdm);

      },

      /**
       * returns the source of the chosen thumbnail size for the Discovery process
       * falls back to the original media source if no size exists in config
       * or size does not exist for media
       * @param  {object} mediaObject an object describing a media for this model
       * @return {string} the source (url) for this media used in the Discovery context
       */
      getMediaSource: function(mediaObject) {

        var size = VSLV_CONFIG.discovery_wp_image_size || null,
        thumbnail_o = size? mediaObject.attachment_meta.sizes[size] : undefined,
        source = (typeof thumbnail_o !== 'undefined')? thumbnail_o.url : mediaObject.source;

        return source;

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
        this.setCurrentModel(this.currentModelIndex, 0);

        console.groupEnd();

        return this.currentModel;

      },

      setCurrentModel: function(indexOrModel, mediaIndex) {

        this.currentModel = (typeof indexOrModel === 'object')? indexOrModel : this.at(indexOrModel);

        // set Media index on current model
        if(typeof mediaIndex === 'number') {
          this.currentModel.setCurrentMediaIndex(mediaIndex);
        }
        else {
          mediaIndex = 0;
        }
        
        // reset media index on current model
        this.currentModel.setCurrentMediaIndex(mediaIndex);
          
        this.currentModelIndex = this.indexOf(this.currentModel);

        console.info("Discovery index: ", this.currentModelIndex+1, "/", this.length, ' - ', this.currentModel.get("slug"));
        console.info("Discovery Medias: ", this.currentModel.get("medias"));

        // update address bar
        // var type = this.currentModel.get('type'),
        //     slug = this.currentModel.get('slug'),
        //     route = VSLV_CONFIG.modules[type].route;

        // if(type==="project") {

        //   Backbone.history.navigate(route + '/' + slug + '/' + (this.currentModel.currentMediaIndex+1));

        // }

        this.trigger("Discovery:set", this.currentModel);

        return this.currentModel;

      },

      setCurrentModelBySlug: function(slug, mediaIndex) {

        var model = this.findWhere({slug: slug});

        if(typeof model === 'object') {

          return this.setCurrentModel(model, mediaIndex);
          
        }
        else {

          return false;

        }

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

        loadQueue: null,
        currentMedia: null,
        currentMediaIndex: 0,
        w: 0,
        h: 0,
        $c: null,
        c: null,
        ctx: null,
        $c2: null,
        c2: null,
        ctx2: null,
        $c3: null,
        c3: null,
        ctx3: null,

        events: {
          'click': 'next'
        },

        initialize: function() {

          this.w   = this.$el.width();
          this.h   = this.$el.height();

          this.$c  = $('<canvas></canvas>').attr('width',this.w).attr('height',this.h);
          this.c   = this.$c.get(0);
          this.ctx = this.c.getContext('2d');
          this.ctx.globalCompositeOperation = "destination-atop";

          this.$c2 = $('<canvas></canvas>').attr('width',this.w).attr('height',this.h);
          this.c2  = this.$c2.get(0);
          this.ctx2 = this.c2.getContext('2d');
          this.ctx2.globalCompositeOperation = "destination-atop";
          
          this.$c3 = $('<canvas></canvas>').attr('width',this.w).attr('height',this.h);
          this.c3  = this.$c3.get(0);
          this.ctx3 = this.c3.getContext('2d');
          this.ctx3.globalCompositeOperation = "copy";

          // append first canvas
          this.$el.append(this.$c);

          // setting first media
          // setup callback if there are no medias we can work with
          if(!this.model.setCurrentMedia(0)) {

            // wait until medias have been set
            // and hope there is at least one media to be displayed
            this.listenTo(this.model, 'change:medias', function() {

                this.model.setCurrentMedia(0);

            });
            
          }

          this.listenTo(this.collection, 'Discovery:set', function(model) {

            this.stopListening(this.model);

            this.model = model;

            this.listenTo(this.model, 'Discovery:setCurrentMedia', function(mediaObject) {

              this.render();

            });

            this.model.setCurrentMedia(this.collection.currentModel.currentMediaIndex);

          });


        },

        next: function() {

          if(!this.model.setNextMedia()) {

            // will trigger the render mechanism for the next Discovery
            this.collection.next();

          }

        },

        /**
         * Should implement the transition between one media to the next
         * simply displaying the first media if none is displayed yet
         * switching to next model in collection when all medias have been displayed
         */
        render: function() {

          console.group('render Discovery Media');

          var cm = this.model.currentMedia;

          if( cm === null) {
            console.warn('TRYING TO RENDER DISCOVERY VIEW BUT NO CURRENT MEDIA HAS BEEN SET FOR THE CURRENT DISCOVERY MODEL');
            return;
          }

          // is it an image?
          if(cm.is_image) {

            this.renderImage(cm);

          }
          // if not we will be expecting a Video
          else if (cm.attachment_meta.mime_type.match(/video/)) {

            this.renderVideo(cm);

          }
          // nothing else
          else {
            throw new Error("Current Media Type not supported: " + cm.attachment_meta.mime_type);
          }

        },

        renderImage: function(mediaObject) {

          var mediaElement,
              view = this;

          console.log('img: ', mediaObject.source);

          // has it been preloaded yet?
          // we check if a result is returned from the loadQueue for this media
          // we are expecting an HTML Image
          if(this.loadQueue !== null && this.loadQueue.getResult(mediaObject.slug) instanceof HTMLImageElement) { // yep

            mediaElement = this.loadQueue.getResult(mediaObject.slug);
            this.drawMediaOnCanvas(mediaElement, this.c);

            $(window).off('resize');
            $(window).on('resize', function() {
              view.drawMediaOnCanvas(mediaElement, view.c);
            });
            
          }
          else { // nope

            var _load_queue = new createjs.LoadQueue();

            _load_queue.loadFile({ id: mediaObject.slug, src: this.model.getMediaSource(mediaObject)});

            _load_queue.on('fileload', function(e) {

              console.log('fileload: ', e.item.tag);

              mediaElement = e.item.tag;
              this.drawMediaOnCanvas(mediaElement, this.c);

            },
            this);

          }

          console.groupEnd();

        },

        renderVideo: function(mediaObject) {

            console.log('video: ', mediaObject.source);

            // this is temporary and should be converted into a method
            // that will properly create a video element and set the correct source
            // depending on browser
            var view = this,
                mediaElement = $('<video></video>').attr('src', mediaObject.source).get(0);
            
            mediaElement.addEventListener('loadeddata', function() {

              view.drawMediaOnCanvas(mediaElement, view.c);

            });

        },

        drawMediaOnCanvas: function(mediaElement, canvasElement) {

          var m = mediaElement,
              c = canvasElement,
              ctx = c.getContext("2d"),
              sw = mediaElement instanceof HTMLVideoElement ? mediaElement.videoWidth : mediaElement.width,
              sh = mediaElement instanceof HTMLVideoElement ? mediaElement.videoHeight : mediaElement.height,
              scale_h = this.$el.width() / sw,
              scale_v = this.$el.height() / sh,
              scale = scale_h > scale_v ? scale_h : scale_v,
              dw = sw*scale,
              dh = sh*scale;
          
          c.width = c.width;

          c.width = dw;
          c.height = dh;

          ctx.drawImage(mediaElement, 0, 0, sw, sh, 0, 0, dw, dh);
          
          this.$el.scrollLeft(dw/2);
          this.$el.scrollTop(dh/2);
          
          //ctx.drawImage(mediaElement, 0, 0);

        },

        /**
         * Preloads all media for projects
         * 
         * @return {[type]} [description]
         */
        preloadAllMedias: function() {

          console.group("DiscoveryView: Preload All Medias");

          // we need to get a list of objects to be used in a PreloadJS manifest
          // we make sure there are no duplicates based on .id
          // and we remove any non-image media
          var view = this,

            _load_manifest = _.compact(_.uniq(_.flatten(

            this.collection.map(function(model) {

              var _medias = _.map(model.get('medias'), function(mediaObject, index) {

                if(mediaObject.is_image) { // make sure we are dealing with an image

                  // get url from the 'discovery' thumbnail ( a VSLV_CONFIG param )
                  // fall back to original image if it does not exist
                  url = view.model.getMediaSource(mediaObject);

                  return {
                    id: mediaObject.slug,
                    src: url
                  };
                }
                else {
                  return false;
                }

              });

              return _medias;

            })

          ), function(o) { return o.id; })),
          _load_queue = new createjs.LoadQueue();

          //console.log(_load_manifest);

          _load_queue.on('progress', function(e) {
            // console.log(e.progress);
          });

          _load_queue.on('fileload', function(e) {

          });

          _load_queue.on('complete', function(e) {
            console.log("All images preloaded");
            //setInterval(function() { view.next(); }, 500);
          },
          this);

          _load_queue.loadManifest(_load_manifest);

          // keep a reference to the queue
          // to be able to ask it later for medias that have been preloaded
          this.loadQueue = _load_queue;

          console.groupEnd();

        }

    }),

    init = function(model) {

      module.collection = new DiscoveryCollection();
      
      if(model instanceof DiscoveryModel) {

        // first discovery model is added to collection
        module.collection.add(model);

        // Discovery View
        module.discoveryView = new DiscoveryView( { el: "#discovery", model: model, collection: module.collection });

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
        type: model.get('type') || '',
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
          type: model.get('type') || '',
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