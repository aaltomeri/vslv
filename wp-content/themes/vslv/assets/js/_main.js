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

        'projects/:slug': 'project',
        '': 'page',
        ':slug': 'page',
        ':category/:slug': 'page'

      },

      project: function(slug) {

        console.log("project: " + slug);

      },


      page: function(slug) {

        console.log("page: " + slug);

      }

    }),

   /**
     * DiscoveryModel
     * 
     * Model for the Projects or Pages we are showing through the Discovery View
     */
    DiscoveryModel = Backbone.Model.extend({

      initialize: function() {
        // console.log(this);
      }

    }),

    /**
     * DiscoveryCollection
     * 
     * Collection of Pages or Projects which medias we are sequentially displaying
     */
    DiscoveryCollection = Backbone.Collection.extend({

      model: DiscoveryModel,

      initialize: function() {}

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

        initialize: function() {},

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
         */
        render: function() {


        }

    }),

    currentPage,
    discoveries;

  return {

    root: "/",

    router: new Router(),

    // All pages
    common: {

      init: function() {

        // app data 
        app_data = this.parse_app_data();

        // start routing
        // should trigger route
        Backbone.history.start({pushState: true, root: VSLV_APP.root });

        // init current page
        currentPage = page_module.init(app_data.currentPost);

        // when projects
        project_module.on('Projects:loaded', function() {

          // extract required infos from projects
          // to build 'discovery' models
          var _discoveries = this.collection.map(function(project) {

            return {
              title: project.get('title'),
              content: project.get('content'),
              medias : project.get('medias') || []
            };

          });

          // first Discovery is the Page we have landed on
          _discoveries.unshift({
            title: currentPage.get('title'),
            content: currentPage.get('content'),
            medias: currentPage.get('medias') || []
          });

          // instantiate Discovery Collection
          discoveries = new DiscoveryCollection(_discoveries);

          // add 'medias' to Discovery model when they're available for Current Page
          currentPage.on('Page:MediasLoaded', function() {
              discoveries.findWhere({ title: currentPage.get('title') }).set('medias', this.get('medias'));
          },
          currentPage);
          currentPage.getMediasInfos();

        });

        // init projects
        project_module.init(app_data.projects);

      },

      /**
       * parse application data json strings 
       * - current post data 
       * - projects data
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
