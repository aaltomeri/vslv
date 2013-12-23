var PROJECT_MODULE = (function(win, $, cjs) {

  if(typeof cjs === "undefined") {
    throw "Project module depends on CreateJS library. It seems to be missing.";
  }


  var name = "project",
      collection;

	var Model = Backbone.Model.extend({
      
      initialize: function() {
        
        if(this.get('featured_image')) {
          this.set('thumbnail',
            this.get('featured_image').attachment_meta.sizes.thumbnail
          );
        }

      }

    }),

    Collection = Backbone.Collection.extend({
      url: VSLV_CONFIG.base_url + VSLV_CONFIG.modules[name].route + '?lang=' + VSLV_CONFIG.lang,
      model: Model
    }),

    ListView = Backbone.View.extend({}),

    init = function() {

        collection =  new Collection();

        // preload portfolio thumbnails
        var project_thumbs_queue = new createjs.LoadQueue(),
            project_thumbs_loading_manifest = [];

        // We will start the portfolio build once the projects have been fetched
        collection.on('reset', function() {

          this.each(function(model) {

            if(model.get('thumbnail')) {
              // add to the loading queue
              project_thumbs_loading_manifest.push({
                id: 'project_' + model.get('post_name') + '_thumbnail',
                src: model.get('thumbnail').url
              });
            }
          });

          project_thumbs_queue.loadManifest(project_thumbs_loading_manifest);
          project_thumbs_queue.on('fileload', function(o) { $('body').append(o.result); });
          project_thumbs_queue.on('complete', function(o) { console.log(o); });

        });

        // fetch projects
        collection.fetch({reset: true, data: {filter: {orderby: 'title', order: 'ASC'}}});

    };



	return {

		collection: collection,
    init: init

	};


}(window, jQuery, createjs));