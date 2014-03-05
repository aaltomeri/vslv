// Application 
// we pass the required modules to be used
var VSLV_APP = (function(page_module, project_module, discovery_module, app_data) {

  var Router = Backbone.Router.extend({

      previous_slug: null,

      // extend VSLV router with ability to trigger 'beforeroute' event
      // useful to perform operations before any route callback is called
      route: function(route, name, callback) {
        return Backbone.Router.prototype.route.call(this, route, name, function() {
          if (!callback) {
            callback = this[name];
          }
          this.trigger.apply(this, ['beforeroute'].concat(_.toArray(arguments)));
          callback.apply(this, arguments);
        });
      },

      routes: {

        'projects/:slug(/:media_id)': 'project',
        '': 'page',
        ':slug': 'page',
        ':category/:slug': 'page'

      },

      /**
       * single project route handler
       * should allow the display of a single project
       * meaning positionning the Discovery process at the right position
       * should also address displaying a given media for this project 
       * if a media id is passed as a second parameter
       * @param  slug 
       * @param  media_id
       * @return void
       */
      project: function(slug, mediaIndex) {

        var router = this,
            project_model = project_module.collection.findWhere({ slug: slug });
        
        console.log("project: " + slug);

        this.listenToOnce(page_module.currentPageView, 'PageView:is-hidden', function() {

          $('body').removeClass(this.previous_slug);
          $('body').addClass('project');
          router.previous_slug = 'project';

        });

        this.activateMenuItem(slug);

        if(mediaIndex === null) {
          mediaIndex = 1;
        }

        // convert to 0 based
        mediaIndex--;

        if(page_module.currentPageView.model.get('slug') === 'portfolio') {

          this.listenToOnce(project_module.portfolioView, 'PortfolioView:is-closed',

            function() {

              discoveries.setCurrentModelBySlug(slug, mediaIndex);

            }

          );


        }
        else {

          discoveries.setCurrentModelBySlug(slug, mediaIndex);

        }



      },

      /**
       * page route handler
       * displays the text content for a given page
       * and setup main menu
       * might deal with special cases like portoflio page
       * @param slug
       * @return void
       */
      page: function(slug) {

        console.log("page: " + slug);

        var router = this;
            
        slug = this.cleanSlug(slug);

        // css operations
        // only after page/content is about to be shown
        page_module.currentPageView.listenToOnce(page_module.currentPageView, 'PageView:is-hidden', function() {

          // remove current page body class
          $('body').removeClass(router.previous_slug);
          // add current page slug
          $('body').addClass(slug);

          // very hackish
          // but deals with a case where 'contact' center-panel has a different width
          // than the regular content panel width - this is done via a body class
          // so as, when the panel is being hidden, we set its translateX value to be minus its width
          // and we then (here) remove the body class (contact) the content panel width is greater and the panel shows
          // we thus need to re-set the translateX property now that we have a greater width
          if(slug === 'portfolio') {
            page_module.currentPageView.$el.css({ x: -this.$el.outerWidth() });
          }

          router.previous_slug = slug;

        });
        
        this.activateMenuItem(slug);

        // special operations
        switch(slug) {

          case 'portfolio':

            // will hide text panel
            // and set currentPageView model to be portfolio page model
            this.renderPage(slug);

            if(project_module.portfolioView.project_thumbs_loaded) {
              project_module.portfolioView.show();
            }
            else {
              project_module.portfolioView.listenToOnce(
                project_module,
                'PortfolioView:thumbs-loaded',
                project_module.portfolioView.show
              );
            }

            break;

          default:

            if(page_module.currentPageView.model.get('slug') === 'portfolio') {

              // make Router listen to the PortfolioView item-hidden event
              // to trigger page rendering only then
              this.listenToOnce(project_module.portfolioView, 'PortfolioView:items-hidden',

                function() {
                  
                  this.renderPage(slug);

                }

              );


            }
            else {

              this.renderPage(slug);

            }
            
        }

      },

      renderPage: function(slug) {

        var newPage = page_module.collection.findWhere({ slug: slug });

        // SPECIAL CASE for post types other than Page or Project
        // in case requested page is not found in Pages collection ( post type : pages )
        // make page (make Page Model instance and add it to Pages collection) 
        // use currentPage object to make it if it exists
        if(!newPage && currentPage) {
          
          newPage = page_module.make_page(currentPage.attributes);

        }

        page_module.currentPageView.model = currentPage = newPage;

        // if no discovery is found -> render page
        // if it is found the Discovery process will take care of displaying page content
        if(!discoveries.setCurrentModelBySlug(slug)) {

          page_module.currentPageView.render();
          
        }

        // change page title
        if(newPage) {

          this.setDocumentTitle(newPage.get('title'));
          
        }

      },

      cleanSlug: function(slug) {

        // deals with home page as a static page
        // in our case 'portfolio'
        // but we retrieve it dynamically in AppData.php
        if(
          slug === undefined ||
          slug === '' ||
          // in case there is a query string right after the home url
          slug.match(/^\?(.*)?$/)
        ) {

            slug = app_data.home_page_slug;

        }
        else {
           // remove query string
          // to get clean slug
          slug = slug.replace(/\?(.*)$/, '');
        }

        return slug;

      },
    
      activateMenuItem: function(slug) {

        // activate menu item
        $('body > header .navbar-nav li').removeClass('active');
        $('body > header .navbar-nav li.menu-' + slug).addClass('active');

      },

      setDocumentTitle: function(title) {

        document.title = document.title.replace(/(.*)?\|(.*)?/, title + ' |$2');
         
      }

    }),

    currentPage,
    discoveryView,
    discoveries;

  return {

    root: "/",

    started: false,

    history_length: 0,

    router: new Router(),

    firstDiscovery: null,

    portoflio_position_randomized: false,

    // All pages
    common: {

      init: function() {

        console.group('APP INIT');

        // app data 
        app_data = this.parse_app_data();


        /**
         * DATA REQUESTS CALLBACKS
         */

        // when Pages are ready
        page_module.on('Pages:loaded', function() {

            
          },
          this
        );

        /**
         * when Projects are ready
         */
        project_module.on('Projects:loaded', function() {

            

          },
          this
        );

        /**
         * INIT PAGES
         */
        currentPage = page_module.init(app_data.currentPost);

        /*jshint -W027*/
        // return;

        /**
         * INIT PROJECTS
         * we can pass projects data if we want to
         * bootstrap the app with it
         * at the moment this is an empty array (@see appData.php)
         * as we want to make an ajax request and show a preloader 
         */
        project_module.init(app_data.projects);


        // START
        // When Pages and Projects data has been fetched
        $.when(
          page_module.collection_fetch_promise,
          project_module.collection_fetch_promise
        ).then($.proxy(function (pages, projects) {

          console.log(pages);
          console.log(projects);

          // hide main preloader
          $('main > .preloader').transition({opacity: 0}).removeClass('animate');

          // do this only after route has been triggered to avoid displaying hint too soon
          this.initHintDisplay();

          // Main Menu
          this.initMainMenu();

          // START ROUTING
          // should trigger route
          Backbone.history.start({pushState: true, root: VSLV_APP.root });

          // init discovery process
          this.initDiscoveryProcess(project_module.collection);

          if(currentPage.get('slug') === 'portfolio') {
            project_module.portfolioView.listenTo(
              project_module,
              'PortfolioView:thumbs-loaded',
              function() {
                project_module.portfolioView.show();
                VSLV_APP.started = true;
              }
            );
          }
          else {
            VSLV_APP.started = true;
          }


        }, this));


        /**
         * ADD LANDING PAGE/POST/PROJECT AS FIRST DISCOVERY
         */

        firstDiscovery = discovery_module.make_discovery(currentPage);

        // in case medias infos has not been loaded for currentPage
        // wait until it has and add its medias to the corresponding Discovery Model
        if(typeof currentPage.get('medias') !== "undefined" && currentPage.get('medias').length === 0) {

          // add 'medias' to Discovery model when they're available for Current Page
          currentPage.on('Page:MediasLoaded', function() {
              firstDiscovery.set('medias', this.get('medias'));
          },
          currentPage);

        }
        else { // add it right away

          firstDiscovery.set('medias', currentPage.get('medias'));

        }

        /**
         * INIT DISCOVERIES and CREATE DISCOVERY COLLECTION
         * also creates Discovery View which will rule the Discovery process (cycling through projects)
         */
        discoveries = discovery_module.init(firstDiscovery);

        // disable the view - will be re-enabled by accessing a project via the portfolio
        discovery_module.discoveryView.disable();



        /**
         * DISCOVERY EVENTS
         */

        // make page_module display the Discovery infos
        // when new Discovery is set
        discovery_module.discoveryView.on('DiscoveryView:setAndRenderEnded', function(discoveryModel) {

          console.log('DiscoveryView:setAndRenderEnded in Main');

          // content
          page_module.currentPageView.model = discoveryModel;
          page_module.currentPageView.render();

          // if Discovery is a Project
          // we hide the Discovery after a short delay
          if(discoveryModel.get('type') === 'project') {

            setTimeout(function() {
              //page_module.currentPageView.hide();
            },
            VSLV_CONFIG.discovery_hide_content_delay);

            // change page title
            VSLV_APP.router.setDocumentTitle(discoveryModel.get('client').title + ' | ' + discoveryModel.get('title'));
            
          }

        },
        this);

        discovery_module.discoveryView.on('Discovery:setCurrentMedia', function() {
          
          console.log('Discovery:setCurrentMedia in Main');
          page_module.currentPageView.hide();

        });



        /**
         * PORTFOLIO EVENTS
         */

        // disable Discovery View when Portoflio is open
        // hide portfolio and show text panel again
        project_module.portfolioView.on('PortfolioView:is-open', function() {

          discovery_module.discoveryView.undelegateEvents();

          // because if a Video Element is active the View has been bound with a click
          // to trigger the video play
          discovery_module.discoveryView.$el.off('mouseup touchend');

          // we want to close portfolio and show what's underneath
          // which is equivalent to going back to previous page
          // because we want to show some content
          // not just the background image
          discovery_module.discoveryView.$el.one('click', function() {

            // unless we have just landed
            if(VSLV_APP.history_length > 1) {

              window.history.back();
              
            }

          });

        });
        

        project_module.portfolioView.on('PortfolioView:items-shown', function() {
            

            // Randomize PF position
            if(!this.portoflio_position_randomized) {

              var nx = -Math.round(Math.random()*$(this.swiper.wrapper).width()/6);

              // slide to random position
              this.swiper.setWrapperTransition(1000);
              this.swiper.setWrapperTranslate(nx,0,0);
              
              this.portoflio_position_randomized = true;

            }

        },
        project_module.portfolioView);



        project_module.portfolioView.on('PortfolioView:is-closed', function() {
          
          // unbind click on Discovery View
          discovery_module.discoveryView.$el.off('click');
          
          // re-enable default behaviour when Portoflio is closed
          discovery_module.discoveryView.delegateEvents();


        });


        /**
         * ROUTER STUFF
         */

        // before any route
        VSLV_APP.router.on('beforeroute', function(route) {

          // hide portfolio
          if(project_module.portfolioView.is_open) {

            project_module.portfolioView.hide();

          }

          // hide menu
          // only if it's been initialized as a collapsible
          if($('.navbar-collapse').data("bs.collapse")) {
            // $( '.navbar-collapse').collapse('hide');
          }

        });

        VSLV_APP.router.on('route', function() {

          // track navigation length
          // useful to know whether user has started navigating
          VSLV_APP.history_length++;

        });


        /**
         * MISC
         */

        // apply vslv svg logo dimension fix for IE
        if(navigator.appName.indexOf('Internet Explorer') !== -1) {
          this.ie_vslv_logo_height_fix();
        }

        console.groupEnd();

      },

      initDiscoveryProcess: function(collection) {

        var firstDiscovery;

        // ADD PROJECTS TO DISCOVERIES
        discovery_module.make_discoveries(collection);

        firstDiscovery = discovery_module.collection.at(0);

        // now that we have the infos we need
        // we can start the PRELOADING all of discoveries medias
        discovery_module.discoveryView.preloadAllMedias();

        // remove first Discovery from collection if it's a page
        // as we 
        // only needed it on page load to display a bg image before any Discovery process begins
        // and that, as we will allow to cycle through discoveries, we don't want to come back to the Page we landed on
        if(firstDiscovery.get('type') !== "project") {

          discovery_module.collection.remove(firstDiscovery);
          
        }
        // if first Discovery is a project it also exists in the fetched projects
        // so we need to remove it 
        else {

          // get the discoveries and remove them (this will match the first discovery as well)
          var discoveries_to_be_removed = discovery_module.collection.where({ slug: firstDiscovery.get('slug') });

          // leave only duplicate to be removed
          // firstDiscovery is kept
          discoveries_to_be_removed.shift();

          // remove duplicate
          discovery_module.collection.remove(discoveries_to_be_removed);

        }


      },

      /**
       * Discovery process hint display
       *
       * we only want to display the hint when the content panel is hidden
       * so we start the hint display on PageView:is-hidden and stop it when PageView:is-shown
       */
      initHintDisplay: function() {
        
        // start displaying hint when page is hidden
        discovery_module.discoveryHintView.listenTo(page_module.currentPageView, 'PageView:is-hidden', function() {

          // portfolio page is empty and is not shown
          // so the hint display won't be stopped after the initial hiding of the previous page
          // thus we do not start when page is portoflio
          if(page_module.currentPageView.model.get('slug') === 'portfolio') {
            return;
          }

          console.log('PageView:is-hidden in  MAIN');

          if(!$('video').length) { // only if current Media is NOT a video - hackish as hell but I lack time
            this.start();
          }
          
        });

        // stop displaying hint when page is shown
        discovery_module.discoveryHintView.listenTo(page_module.currentPageView, 'PageView:is-shown', function() {
          
          console.log('PageView:is-shown in  MAIN');

          this.stop();

        });

        // or when we show the portfolio
        discovery_module.discoveryHintView.listenTo(project_module.portfolioView, 'PortfolioView:show', function() {
          
          console.log('PortfolioView:show in  MAIN');
          
          this.stop();

        });

        // or when we show a new media in Discovery
        discovery_module.discoveryHintView.listenTo(discovery_module.discoveryView, 'Discovery:setCurrentMedia', function() {
          

          if(this.started) {

            //this.stop();

            // reactivate after a while
            //this.discoveryHintViewTimeout = setTimeout(function() {discovery_module.discoveryHintView.start();}, 4000);
          
          }

        });

      },

      /**
       * Main Menu
       */
      initMainMenu: function() {

        console.log('initMainMenu');

        function changeLogo(type) {

          var logo_src = $('.navbar .navbar-brand img').attr('src'),
            new_logo_filename = "logo-vslv-"+type+".svg",
            new_logo_src = logo_src.replace(/[^\/?]*\.[^\/?]*(\?.*)?$/, new_logo_filename);

          $('.navbar .navbar-brand img').attr('src', new_logo_src);

        }

        // changeLogo("white");

        $('.navbar-collapse').on('show.bs.collapse', function() {

          console.log('SHOW MENU');

          $('.navbar').removeClass('collapsed');
          $('.navbar-toggle').removeClass('collapsed');
          
          changeLogo("color");

        });

        $('.navbar-collapse').on('hide.bs.collapse', function() {

          console.log('HIDE MENU');

          $('.navbar').addClass('collapsed');
          $('.navbar-toggle').addClass('collapsed');
          
          changeLogo("white");

        });

        $('#menu-primary-navigation li a').on('click', function() {


          if($(this).attr('href') === '/' + Backbone.history.fragment) {

            page_module.currentPageView.show();

          }


        });

      },

      /**
       * parse application data json strings
       * 
       * this data has been added to the page as strings 
       * the result of calls to the JSON API
       * 
       */
      parse_app_data: function() {

        _.each(app_data, function(value, key) {

          try {
            app_data[key] = $.parseJSON(value);
          }
          catch(e) {
            app_data[key] = value;
          }

        });

        return app_data;

      },

      ie_vslv_logo_height_fix: function() {

        var $img = $('.navbar-brand img'),
            img = $img.get(0),
            // IE seems to choke on getting the actual values for width and height
            // so we give it the actual svg dimensions
            w = 290,
            h = 34,
            ratio = h/w,
            nh = $img.width()*ratio;

        $('.navbar-brand img').height(nh);

      },

      finalize: function() { }

    },
    // Home page
    home: {
      init: function() {
        // JS here
      }
    },
    // About page
    about: {
      init: function() {
        // JS here
      }
    }

  };

}(PAGE_MODULE, PROJECT_MODULE, DISCOVERY_MODULE, APP_DATA));


