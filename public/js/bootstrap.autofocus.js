/**
 * autofocus any autofocussable input=text within a modal when when the modal
 * is shown.
 */
define(['jquery'], function ($) {
    $(document).on('shown.bs.modal', function (e) {
        $('[autofocus]', e.target).focus();
    });
});
