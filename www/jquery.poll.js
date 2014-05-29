define(['jquery'], function ($) {
    (function ($) {
        $.fn.poll = function () {
            var that, val, tmp;

            that = this;

            (function ping () {
                tmp = that.val();

                if (tmp != val){
                    val = tmp;
                    that.change();
                }

                setTimeout(ping, 100);
            }());

            return this;
        };
    }(jQuery));
});