// All navigation that is relative should be passed through the navigate
// method, to be processed by the router. If the link has a `data-bypass`
// attribute, bypass the delegation completely.
$(document).on("click", "a:not([data-bypass])", function(evt) {

  var href = { prop: $(this).prop("href"), attr: $(this).attr("href").replace(/^\//,'').replace(/\/$/,'') };
  var root = location.protocol + "//" + location.host + VSLV_APP.root;

  if(href.attr.match(/media/)) {
    return;
  }

  if (href.prop && href.prop.slice(0, root.length) === root && VSLV_APP.started) {

    evt.preventDefault();
    Backbone.history.navigate(href.attr.replace(root,''), true);
    //_gaq.push(['_trackPageview']); 
    
  }

});

// Modified http://paulirish.com/2009/markup-based-unobtrusive-comprehensive-dom-ready-execution/
// Only fires on body class (working off strictly WordPress body_class)

var UTIL = {
  fire: function(func, funcname, args) {
    var namespace = VSLV_APP;
    funcname = (funcname === undefined) ? 'init' : funcname;
    if (func !== '' && namespace[func] && typeof namespace[func][funcname] === 'function') {
      namespace[func][funcname](args);
    }
  },
  loadEvents: function() {

    UTIL.fire('common');

    $.each(document.body.className.replace(/-/g, '_').split(/\s+/),function(i,classnm) {
      UTIL.fire(classnm);
    });

    UTIL.fire('common', 'finalize');
  }
};

// prevent viewport to move on touch
$('body').on('touchmove',function(e) {
  e.preventDefault();
});

$(document).ready(UTIL.loadEvents);
