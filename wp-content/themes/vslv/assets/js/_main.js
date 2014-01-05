// Modified http://paulirish.com/2009/markup-based-unobtrusive-comprehensive-dom-ready-execution/
// Only fires on body class (working off strictly WordPress body_class)

// Application
// we pass the required modules to be used
var VSLV_APP = (function(page_module, project_module, discovery_module, app_data) {

  var Router = Backbone.Router.extend({

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

      project: function(slug, media_id) {

        console.log("project: " + slug);

        if(media_id === undefined) {
          media_id = 1;
        }

        var d = discoveries.findWhere({slug:slug});

        discoveries.setCurrentModelBySlug(slug);

        //page_module.currentPageView.render();

      },

      page: function(slug) {

        console.log("page: " + slug);

        // activate menu item
        $('#menu-primary-navigation li').removeClass('active');
        $('#menu-primary-navigation li.menu-' + slug).addClass('active');

        var newPage = page_module.collection.findWhere({ slug: slug });

        // in case requested page is not found in Pages collection ( post type : pages )
        // make page (make Page Model instance and add it to Pages collection) 
        // use currentPage object to make it if it exists
        if(!newPage && currentPage) {
          
          newPage = page_module.make_page(currentPage.attributes);

        }

        switch(slug) {

          case 'portfolio':
            project_module.portfolioView.show();
            break;

          case null:
            this.page('portfolio');

        }

        page_module.currentPageView.model = currentPage = newPage;
        page_module.currentPageView.render();

      }

    }),

    currentPage,
    discoveryView,
    discoveries;

  return {

    root: "/",

    router: new Router(),

    firstDiscovery: null,

    // All pages
    common: {

      init: function() {

        // app data 
        app_data = this.parse_app_data();

        // when Pages are ready
        page_module.on('Pages:loaded', function() {

          // START ROUTING
          // should trigger route
          Backbone.history.start({pushState: true, root: VSLV_APP.root });
          
        });

        /**
         * INIT DISCOVERY PROCESS
         * when Projects are ready
         */
        project_module.on('Projects:loaded', function() {

          this.initDiscoveryProcess(project_module.collection);

        },
        this);

        // INIT PAGES
        currentPage = page_module.init(app_data.currentPost);

        // INIT PROJECTS
        // we can pass projects data if we want to
        // bootstraping the app with it
        // at the moment this is an empty array (@see appData.php)
        // as we want to make an ajax request and show a preloader 
        project_module.init(app_data.projects);

        
        /**
         * DISCOVERIES
         */

        firstDiscovery = discovery_module.make_discovery(currentPage);

        // in case medias infos has not been loaded for currentPage
        // wait until it is and add its medias to the corresponding Discovery Model
        if(typeof currentPage.get('medias') !== undefined && currentPage.get('medias').length === 0) {

          // add 'medias' to Discovery model when they're available for Current Page
          currentPage.on('Page:MediasLoaded', function() {
              firstDiscovery.set('medias', this.get('medias'));
          },
          currentPage);

        }
        else { // add it right away

          firstDiscovery.set('medias', currentPage.get('medias'));

        }

        // INIT DISCOVERIES and CREATE DISCOVERY COLLECTION
        // also creates Discovery View which will rule the Discovery process (cycling through projects)
        discoveries = discovery_module.init(firstDiscovery);

        // make page_module display the Discovery infos
        // when new Discovery is set
        discovery_module.collection.on('Discovery:set', function(discoveryModel) {

          // content
          page_module.currentPageView.model = discoveryModel;
          page_module.currentPageView.render();

          // update address bar
          var type = discoveryModel.get('type'),
              slug = discoveryModel.get('slug'),
              route = VSLV_CONFIG.modules[type].route;

          Backbone.history.navigate(route + '/' + slug);

        });

        // before any route
        VSLV_APP.router.on('beforeroute', function() {

          // hide portfolio
          project_module.portfolioView.hide();
    
        });


        this.initMainMenu();

      },

      initDiscoveryProcess: function(collection) {

        var firstDiscovery;

        // ADD PROJECTS TO DISCOVERIES
        discovery_module.make_discoveries(collection);

        firstDiscovery = discovery_module.collection.at(0);

        // now that we have the infos we need
        // we can start the PRELOADING of discoveries medias
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

          // reset currentModelIndex for Discovery Collection
          // as it's already moved ahead for displaying first discovery
          //discovery_module.collection.resetCurrentModelIndex();

        }


      },

      /**
       * Main Menu
       */
      initMainMenu: function() {

        $('.navbar-collapse').on('show.bs.collapse', function() {

            $('.banner').removeClass('collapsed');

        });

        $('.navbar-collapse').on('hide.bs.collapse', function() {

            $('.banner').addClass('collapsed');

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

  if (href.prop && href.prop.slice(0, root.length) === root) {

    evt.preventDefault();
    Backbone.history.navigate(href.attr.replace(root,''), true);
    //_gaq.push(['_trackPageview']); 
    
  }

});

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

$(document).ready(UTIL.loadEvents);
