var PAGE_MODULE = (function() {

	var module = _.extend({

        collection: null,
        currentPage: null,
        currentPageView: null

      }, Backbone.Events),

      name = "page",

      Model = Backbone.Model.extend({
          
        initialize: function() {

          // this.getMediasInfos();

          var panel_type = this.get('post_meta')['panel-type']? this.get('post_meta')['panel-type'][0] : 'left';

          this.set('panel-type', panel_type);

        },

        /**
         * populate 'medias' attribute for model - an array of objects
         * based on the presence of meta attachments (Attachments WP plugin)
         * we actually want to get more infos than just the ID and name of the attachments
         */
        getMediasInfos: function() {

          var attachments = this.get('post_meta').attachments || null,
              medias = this.get('medias') || [],
              requests_promises = [];

          if(!attachments) {
            return;
          }

          attachments = $.parseJSON(attachments[0]);

          // loop through attachments and get each attachment data 
          // add it to the model medias array
          _.each(attachments.attachments, function(attachment, index) {

            var promise = $.get(VSLV_CONFIG.base_url + 'media/' + attachment.id, {context: 'single'})
              .success(function(data) {

                medias[index] = data;

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
        content_template: null,

        events: {

          'click': 'toggle'

        },

        initialize: function() {

          _.templateSettings.variable = 'data';

          // make content template
          this.content_template = _.template($('#content-template').html());

        },

        render: function() {

          this.listenToOnce(this, 'PageView:is-hidden', function() {
            this.setText();
            this.$el.show();
          });

          this.hide(0);
          this.show();
          
        },

        setText: function() {

          this.$el.html(
            this.content_template( this.model.attributes )
          );

        },

        show: function() {

          var view = this,
              type = this.model.get('type'),
              title = this.model.get('title'),
              slug = this.model.get('slug'),
              content = this.model.get('content'),
              panel_type = this.model.get('panel-type');

          if(content || (title && type === 'project')) {

            if(panel_type ===  "center") {

                this.$el.transition({

                  opacity: 1

                }, function() {

                  view.visible = true;
                  
                });

            }
            else {

              this.$el.transition({

                left: 0

              }, function() {

                view.visible = true;
                console.log('PageView:is-shown');
                view.trigger('PageView:is-shown');
                
              });
              
            }


          }

          return this.$el;

        },

        hide: function(offsetX) {

          var view = this,
              type = this.model.get('type'),
              slug = this.model.get('slug'),
              title = this.model.get('title'),
              content = this.model.get('content'),
              panel_type = this.model.get('panel-type'),
              animation_attributes = {};

          // only for projects
          if(type === 'project' && offsetX === undefined) {

            // keep panel visible
            offsetX = 40;

          }
          else if(offsetX === undefined) {

            offsetX = 0;

          }

          if(this.$el.hasClass('center-panel')) {

            animation_attributes = { opacity: 0 };

          }
          else {

            animation_attributes = { left: -this.$el.outerWidth() + offsetX };

          }

          this.$el
            .transition(animation_attributes,

              function() {


                if(view.$el.hasClass('center-panel')) {

                  // hide view so we can click on bg when we've hidden a 'center-panel' view
                  view.$el.hide();

                }

                // when hiding the panel the model has already been changed 
                // if panel_type === 'center' it means we are about to show a page that disaplays its content in the center
                if(panel_type === 'center') {
                  view.$el.addClass('center-panel');
                  view.$el.css({
                    opacity: 0
                  });
                }
                // for other pages
                // make them visible again
                else {

                  view.$el.removeClass('center-panel');
                  view.$el.css({
                    opacity: 1
                  });

                }

                view.visible = false;
                console.log('PageView:is-hidden');
                view.trigger('PageView:is-hidden');

              }

            );

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