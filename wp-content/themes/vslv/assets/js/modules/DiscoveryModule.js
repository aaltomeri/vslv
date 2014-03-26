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

            Backbone.history.navigate(route + '/' + slug + '/' + (this.currentMediaIndex+1) + window.location.search);

            // reset menu
            VSLV_APP.router.activateMenuItem(null);

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

        var index = this.currentMediaIndex + 1;

        if(index > this.get('medias').length-1) {

          return false;

        }

        return this.getMediaAt(index);

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

        var size = (window.innerWidth < VSLV_CONFIG.discovery_wp_image_small_size_breakpoint? VSLV_CONFIG.discovery_wp_image_small_size : VSLV_CONFIG.discovery_wp_image_size) || null,
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

        pointer_x: null,
        pointer_y: null,
        pointer_radius: 100,

        rendering: false,

        started: false,
        showLayerForFirstMedia: true,

        $preloader: null,

        _skipVideo: false,

        events: {
          'click': 'onClickHandler',
          'touchstart': 'onClickHandler',
          // 'mousedown': 'onMousedownHandler',
          // 'touchstart': 'onMousedownHandler',
          // 'mouseup': 'onMouseupHandler',
          // 'touchend': 'onMouseupHandler'
        },

        onClickHandler: function(e) {

          var event_type = e.type;

          // some devices react to both click and touchstart
          // we only want to act on one of them
          if(Modernizr.touch && event_type === 'click') {
            return;
          }

          // get mouse coordinates
          // using screenX as we want to account for the #discovery container offsetScrolls needed for centering
          var view = this,
              pointer_x = e.clientX || e.originalEvent.touches[0].clientX || e.originalEvent.pageX,
              pointer_y = e.clientY || e.originalEvent.touches[0].clientY || e.originalEvent.pageY;

          // account for main canvas parent div having been scrolled to center it
          pointer_x += this.el.scrollLeft;
          pointer_y += this.el.scrollTop;

          // store mouse coordinates
          this.pointer_x = pointer_x;
          this.pointer_y = pointer_y;

          this.next();

        },

        onMousedownHandler: function(e) {

          var view = this,
              pointer_x = e.clientX || e.originalEvent.touches[0].clientX || e.originalEvent.pageX,
              pointer_y = e.clientY || e.originalEvent.touches[0].clientY || e.originalEvent.pageY,
              pointer_radius = this.pointer_radius,
              c = this.c;

          // account for main canvas parent div having been scrolled to center it
          pointer_x += view.el.scrollLeft;
          pointer_y += view.el.scrollTop;

          // store mouse coordinates
          this.pointer_x = pointer_x;
          this.pointer_y = pointer_y;

          var mediaObject = this.model.getNextMedia(),
              mediaElement;

          if(this.loadQueue !== null && this.loadQueue.getResult(mediaObject.slug) instanceof HTMLImageElement) {

            mediaElement = this.loadQueue.getResult(mediaObject.slug);
            this.gradient_draw(mediaElement, pointer_x, pointer_y, pointer_radius, c);

            /**
             * on mouse or touch move behaviour
             * 
             */
            this.$el.on("mousemove touchmove", function(e) {
              
                var pointer_x = e.clientX || e.originalEvent.touches[0].clientX || e.originalEvent.pageX,
                    pointer_y = e.clientY || e.originalEvent.touches[0].clientY || e.originalEvent.pageY;

                // prevent native behaviour on some devices
                // like cancelling custom touch events on Chrome for Android
                e.preventDefault();

                // account for main canvas parent div having been scrolled to center it
                pointer_x += view.el.scrollLeft;
                pointer_y += view.el.scrollTop;

                // record coordinates
                // they will be used on release
                view.pointer_x = pointer_x;
                view.pointer_y = pointer_y;

                view.gradient_draw(mediaElement, pointer_x, pointer_y, pointer_radius, c);
            
            });
            
          }



        },

        onMouseupHandler: function(e) {

          this.$el.off('mousemove');
          this.$el.off('touchmove');

          var view = this,
              pointer_x = e.clientX || e.originalEvent.touches[0].clientX || e.originalEvent.pageX,
              pointer_y = e.clientY || e.originalEvent.touches[0].clientY || e.originalEvent.pageY;

          // account for main canvas parent div having been scrolled to center it
          pointer_x += this.el.scrollLeft;
          pointer_y += this.el.scrollTop;

          // store mouse coordinates
          this.pointer_x = pointer_x;
          this.pointer_y = pointer_y;

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

          // As we are changing model
          this.listenTo(this.collection, 'Discovery:set', function(model) {

            // reset
            this.stopListening(this.model);

            // change model
            this.model = model;

            // not for first Discovery
            // at startup
            if(this.collection.indexOf(model) === 0 && !this.started) {

              this.showLayerForFirstMedia = false;
              this.started = true;

            }
            else {

              // prepare to show layer again
              this.showLayerForFirstMedia = true;

            }

            // make view listen to model
            this.listenTo(this.model, 'Discovery:setCurrentMedia', function(mediaObject) {

              this.render();

              // proxy for use outside of module
              this.trigger('Discovery:setCurrentMedia');

            });

            this.model.setCurrentMedia(this.collection.currentModel.currentMediaIndex);

            this.listenToOnce(this, 'DiscoveryView:end_render', function() {
              this.trigger('DiscoveryView:setAndRenderEnded', this.model);
            });

            // quick fix for Discovery with no media
            // should not happen
            // but in case it does we trigger this event to notify the app to proceed
            // we should probably set a fallback image though
            if(this.model.get('medias') === undefined || (this.model.get('medias') && this.model.get('medias').length === 0)) {
              this.trigger('DiscoveryView:setAndRenderEnded', this.model);
            }

          });


        },

        disable: function() {

          this.undelegateEvents();

        },

        eable: function() {

          this.delegateEvents();

        },

        next: function() {

          // prevent switching to next media
          // if we are in the middle of rendering
          // we mainly want to prevent multiple clicks to trigger too many transitions too fast
          if(this.rendering) {
            return;
          }

          console.log('NEXT');

          // setting the next media on the current model
          // will trigger render
          if(!this.model.setNextMedia()) {

            // if there are no next media for the current model
            // we pass to the next Discovery which will in turn trigger the render mechanism
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

            // hide video controls
            this.hideVideoControls();
            // unbind video specific events events
            this.unbindVideoControlsEvents();

            // always remove video layer if it's present
            if(this.$el.find('video').length) {

              // remove video
              this.$el.find('video').remove();

              // rebind Discovery process events
              this.delegateEvents();

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

          $(window).off('resize', this.windowResizeHandlerForImage);

          // has it been preloaded yet?
          // we check if a result is returned from the loadQueue for this media
          // we are expecting an HTML Image
          if(this.loadQueue !== null && this.loadQueue.getResult(mediaObject.slug) instanceof HTMLImageElement) { // yep

            //window.addEventListener('resize', function() { console.log('resize'); });

            mediaElement = this.loadQueue.getResult(mediaObject.slug);

            // operations on mediaElement before we draw it on the canvas
            mediaElement = this.transformMediaElement(mediaElement);

            this.drawMediaOnCanvasAnimate(mediaElement, this.c);

            $(window).on('resize', { view: view, mediaElement: mediaElement}, this.windowResizeHandlerForImage);
            
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

              // operations on mediaElement before we draw it on the canvas
              mediaElement = this.transformMediaElement(mediaElement);

              this.drawMediaOnCanvasAnimate(mediaElement, this.c);
              
              // notify media has finished loading
              this.trigger('DiscoveryView:media_loaded', e.item.tag, mediaObject);

              $(window).on('resize', { view: view, mediaElement: mediaElement}, this.windowResizeHandlerForImage);

            },
            this);
            
            _load_queue.loadFile({ id: mediaObject.slug, src: this.model.getMediaSource(mediaObject)});

          }
         
          console.log('mediaElement', mediaElement);
          console.groupEnd();

        },


        windowResizeHandlerForImage: function(e) {

          var view = e.data.view,
              mediaElement = e.data.mediaElement;

          view.drawMediaOnCanvas(mediaElement, view.c);

          console.log('resize 2');

        },

        renderVideo: function(mediaObject) {

            console.log('video: ', mediaObject.source);

            var view = this,
                mediaElement = $('<video muted></video>').get(0),
                sources_html,
                source_to_draw_on_canvas;

            // reset skipVideo flag
            view._skipVideo = false;

            // stop Discovery process (clicking screen to uncover next media)
            this.undelegateEvents();

            // we don't need the hint here
            module.discoveryHintView.stop();

            console.log("MEDIA OBJECT", mediaObject);

            if(this.$el.find('video').length) {

              mediaElement = this.$el.find('video').get(0);

            }
            else {

              this.$el.append($(mediaElement));

            }
        
            // set poster for video
            // necessary as some browser/devices do not want to show first frame (chrome on Android)
            $(mediaElement).attr('poster', mediaObject.poster);

            /*
              On certain devices - namely iPhone - actual video preloading does not start unless the user press the play button
              we thus need to act on the loadstart event if we want to do anything
              as loadeddata event is only triggered when some data has been preloaded
             */
            $(mediaElement).one('loadstart', function() {
              
              console.log('LOADSTART');
              
              view.setVideoDimensions(mediaElement);

              // for iOS and Android
              // draw poster image on the canvas
              if((device.ios() || device.android()) && mediaObject.poster) {

                source_to_draw_on_canvas = new Image();
                source_to_draw_on_canvas.src = mediaObject.poster;
                source_to_draw_on_canvas.addEventListener('load', function() {
                  source_to_draw_on_canvas = view.transformMediaElement(source_to_draw_on_canvas);
                  view.drawMediaOnCanvasAnimate(source_to_draw_on_canvas, view.c);
                });

              }

              // for everyone

              // HIDE VIDEO
              // showing canvas with first frame or poster drawn onto it
              // 
              // this is done here, as the video element has been setup, 
              // because if we hide 'too soon', i.e. before or just after sources have been set
              // the video can be considered has 'hidden', i.e. absent from the DOM
              // and thus not load (as video hidden in the DOM do not start loading )
              $(mediaElement).hide();

              // SHOW VIDEO CONTROLS
              view.showVideoControls();

              // VIDEO CONTROLS INIT
              view.initVideoControls();

              // notify media has finished loading
              view.trigger('DiscoveryView:media_loaded', mediaElement, mediaObject);

            });


            // as data is available
            $(mediaElement).one('loadeddata', function() {

              console.log('LOADEDDATA');

              // draw first frame on canvas
              // but not on iOS or Android 
              // as it is not possible (iOS) or first frame migh be missing (Android chrome 32)
              // for these 2 oss we have drawn the poster image in the loadstart handler
              if(!device.ios() && !device.android()) {

                source_to_draw_on_canvas = view.transformMediaElement(mediaElement);
                view.drawMediaOnCanvasAnimate(source_to_draw_on_canvas, view.c);
                
                $(window).off('resize', view.windowResizeHandlerForVideo);
                //$(window).on('resize', { view: view, mediaElement: mediaElement}, view.windowResizeHandlerForVideo);

              }

              // unbind all normal events for this view
              // !!!!!!!!! this should not be here as it is already has been done in loadstart handler
              // but for some reason and ** only when video is first media in project ** it does not work in loadstart handler
              // view.undelegateEvents();


            });


            // AT THE END OF THE VIDEO
            $(mediaElement).on('ended', function() {

              console.log('VIDEO ENDED');

              if(device.iphone()) {

                view.skipVideo();

              }

            });

            // show video at the end of the transition
            this.listenToOnce(this, 'DiscoveryView:end_render', function() {

              console.log('TRANSITION END');

              if(!device.android()) {

                //$(mediaElement).show();

              }

              $(mediaElement).one('playing', function() {

                console.log('PLAYING');

                $(mediaElement).show();

              });

            });

            // set SOURCES
            // make sure this is done before hiding the video
            // otherwise loading is not started
            sources_html = mediaObject.video_formats_tags.join('\n');
            $(mediaElement).html(sources_html);
            
            // hide video to be able to see canvas 
            // and the gradient effect
            // everything else is done in the loadeddata handler
            if(!device.ios()) { // but not on iOS as it can not draw video frame on canvas

              //$(mediaElement).hide();

            }

        },

         windowResizeHandlerForVideo: function(e) {

          var view = e.data.view,
              mediaElement = e.data.mediaElement;

          view.drawMediaOnCanvas(mediaElement, view.c);
          view.setVideoDimensions(mediaElement);

        },

        initVideoControls: function() {

          var view = this,
              $video = this.$('video'),
              video = $video.get(0),
              $bwd = this.$('.control-bwd'),
              $fwd = this.$('.control-fwd'),
              $play = this.$('.control-play'),
              $sound = this.$('.control-sound'),
              $controls = this.$('.controls');


          // INIT
          
          // always show play button ready to play
          var play_src = $play.find('img').get(0).src,
              play_new_src = play_src.replace('-pause', '-play');

          $play.find('img').get(0).src = play_new_src;

          /** EVENTS **/

          // play
          $video.on('playing', function() {

            var src = $play.find('img').get(0).src,
                new_src = src.replace('-play', '-pause');

            $play.find('img').get(0).src = new_src;

            if(device.iphone()) {
              $video.show();
            }

          });

          // pause
          $video.on('pause', function() {

            var src = $play.find('img').get(0).src,
                new_src = src.replace('-pause', '-play');

            $play.find('img').get(0).src = new_src;

            // as we pause the video on iphone
            // we want to hide it (this happens when going back from fullscreen)
            // because we need to access the custom controls we setup
            // which is not possible whatever z-index the video has
            // hiding the video and reshowing on play seem to do the trick ...
            if(device.iphone()) {
              $video.hide();
            }

          });

          // volume change
          $video.on('volumechange', function() {

            var src = $sound.find('img').get(0).src,
                new_src;

            if(video.muted) {

              new_src = src.replace('-on', '-off');
              $sound.find('img').get(0).src = new_src;

            }
            else {

              new_src = src.replace('-off', '-on');
              $sound.find('img').get(0).src = new_src;

            }


          });

          // unmute by default
          // note: the video has been muted in its markup for ios compliance
          video.muted = false;

          /** BUTTONS ACTIONS **/

          // PLAY / PAUSE
          $play.on('click touchstart', function (e) {

              e.stopPropagation();

              if(video.paused) {
                video.play();
              }
              else {
                video.pause();
              }

          });

          // SOUND
          $sound.on('click touchstart', function () {

              if(video.muted) {
                video.muted = false;
              }
              else {
                video.muted = true;
              }


          });

          $bwd.on('click touchstart', function() {

            video.currentTime = 0;

          });

          $fwd.on('click touchstart', function() {

            console.log('FWD');
            view.skipVideo();

          });

        },

        unbindVideoControlsEvents: function() {


         var $video = this.$('video'),
            video = $video.get(0),
            $bwd = this.$('.control-bwd'),
            $fwd = this.$('.control-fwd'),
            $play = this.$('.control-play'),
            $sound = this.$('.control-sound');


          $video.off();
          $bwd.off();
          $fwd.off();
          $play.off();
          $sound.off();

        },

        skipVideo: function() {

          $('video').get(0).pause();
          
          // notify we have finished to render
          this.trigger('DiscoveryView:end_render');

          // draw current frame on canvas
          if(!device.android() && !device.ios()) { // but not for those who behave badly
            
            console.log('DRAW LAST FRAME');
            this.drawMediaOnCanvas($('video').get(0), this.c);
            this.$c.show();

          }

          $('video').remove();

          module.discoveryHintView.start(APP_DATA.discovery_hint_message);

          // rebind all events
          this.delegateEvents();

          this.next();

        },

        setVideoDimensions: function(videoElement) {

          var master_dimension = this.c.width > this.c.height? 'width':'height',
              other_dimension = (master_dimension === 'width')? 'height' : 'width',
              md_value = this.c[master_dimension] / window.devicePixelRatio,
              od_value = 'auto';

          // changes based on devices
          if(device.ios()) {

            od_value = '100%';
            $(videoElement).css('top', this.el.scrollTop);

          }

          $(videoElement)[master_dimension](md_value);
          $(videoElement).css(other_dimension, od_value);

          return videoElement;

        },

        showVideoControls: function() {

            $('.video-controls-wrapper').show();

        },

        hideVideoControls: function() {

            $('.video-controls-wrapper').hide();

        },

         /**
         * HELPERS
         */

        transformMediaElement: function(mediaElement) {

            var transformedMediaElement;

            if(this.collection.currentModel.currentMediaIndex === 0 && this.showLayerForFirstMedia) {

              // add layer on top of image to be discovered
              transformedMediaElement = this.getMediaElementWithLayer(mediaElement, "#000000", VSLV_CONFIG.first_media_layer_opacity);

              // we want to show the first media again without the layer
              // unless mediaElement is a Video
              if(!(mediaElement instanceof HTMLVideoElement)) {

                this.collection.currentModel.currentMediaIndex = -1;

              }

              this.showLayerForFirstMedia = false;

              return transformedMediaElement;

            }

            return mediaElement;

        },

        /**
         * Transforms original MediaElement by adding a layer on top of it
         * @param  HTMLImageElement or HTMLVideoElement mediaElement 
         * @param  Hex Value color        the html color
         * @param  float alpha        the alpha setting
         * @return HTMLCanvasElement
         */
        getMediaElementWithLayer: function(mediaElement, color, alpha) {

             var c1 = document.createElement('canvas'),
                ctx1 = c1.getContext('2d'),
                c2 = document.createElement('canvas'),
                ctx2 = c2.getContext('2d'),
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

              // set temp canvas to our main canvas size
              c1.width = c2.width = dw;
              c1.height = c2.height = dh;

              // set opacity for the layer
              ctx2.globalAlpha = alpha;

              // draw mediaElement on first temp canvas
              this.drawMediaOnCanvas(mediaElement, c1);

              // create layer
              ctx2.fillStyle = color;
              ctx2.fillRect(0, 0, c2.width, c2.height);

              // draw it on the mediaElement
              ctx1.drawImage(c2, 0, 0);

              return c1;

        },

        centerContentInViewPort: function() {

          var w = $(this.c).width(),
              h = $(this.c).height();

          this.$el.scrollLeft(Math.round((w - this.$el.width())/2));
          this.$el.scrollTop(Math.round((h - this.$el.height())/2));

        },

        /**
         * manipulate canvas to accout for hi DPI screens
         * @see http://www.html5rocks.com/en/tutorials/canvas/hidpi
         */
        adaptCanvasToHiDPIScreen: function(canvasElement, bypass) {

          var c = canvasElement,
              ctx = c.getContext('2d'),
              devicePixelRatio = window.devicePixelRatio,
              backingStoreRatio = this.getBackingStoreRatio(ctx),
              ratio = this.getDevicePixelBackingStoreRatio(ctx),
              _bypass = bypass || false;

          // upscale the canvas if the two ratios don't match
          if (devicePixelRatio !== backingStoreRatio && !_bypass) {

              var oldWidth = c.width;
              var oldHeight = c.height;

              c.width = oldWidth * ratio;
              c.height = oldHeight * ratio;


              c.style.width = oldWidth + 'px';
              c.style.height = oldHeight + 'px';

              // now scale the context to counter
              // the fact that we've manually scaled
              // our canvas element
              ctx.scale(ratio, ratio);

          }

        },

        getBackingStoreRatio: function(ctx) {

          var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                                  ctx.mozBackingStorePixelRatio ||
                                  ctx.msBackingStorePixelRatio ||
                                  ctx.oBackingStorePixelRatio ||
                                  ctx.backingStorePixelRatio || 1;


          return backingStoreRatio;

        },

        getDevicePixelBackingStoreRatio: function(ctx) {

          var devicePixelRatio = window.devicePixelRatio || 1,
              backingStoreRatio = this.getBackingStoreRatio(ctx),
              ratio = devicePixelRatio / backingStoreRatio;
          
          return ratio;

        },

        /**
         * set $el bg image and hide canvas
         * NOTE: deprecated
         */
        replaceCanvasWithBgImage: function(mediaElement, canvasElement) {

          if(mediaElement instanceof HTMLImageElement) {

            this.$el.css({"background-image": 'url(' + mediaElement.src + ')'});
            $(canvasElement).transit({opacity:0});

          }

        },


        /**
         * DRAWING METHODS
         */

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
              dw = Math.round(sw*scale),
              dh = Math.round(sh*scale);
              
          // reset canvas
          c.width = c.width;

          // size canvas with scaled dimensions
          c.width = dw;
          c.height = dh;

          // hi DPI stuff
          this.adaptCanvasToHiDPIScreen(c);

          // draw image on canvas
          ctx.drawImage(mediaElement, 0, 0, sw, sh, 0, 0, dw, dh);
          
          // center in viewport
          this.centerContentInViewPort();

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
              radius = view.pointer_radius,
              _step = 40,
              $this = $(this),

              // get scale factors for both dimensions from the viewport and media dimensions
              scale_h = this.$el.width() / sw,
              scale_v = this.$el.height() / sh,
              
              // choose the biggest to keep proportions
              scale = scale_h > scale_v ? scale_h : scale_v,
              
              // set the scaled destination dimensions for the drawImage call
              // using he chosen scale factor
              dw = Math.round(sw*scale),
              dh = Math.round(sh*scale),

              // coordinates have been stored in onClickHandler
              // pick a random point if mouse coordinates have not been set yet (at site init for instance)
              pointer_x = this.pointer_x? this.pointer_x : Math.random()*dw,
              pointer_y = this.pointer_y? this.pointer_y : Math.random()*dh;
          
          // copy canvas in its current state
          // before it's wiped clean by setting its w & h
          // we will draw it back onto itself just after so that we avoid a white flash
          var $tmp_c = $(c).clone(),
          tmp_c = $tmp_c.get(0),
          tmp_ctx = tmp_c.getContext('2d');
          tmp_c.width = c.width;
          tmp_c.height = c.height;
          tmp_ctx.drawImage(c, 0, 0);
          //this.$el.append($tmp_c);

          // size main canvas with scaled dimensions
          c.width = dw;
          c.height = dh;
          
          // all canvases take main canvas size
          c2.width = c3.width = c.width;
          c2.height = c3.height = c.height;

          // hi DPI stuff
          this.adaptCanvasToHiDPIScreen(c, true);
          this.adaptCanvasToHiDPIScreen(c2, true);
          this.adaptCanvasToHiDPIScreen(c3, true);

          // avoid white flash by copying buffered canvas onto itself
          ctx.drawImage(tmp_c, 0, 0, tmp_c.width, tmp_c.height, 0, 0, dw, dh);

          // center in viewport
          this.centerContentInViewPort();

          // set temp canvas context globalCompositeOperation to 'destination-atop' here as the context has been reset
          // by setting the canvas dimensions
          this.ctx2.globalCompositeOperation = "destination-atop";

          var _now, _then, _draw_time;

          function draw_next(timestamp) {

            var __step = _step;

            // console.time('Draw');

            _now = timestamp;

            if(_then) {
              _draw_time = _now - _then;
              // console.log('_draw_time: ', _draw_time);
            }

            if(_draw_time) {
              __step = _step * Math.round(_draw_time)/48;
            }

            // console.log('__step: ', __step);

            radius += __step;

            view.gradient_draw(mediaElement, pointer_x, pointer_y, radius, canvasElement);

            _then = timestamp;

            // console.timeEnd('Draw');

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

              console.log('end of gradient rendering');

              // notify we have finished tthe transition effect
              view.trigger('DiscoveryView:end_transition');

            }

             

          }

          requestAnimationFrame(draw_next);

        },

        /**
         * the draw function
         * will make a shape grow
         * composite it with the new mediaElement
         * and draw the result onto the previous media
         * @return void
         */
        gradient_draw: function(mediaElement, x, y, radius, canvasElement) {

          var view = this,
              m = mediaElement,
              c = canvasElement? canvasElement : this.c,
              ctx = c.getContext("2d"),
              c2 = this.c2,
              ctx2 = this.ctx2,
              c3 = this.c3,
              ctx3 = this.ctx3,
              sw = mediaElement instanceof HTMLVideoElement ? mediaElement.videoWidth : mediaElement.width,
              sh = mediaElement instanceof HTMLVideoElement ? mediaElement.videoHeight : mediaElement.height,
              _grd_x = 0,
              _grd_y = 0,
              $this = $(this),

              // get scale factors for both dimensions from the viewport and media dimensions
              scale_h = this.$el.width() / sw,
              scale_v = this.$el.height() / sh,
              
              // choose the biggest to keep proportions
              scale = scale_h > scale_v ? scale_h : scale_v,
              
              // set the scaled destination dimensions for the drawImage call
              // using he chosen scale factor
              dw = Math.round(sw*scale),
              dh = Math.round(sh*scale),
              dp_bs_ratio = 1;//this.getDevicePixelBackingStoreRatio(ctx);

          // reset shape canvas
          c3.width = c3.width;

          //draw element on temp canvas
          ctx2.drawImage(mediaElement, 0, 0, sw, sh, 0, 0, dw, dh);

          // DEBUG
          // this.$el.append($(c2));
          // $(this.c).hide();
          // radius = 800;

          // make shape - gradient
          var grd = ctx3.createRadialGradient(x, y, 0, x, y, radius);
          grd.addColorStop(0, "rgba(255,255,255,0.7)");
          grd.addColorStop(1, "transparent");
          ctx3.fillStyle = grd;
          ctx3.beginPath();
          ctx3.arc(x, y, radius, 0,Math.PI*2,true);
          ctx3.fill();
          ctx3.closePath();
          
          // draw shape on element canvas
          ctx2.drawImage(c3, 0, 0, c2.width, c2.height, 0, 0, c2.width/dp_bs_ratio, c2.height/dp_bs_ratio);
          
          // draw temp media element canvas with shape on main canvas
          ctx.drawImage(c2, 0, 0, c2.width, c2.height, 0, 0, c.width/dp_bs_ratio, c.height/dp_bs_ratio);
          

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
      hideDelayTimeout: null,

      initialize: function() {

        this.listenTo(module.discoveryView, 'DiscoveryView:start_render', function() {

          // console.log('STOP hint display in start_render handler');

          // stop hint display
          this.stop();


        });

        this.listenTo(module.discoveryView, 'DiscoveryView:end_render', function() {

          // console.log('START hint display in end_render handler');

          // start hint display
          //this.start();

        });


      },

      start: function(msg) {

        var view = this;

        if(typeof msg === 'string') {
          this.$el.html(msg);
        }

        if(this.started) {
          return;
        }

        // console.log('DiscoveryHintView', 'START', 'is started:', this.started); 

        this.setPosition();
        this.show();

        this.started = true;

      },

      stop: function() {

        // console.log('DiscoveryHintView', 'STOP', 'is started:', this.started);

        if(!this.started) {
          return;
        }

        this.started = false;

        this.hide();

      },

      show: function() {

        var view = this;

        //console.group('DiscoveryHintView SHOW');

        // console.log('DiscoveryHintView', 'SHOW');

        clearTimeout(view.hideDelayTimeout);

        this.$el.transition({
          opacity: 1,
          duration: VSLV_CONFIG.discovery_hint_show_duration
        }, function() {
          if(view.started) {

            // console.log('DiscoveryHintView', 'END OF SHOW');

            view.hideDelayTimeout = setTimeout(function() {

                view.hide();

              },
              VSLV_CONFIG.discovery_hint_interval
            );

          }
        });

      },

      hide: function() {

        var view = this;
        
        // console.log('DiscoveryHintView', 'HIDE');

        clearTimeout(view.hideDelayTimeout);

        this.$el.transitionStop();

        this.$el.transition({
          opacity: 0,
          duration: VSLV_CONFIG.discovery_hint_hide_duration
        }, function() {

          // console.log('DiscoveryHintView', 'HIDDEN');

          if(view.started) {
            view.setPosition().show();
          }

        });

      },

      setPosition: function() {

        var $parent = this.$el.parent(),
            pw = $parent.width(),
            ph = $parent.height(),
            w = this.$el.width(),
            h = this.$el.height(),
            // set x & y - account for the fact that the paret container might have been scrolled to center the media
            // and we also don't want the hint to appear beneath the menu even if it's collapsed
            x_min = $parent.scrollLeft() + 20,
            x_max = pw+$parent.scrollLeft() - w,
            x_range = x_max - x_min,
            y_min = $parent.scrollTop() + $('header').outerHeight() + h,
            y_max = ph + $parent.scrollTop() - $('header').outerHeight() - h,
            y_range = y_max - y_min,
            x = Math.min(Math.max((Math.random()*x_range)+x_min, x_min), x_max),
            y = Math.min(Math.max((Math.random()*y_range)+y_min, y_min), y_max);

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
        client: model.get('client') || {},
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
          client: model.get('client') || {},
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