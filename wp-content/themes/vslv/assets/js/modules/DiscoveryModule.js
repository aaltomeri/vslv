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
        
      },

      setCurrentMedia: function(index) {



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

          // there are medias we can work with
          if(this.model.get('medias') && this.model.get('medias').length !== 0) {

            this.renderFirstMedia();

          }
          else {

            // wait until medias have been set
            // and hope there is at least one media to be displayed
            this.model.on('change:medias', function() {

                this.renderFirstMedia();

            },
            this);
            
          }


          this.collection.on('Discovery:set', function() {

            this.renderFirstMedia();

          },
          this);


        },

        next: function() {

          this.currentMedia = this.getNextMedia();

          if(this.currentMedia) {
            this.render();
          }


        },

        /**
         * Should implement the transition between one media to the next
         * simply displaying the first media if none is displayed yet
         * switching to next model in collection when all medias have been displayed
         */
        render: function() {

          console.group('render Discovery Media');

          if(this.currentMedia === null) {
            console.warn('TRYING TO RENDER DISCOVERY VIEW BUT NO CURRENT MEDIA HAS BEEN SET');
            return;
          }

          // is it an image?
          if(this.currentMedia.attachment_meta.sizes !== undefined) {

            this.renderImage(this.currentMedia);

          }
          // if not we will be expecting a Video
          else if (this.currentMedia.attachment_meta.mime_type.match(/video/)) {

            this.renderVideo(this.currentMedia);

          }
          // nothing else
          else {
            throw new Error("Current Media Type not supported: " + this.currentMedia.attachment_meta.mime_type);
          }

        },

        renderImage: function(mediaObject) {

          var mediaElement;

          console.log('img: ', mediaObject.source);

          // has it been preloaded yet?
          // we check if a result is returned from the loadQueue for this media
          // we are expecting an HTML Image
          if(this.loadQueue !== null && this.loadQueue.getResult(mediaObject.slug) instanceof HTMLImageElement) { // yep

            mediaElement = this.currentMedia.element = this.loadQueue.getResult(mediaObject.slug);
            this.drawMediaOnCanvas(mediaElement, this.c);
            
          }
          else { // nope

            var _load_queue = new createjs.LoadQueue();

            _load_queue.loadFile({ id: mediaObject.slug, src: this.model.getMediaSource(mediaObject)});

            _load_queue.on('fileload', function(e) {

              console.log('fileload: ', e.item.tag);
              
              mediaElement = this.currentMedia.element = e.item.tag;
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
                mediaElement = this.currentMedia.element = $('<video></video>').attr('src', mediaObject.source).get(0);
            
            mediaElement.addEventListener('loadeddata', function() {
              console.log(view);
              view.drawMediaOnCanvas(mediaElement, view.c);
            });

        },

        drawMediaOnCanvas: function(mediaElement, canvasElement) {

          var m = mediaElement,
              c = canvasElement,
              ctx = c.getContext('2d'),
              sw = mediaElement instanceof HTMLVideoElement? mediaElement.videoWidth : mediaElement.width,
              sh = mediaElement instanceof HTMLVideoElement? mediaElement.videoHeight : mediaElement.height;

          c.width = c.width;
          ctx.drawImage(mediaElement, 0, 0, sw, sh, 0, 0, this.w, this.h);

        },

        getMediaAt: function(index) {

          if(!this.model.get('medias') || this.model.get('medias').length === 0) {

            throw new Error('There is no media for this Discovery');

          }

          if(index > this.model.get('medias').length-1) {
            throw new Error('There is no media at index ' + index);
          }

          return this.model.get('medias')[index];

        },

        getNextMedia: function() {

          if(!this.model.get('medias') || this.model.get('medias').length === 0) {

            throw new Error('There is no media for this Discovery');

          }

          this.currentMediaIndex++;

          if(this.currentMediaIndex > this.model.get('medias').length-1) {

            this.model = this.collection.next();
            this.currentMediaIndex = 0;

          }

          return this.setCurrentMedia();

        },

        getRandomMedia: function() {

          var rdm;

          if(!this.model.get('medias') || this.model.get('medias').length === 0) {

            throw new Error('There is no media for this Discovery');

          }

          rdm = Math.floor(Math.random()*this.model.get('medias').length);

          return this.model.get('medias')[rdm];

        },


        setCurrentMedia: function(index) {

          if(!index) {
            this.currentMedia = this.getMediaAt(this.currentMediaIndex);
          }
          else {
            this.currentMedia = this.getMediaAt(index);
            this.currentMediaIndex = index;
          }

          return this.currentMedia;

        },

        renderFirstMedia: function() {

          this.currentMedia = this.getMediaAt(0);

          if(this.currentMedia === null) {
            throw new Error('No first media found. Can not render.');
          }

          if(this.currentMedia !== null) {

            this.render();

          }

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