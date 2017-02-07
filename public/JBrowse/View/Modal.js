define(['dojo/_base/declare', 'jquery', 'bootstrap']
, function (declare, $) {

var $modal;

return declare(null, {
    constructor: function (opts) {
        $modal = $modal || $(this.template()).appendTo('body');
        this.set('title', opts.title);
    },

    set: function (name, value) {
        if (name === 'title') {
            $modal.find('.modal-title').html(value);
        }
        else if (name === 'content') {
            $modal.find('.modal-body').html(value);
        }
    },

    show: function () {
        $modal.modal('show');
    },

    template: function () {
        return "\
<div class=\"modal fade\" tabindex=\"-1\"> \
  <div class=\"modal-dialog modal-lg\">    \
    <div class=\"modal-content\">          \
      <div class=\"modal-header\">         \
        <h4 class=\"modal-title\">         \
        </h4>                              \
      </div>                               \
      <div class=\"modal-body\">           \
      </div>                               \
    </div>                                 \
  </div>                                   \
</div>                                     \
        ";
    }
});
});
