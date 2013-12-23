// Modified http://paulirish.com/2009/markup-based-unobtrusive-comprehensive-dom-ready-execution/
// Only fires on body class (working off strictly WordPress body_class)

// Application
// we pass the required modules to be used
var VSLV_APP = (function(page_module, project_module) {

  var Router = Backbone.Router.extend({

    routes: {

      ':slug': 'page',
      'portfolio/:slug': 'project'

    },

    project: function(slug) {

      console.log("project: " + slug);

    },


    page: function(slug) {

      console.log("page: " + slug);

    }

  });

  return {

    root: "/",

    router: new Router(),

    // All pages
    common: {

      init: function() {

        // start routing
        // should trigger route
        Backbone.history.start({pushState: true, root: VSLV_APP.root });

        // init projects (portfolio)
        project_module.init();

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

}(PAGE_MODULE, PROJECT_MODULE));


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
