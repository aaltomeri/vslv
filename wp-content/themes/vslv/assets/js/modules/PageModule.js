var PAGE_MODULE = (function() {

	var module = _.extend({}, Backbone.Events),
      name = "page",
      currentPage,

      Model = Backbone.Model.extend({
          
        initialize: function() {},

        /**
         * populate 'medias' attribute for model - an array of objects
         * based on the presence of meta attachments (Attachments WP plugin)
         * we actually want to get more infos than just the ID and name of the attachments
         */
        getMediasInfos: function() {

          var attachments = this.get('post_meta').attachments || null,
              medias = [],
              requests_promises = [];


          if(!attachments) {
            return;
          }

          attachments = $.parseJSON(attachments[0]);

          // loop through attachments and get each attachment data 
          // add it to the model medias array
          _.each(attachments.attachments, function(attachment) {

            var promise = $.get(VSLV_CONFIG.base_url + 'media/' + attachment.id)
              .success(function(data) {

                medias.push(data);

              })
              .error(function() {

                throw('Error retrieving medias for project: ' + this.get('ID'));

              });

            requests_promises.push(promise);

          });


          // when all attachments data have been retrieved
          // set a 'medias' attribute on the model with all the attachments data
          $.when.apply($, requests_promises).done(

            $.proxy(function() {

                this.set('medias', medias);
                this.trigger('Page:MediasLoaded');

              },
              this
            )
          );

          return requests_promises;

        }

      }),

      Collection = Backbone.Collection.extend({
        url: VSLV_CONFIG.base_url + VSLV_CONFIG.modules[name].route + '?lang=' + VSLV_CONFIG.lang,
        model: Model
      }),

      View = Backbone.View.extend({}),

      init = function(currentPost_data) {

        currentPage = new Model(currentPost_data);

        return currentPage;

      };

  // exports
  module.collection = new Collection();
  module.init = init;

	return module;

}());