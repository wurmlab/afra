/**
 * Auto click the target element (a jquery selector or jquery object) when
 * enter keypress event is fired on _this_.
 */
define(['jquery'], function ($) {
    $.fn.onenter = function (target) {
        var $target = $(target);
        this.keypress(function (evt) {
            if (evt.keyCode === 13)
                $target.click();
        });
    };
});
