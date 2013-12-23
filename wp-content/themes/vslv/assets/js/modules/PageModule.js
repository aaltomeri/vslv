var PAGE_MODULE = (function() {

  var name = "page";

	var Model = Backbone.Model.extend({
          
      initialize: function() {}

    }),

    Collection = Backbone.Collection.extend({
      url: VSLV_CONFIG.base_url + VSLV_CONFIG.modules[name].route + '?lang=' + VSLV_CONFIG.lang,
      model: Model
    }),

    View = Backbone.View.extend({});

	return {

		collection: new Collection()

	};


}());