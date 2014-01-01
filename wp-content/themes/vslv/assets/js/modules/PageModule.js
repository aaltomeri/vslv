var PAGE_MODULE = (function() {

	var module = _.extend({

        collection: null,
        currentPage: null,
        currentPageView: null

      }, Backbone.Events),

      name = "page",

      Model = Backbone.Model.extend({
          
        initialize: function() {

          this.getMediasInfos();

        },

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

            var promise = $.get(VSLV_CONFIG.base_url + 'media/' + attachment.id, {context: 'single'})
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

      View = Backbone.View.extend({

        visible: false,

        events: {

          'click': 'toggle'

        },

        initialize: function() {

          //this.model.on('change', this.render, this);

        },

        render: function() {

          this.hide();
          this.show();
          
        },

        setText: function() {

          this.$el.html(this.model.get('content'));

        },

        show: function() {

          var view = this;

          if(this.model.get('content')) {

            this.$el.transition({

              left: 0

            }, function() {

              view.visible = true;
              
            });


          }

          return this.$el;

        },

        hide: function() {

          var view = this;
              
          this.$el
            .transition({

              left: -this.$el.outerWidth() + 40

            },
            function() {

              view.visible = false;
              view.setText();

            });

          return this.$el;

        },

        toggle: function() {

          if(this.visible) {
            this.hide();
          }
          else {
            this.show();
          }

        }


      }),

      init = function(currentPost_data) {

        module.collection = new Collection();
        module.collection.fetch({reset: true});

        module.collection.on('reset', function() {

          module.trigger('Pages:loaded');

        });

        module.currentPage = new Model(currentPost_data);

        // instantiate Page View
        module.currentPageView = new View({ el: $('#content'), model: module.currentPage });
        //module.currentPageView.render();

        return module.currentPage;

      },

      make_page = function(attributes) {

        var model;
        
        // minimum requirement
        // check if there is an ID attribute passed in atributes parameter 
        if(!attributes.ID) {
          throw new Error('You need at least an ID to make a page.');
        }

        model = new Model(attributes);
        model.getMediasInfos();
        
        module.collection.add(model);

        return model;

      };

  // exports
  module.init = init;
  module.make_page = make_page;

	return module;

}());