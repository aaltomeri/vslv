 var DISCOVERY_MODULE = (function() {

  var module = _.extend({

      collection: null,
      discoveryView: null,
      discoveryHintView: null,

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
          //console.log(error.message, this);
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

        mouseX: null,
        mouseY: null,

        rendering: false,

        $preloader: null,

        events: {
          'click': 'onClickhandler'
        },

        onClickhandler: function(e) {

          // get mouse coordinates
          // using screenX as we want to account for the #discovery container offsetScrolls needed for centering
          this.mouseX = e.screenX;
          this.mouseY = e.screenY;

          this.next();

        },

        initialize: function() {

          this.w   = this.$el.width();
          this.h   = this.$el.height();

          this.$c  = $('<canvas></canvas>').attr('width',this.w).attr('height',this.h);
          this.c   = this.$c.get(0);
          this.ctx = this.c.getContext('2d');

          this.$c2 = $('<canvas></canvas>').attr('width',this.w).attr('height',this.h);
          this.c2  = this.$c2.get(0);
          this.ctx2 = this.c2.getContext('2d');
          
          this.$c3 = $('<canvas></canvas>').attr('width',this.w).attr('height',this.h);
          this.c3  = this.$c3.get(0);
          this.ctx3 = this.c3.getContext('2d');

          // append first canvas
          this.$el.append(this.$c);

          // assign dom element to view var
          this.$preloader = this.$('.preloader');

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

              // proxy for use outside of module
              this.trigger('Discovery:setCurrentMedia');

            });

            this.model.setCurrentMedia(this.collection.currentModel.currentMediaIndex);

            this.listenToOnce(this, 'DiscoveryView:end_render', function() {
              this.collection.trigger('Discovery:setAndRenderEnded', this.collection.currentModel);
            });

          });


        },

        next: function() {

          // prevent switching to next media
          // if we are in the middle of rendering
          // we mainly want to prevent multiple clicks to trigger too many transitions too fast
          if(this.rendering) {
            return;
          }

          console.log('NEXT');

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

          // notify we're beginning to render
          this.rendering = true;
          this.trigger('DiscoveryView:start_render');
          this.listenToOnce(this, 'DiscoveryView:end_render',function() {

            this.rendering = false;

          });

          // we want to notify when the transition has ended
          // this is the end of render for us
          this.listenToOnce(this, 'DiscoveryView:end_transition', function() {

              this.trigger('DiscoveryView:end_render');

          });

          // is it an image?
          if(cm.is_image) {

            // always remove video layer if it's present
            if(this.$el.find('video').length) {
              this.$el.find('video').remove();
            }

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
            this.drawMediaOnCanvasAnimate(mediaElement, this.c);
            
          }
          else { // nope

            var _load_queue = new createjs.LoadQueue();

            console.log("LOAD MEDIA NOT ALREADY LOADED BY MAIN QUEUE", mediaObject.slug);

            // progress
            _load_queue.on('fileprogress', function(e) {

              //console.log(e.progress);
              this.$preloader.css({scale: [e.progress, 1]});
              if(e.progress === 1) {
                console.log('END PROGRESS');
                console.time('DELAY PROGRESS<->FILELOAD');
              }

            },
            this);

            // complete
            _load_queue.on('fileload', function(e) {

              console.log('fileload: ', e.item.tag);
              console.timeEnd('DELAY PROGRESS<->FILELOAD');

              // reset preloader
              this.$preloader.css({scale: [0, 1]});

              mediaElement = e.item.tag;
              this.drawMediaOnCanvasAnimate(mediaElement, this.c);
              
              // notify appplication media has finished loading
              this.trigger('DiscoveryView:media_loaded', mediaElement, mediaObject);

            },
            this);
            
            _load_queue.loadFile({ id: mediaObject.slug, src: this.model.getMediaSource(mediaObject)});

          }

          $(window).off('resize');
          $(window).on('resize', function() {
            view.drawMediaOnCanvas(mediaElement, view.c);
          });

          console.groupEnd();

        },

        renderVideo: function(mediaObject) {

            console.log('video: ', mediaObject.source);

            // this is temporary and should be converted into a method
            // that will properly create a video element and set the correct source
            // depending on browser
            var view = this,
                mediaElement = $('<video muted></video>').attr('src', mediaObject.source).get(0);
            
            if(this.$el.find('video').length) {

              this.$el.find('video').attr('src', mediaObject.source);
              mediaElement = this.$el.find('video').get(0);

            }
            else {

              this.$el.append($(mediaElement));

            }

            // hide video to be able to see canvas 
            // and the gradient effect
            $(mediaElement).hide();

            $(mediaElement).on('loadeddata', function() {

              console.log('VIDEO DATA LOADED');

              view.setVideoDimensions(mediaElement);

              //module.discoveryHintView.start(APP_DATA.discovery_hint_video_message);

              // show video at the end of the transition
              view.listenToOnce(view, 'DiscoveryView:end_render', function() {
                console.log('SHOW VIDEO');
                $(mediaElement).show();
              });

              view.drawMediaOnCanvasAnimate(mediaElement, view.c);

              $(window).off('resize');
              $(window).on('resize', function() {
                view.drawMediaOnCanvas(mediaElement, view.c);
                view.setVideoDimensions(mediaElement);
              });

              //view.$c.hide();

              // unbind all normal events for this view
              view.undelegateEvents();

              // make video play on click
              view.$el.on('click', function(e) {

                e.stopPropagation();
                mediaElement.play();
                module.discoveryHintView.stop();

              });

            });

             $(mediaElement).on('ended', function() {

              console.log('VIDEO ENDED');

              view.drawMediaOnCanvas(mediaElement, view.c);
              view.$c.show();
              view.$el.off('click');

              // rebind all events
              view.delegateEvents();
              
              $(mediaElement).remove();
              module.discoveryHintView.start(APP_DATA.discovery_hint_message);

              // notify we have finished to render
              view.trigger('DiscoveryView:end_render');

            });

        },

        drawMediaOnCanvas: function(mediaElement, canvasElement) {

          var m = mediaElement,
              c = canvasElement,
              ctx = c.getContext("2d"),
              sw = mediaElement instanceof HTMLVideoElement ? mediaElement.videoWidth : mediaElement.width,
              sh = mediaElement instanceof HTMLVideoElement ? mediaElement.videoHeight : mediaElement.height,

              // get scale factors for both dimensions from the viewport and media properties
              scale_h = this.$el.width() / sw,
              scale_v = this.$el.height() / sh,
              
              // choose the biggest to keep proportions
              scale = scale_h > scale_v ? scale_h : scale_v,
              
              // set the scaled the destination dimensions for the drawImage call
              // using he chosen scale factor
              dw = sw*scale,
              dh = sh*scale;
          
          // reset canvas
          c.width = c.width;

          // size canvas with scaled dimensions
          c.width = dw;
          c.height = dh;

          // draw image on canvas
          ctx.drawImage(mediaElement, 0, 0, sw, sh, 0, 0, dw, dh);
          
          // center in viewport
          this.$el.scrollLeft((dw - this.$el.width())/2);
          this.$el.scrollTop((dh - this.$el.height())/2);

        },

        /**
         * this method implements the swiping effect where a media is gradually discovered
         * while the previous one is swept away
         * @param  HTMLImage or Video Element mediaElement
         * @param  HTMLCanvasElement canvasElement the main canvas to be drawn upon
         * @return {[type]}               [description]
         */
        drawMediaOnCanvasAnimate: function(mediaElement, canvasElement) {

          var view = this,
              m = mediaElement,
              c = canvasElement,
              ctx = c.getContext("2d"),
              c2 = this.c2,
              ctx2 = this.ctx2,
              c3 = this.c3,
              ctx3 = this.ctx3,
              sw = mediaElement instanceof HTMLVideoElement ? mediaElement.videoWidth : mediaElement.width,
              sh = mediaElement instanceof HTMLVideoElement ? mediaElement.videoHeight : mediaElement.height,
              radius = 0,
              _grd_x = 0,
              _grd_y = 0,
              _step = 80,
              $this = $(this),

              // get scale factors for both dimensions from the viewport and media dimensions
              scale_h = this.$el.width() / sw,
              scale_v = this.$el.height() / sh,
              
              // choose the biggest to keep proportions
              scale = scale_h > scale_v ? scale_h : scale_v,
              
              // set the scaled destination dimensions for the drawImage call
              // using he chosen scale factor
              dw = sw*scale,
              dh = sh*scale,

              // coordinates have been stored in onClickHandler
              // pick a random point if mouse coordinates have not been set yet (at site init for instance)
              mouse_x = this.mouseX? this.mouseX : Math.random()*dw,
              mouse_y = this.mouseY? this.mouseY : Math.random()*dh;

          // size temp canvas with scaled dimensions
          // temp canvas will be drawn onto main canvas
          c2.width = c3.width = dw;
          c2.height = c3.height = dh;

          // resize canvas only if media sizes differ
          // this will result in a 'flash' as media is wiped out
          // it is acceptable for now as we should not have media of different sizes
          if(c.width !== Math.floor(dw)) {
            c.width = Math.floor(dw);
          }
          if(c.height !== Math.floor(dh)) {
            c.height = Math.floor(dh);
          }

          // // center in viewport
          this.$el.scrollLeft((dw - this.$el.width())/2);
          this.$el.scrollTop((dh - this.$el.height())/2);

          // set temp canvas context globalCompositeOperation to 'destination-atop' here as the context has been reset
          // by setting the canvas dimensions
          this.ctx2.globalCompositeOperation = "destination-atop";

          // stop hint display
          module.discoveryHintView.stop();

          /**
           * the draw function
           * will make a shape grow
           * composite it with the new mediaElement
           * and draw the result onto the previous media
           * @return void
           */
          function draw_next() {

            radius += _step;

            _grd_x += _step;
            _grd_y += _step;

            // reset shape canvas
            c3.width = c3.width;

            //draw element on temp canvas
            ctx2.drawImage(mediaElement, 0, 0, sw, sh, 0, 0, dw, dh);

            // make shape - gradient
            var grd = ctx3.createRadialGradient(mouse_x, mouse_y, 0, mouse_x, mouse_y, radius);
            grd.addColorStop(0, "rgba(255,255,255,0.7)");
            grd.addColorStop(1, "transparent");
            ctx3.fillStyle = grd;
            ctx3.beginPath();
            ctx3.arc(mouse_x,mouse_y,radius, 0,Math.PI*2,true);
            ctx3.fill();
            ctx3.closePath();
            
            // draw shape on element canvas
            ctx2.drawImage(c3, 0, 0);
            
            // draw temp media element canvas with shape on main canvas
            ctx.drawImage(c2, 0, 0);

            // make the loop run until we consider the whole media has been discovered
            if(radius <= sw) {

              requestAnimationFrame(draw_next);

            }
            else {

              // draw image on canvas
              // to complete the loop task 
              // and make things clean
              // it will also set the main canvas size to the correct dimensions
              view.drawMediaOnCanvas(mediaElement, canvasElement);

              // start hint display
              module.discoveryHintView.start();

              // notify we have finished tthe transition effect
              view.trigger('DiscoveryView:end_transition');

            }

          }

          requestAnimationFrame(draw_next);

        },

        setVideoDimensions: function(videoElement) {

          var master_dimension = this.c.width > this.c.height? 'width':'height',
              other_dimension = (master_dimension === 'width')? 'height' : 'width',
              md_value = this.c[master_dimension];

          $(videoElement)[master_dimension](md_value);
          $(videoElement).css(other_dimension, 'auto');

          return videoElement;

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

    DiscoveryHintView = Backbone.View.extend({

      className: 'discovery-hint',

      started: false,
      discoveryHintViewTimeout: null,

      initialize: function() {},

      start: function(msg) {

        var view = this;

        if(typeof msg === 'string') {
          this.$el.html(msg);
        }

        if(this.started) {
          return;
        }

        //console.log('DiscoveryHintView', 'START', this.started);

        this.setPosition();
        this.show();

        this.started = true;

      },

      stop: function() {

        //console.log('DiscoveryHintView', 'STOP', this.started);

        if(!this.started) {
          return;
        }

        this.started = false;

        this.hide();

      },

      show: function() {

        var view = this;

        //console.group('DiscoveryHintView SHOW');

        //console.log('DiscoveryHintView', 'SHOW');

        this.$el.stop(true);

        this.$el.transition({
          opacity: 1,
          duration: VSLV_CONFIG.discovery_hint_show_duration
        }, function() {
          if(view.started) {
            //console.log('DiscoveryHintView', 'END OF SHOW');
            view.hide(VSLV_CONFIG.discovery_hint_interval);
          }
        });

      },

      hide: function(_delay) {

        var view = this;
        
        //console.log('DiscoveryHintView', 'HIDE');

        this.$el.stop(true);

        this.$el.transition({
          opacity: 0,
          delay: _delay,
          duration: VSLV_CONFIG.discovery_hint_hide_duration
        }, function() {

          //console.log('DiscoveryHintView', 'HIDDEN');

          if(view.started) {
            view.setPosition().show();
          }

          //console.groupEnd();

        });

      },

      setPosition: function() {

        var $parent = this.$el.parent(),
            pw = $parent.width(),
            ph = $parent.height(),
            w = this.$el.width(),
            h = this.$el.height(),
            // set x & y - account for the fact that the paret container might have been scrolled to center the media
            // and we also don't want the hint to appear beneath the menu even if it's collased
            x_min = $parent.scrollLeft()+w,
            x_max = pw+$parent.scrollLeft()-(w*2),
            x_range = x_max - x_min,
            y_min = $parent.scrollTop() + $('header').outerHeight()+(h*4),
            y_max = ph+$parent.scrollTop()-$('header').outerHeight()-(h*4),
            y_range = y_max - y_min,
            x = Math.min(Math.max(Math.random()*x_range, x_min), x_max),
            y = Math.min(Math.max(Math.random()*y_range, y_min), y_max);

        this.$el.css({
          top: Math.round(y),
          left: Math.round(x)
        });

        return this;

      },

      render: function() {

        var msg = APP_DATA.discovery_hint_message;

        this.$el.html(msg);

        $('#discovery').append(this.$el);

      }

    }),


    init = function(model) {

      module.collection = new DiscoveryCollection();
      
      if(model instanceof DiscoveryModel) {

        // first discovery model is added to collection
        module.collection.add(model);

        // Discovery View
        module.discoveryView = new DiscoveryView( { el: "#discovery", model: model, collection: module.collection });

        // Discovery Hint View
        module.discoveryHintView = new DiscoveryHintView();
        module.discoveryHintView.render();

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
        medias: model.get('medias') || [],
        'panel-type': model.get('panel-type')  || 'left'
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
          medias : model.get('medias') || [],
          'panel-type': model.get('panel-type')  || 'left'
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