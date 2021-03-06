;(function($) {
    if (typeof window == 'undefined') {
        return;
    }

    /**
     * Debounce декоратор
     *
     * @param {function} fn Функция
     * @param {number} timeout Таймаут в миллисекундах
     * @param {bool}
     * @param {object} ctx Контекст вызова
     */
    function debounce(fn, timeout, invokeAsap, ctx) {
        if (arguments.length == 3 && typeof invokeAsap != 'boolean') {
            ctx = invokeAsap;
            invokeAsap = false;
        }

        var timer;

        return function() {
            var args = arguments;

            ctx = ctx || this;
            if (invokeAsap && !timer) {
                fn.apply(ctx, args);
            }

            clearTimeout(timer);

            timer = setTimeout(function() {
                if (!invokeAsap) {
                    fn.apply(ctx, args);
                }
                timer = null;
            }, timeout);
        };
    }

    var methods = {

        _getHandlers: function() {
            var y = this;

            y.listeners.push({
                eventType: 'scroll',
                selector: y.params.scroller,
                handler: function() {
                    y._onScroll();
                }
            });

            y.listeners.push({
                eventType: 'resize',
                selector: 'html, body',
                handler: debounce(y.update, 1000)
            });

            if (y.params.collapseOnClick) {
                y.listeners.push({
                    eventType: 'click',
                    selector: y.params.sectionHeader,
                    handler: function() {
                        var target = $(this);

                        y._onCollapse(target);
                    }
                });
            }
        },

        _bindListeners: function() {
            var y = this;

            for (var i = 0, len = y.listeners.length; i < len; i++) {
                $(y.listeners[i].selector).on(
                    y.listeners[i].eventType,
                    y.listeners[i].handler
                );
            }
        },

        _unbindListeners: function() {
            var y = this;

            for (var i = 0, len = y.listeners.length; i < len; i++) {
                $(y.listeners[i].selector).off(
                    y.listeners[i].eventType,
                    y.listeners[i].handler
                );
            }

            y.listeners = [];
        },

        _getData: function(isInitial) {
            var y = this,
                data = [];

            y.elements.sections.each(function(i) {
                var section = $(this),
                    sectionHeaderWrapper = section.find(y.params.sectionHeaderWrapper),
                    sectionHeader = section.find(y.params.sectionHeader);

                data[i] = {
                    element:  sectionHeader,
                    position: sectionHeaderWrapper[0].offsetTop,
                    width:    sectionHeaderWrapper.outerWidth(),
                    height:   sectionHeaderWrapper.outerHeight()
                };

                if (isInitial) {
                    section.attr('data-yostick-section-id', i);
                }
            });

            return data;
        },

        _onScroll: function() {
            var y = this,
                position = y.elements.scroller.scrollTop();

            y._apply(y._getCurrentSection(position), position);
        },

        _getCurrentSection: function(position) {
            var y = this,
                current, next;

            for (var i = 0, len = y.data.length; i < len; i++) {
                current = y.data[i];
                next = y.data[i + 1];

                if (current.position < position && (!next || next.position > position)) {
                    return i;
                }
            }
        },

        _apply: function(index, position) {
            var params = this.params,
                current = this.data[index],
                next = this.data[index + 1],
                styles, modifiers, top;

            for (var i = 0, len = this.data.length; i < len; i++) {
                modifiers = [];

                if (i == index) {
                    top = 0;
                    modifiers.push(params.sectionTitleIsSticked);

                    if (next && (next.position < position + current.height)) {
                        top = next.position - position - current.height;
                        modifiers.push(params.sectionTitleIsHustled);
                    }

                    styles = {
                        position: 'absolute',
                        top: 0,
                        width: this.data[i].width + 'px',
                        transform: 'translateY(' + top + 'px)'
                    };
                } else {
                    styles = {
                        position: 'relative',
                        top: 'auto',
                        transform: 'none'
                    };
                }

                this.data[i].element
                    .removeClass([
                        params.sectionTitleIsSticked,
                        params.sectionTitleIsHustled
                    ].join(' '))
                    .addClass(modifiers.join(' '))
                    .css(styles);
            }
        },

        _onCollapse: function(target) {
            var y = this,
                scroller = y.elements.scroller,
                position = scroller.scrollTop(),
                thisArticle = target.closest(y.params.section),
                id = +thisArticle.attr('data-yostick-section-id'),
                newPosition = position,
                current, next;

            if (thisArticle.hasClass(y.params.sectionIsCollapsed)) {
                thisArticle.removeClass(y.params.sectionIsCollapsed);
            } else {
                thisArticle.addClass(y.params.sectionIsCollapsed);
            }

            y.data = y._getData();

            current = y.data[id];
            next = y.data[id + 1];

            if (current.position < position) {
                newPosition = current.position;
            } else if (next && next.position < position + current.height) {
                newPosition = next.position - position - current.height;
            }

            scroller.scrollTop(newPosition);
            y._apply(y._getCurrentSection(newPosition), newPosition);

            if (y.params.onCollapse) {
                y.params.onCollapse();
            }
        },

        update: function() {
            var y = this,
                position;

            y.elements = {
                scroller: y.root.find(y.params.scroller),
                sections: y.root.find(y.params.section)
            };

            y._unbindListeners();
            y._getHandlers();
            y._bindListeners();

            y.data = y._getData(true);

            position = y.elements.scroller.scrollTop();

            y._apply(y._getCurrentSection(position), position);
        },

        destroy: function() {
            var y = this;

            // Unbind listeners
            y._unbindListeners();

            // Remove custom styles
            y.elements.sections.each(function() {
                var it = $(this);

                it
                    .removeAttr('data-yostick-section-id')
                    .find(y.params.sectionHeader)
                    .removeClass([
                        y.params.sectionIsCollapsed,
                        y.params.sectionTitleIsSticked,
                        y.params.sectionTitleIsHustled
                    ].join(' '))
                    .attr('style', '');
            });

            delete y.root[0].yostick;
        }

    };

    Yostick.prototype = methods;

    function Yostick(root, options) {
        var instance = this instanceof Yostick ? this : $.extend({}, Yostick.prototype),
            y = instance;

        var params = $.extend({

            // Selectors
            scroller: '.yostick__scroller',
            section: '.yostick__section',
            sectionContent: '.yostick__list',
            sectionHeaderWrapper: '.yostick__section-header',
            sectionHeader: '.yostick__section-header-in',

            // Modifiers
            sectionIsCollapsed: '_collapsed',
            sectionTitleIsSticked: '_sticked',
            sectionTitleIsHustled: '_hustled',

            // Options
            collapseOnClick: true

        }, options);

        y.params = params;
        y.root = root;

        y.elements = {
            scroller: root.find(params.scroller),
            sections: root.find(params.section)
        };

        y.data = y._getData(true);
        y.listeners = [];

        y._getHandlers();
        y._bindListeners();
    }

    window.yostick = Yostick;

    $.fn.yostick = function(method) {
        var args = arguments;

        if (methods[method]) {
            return this.each(function() {
                var instance = this && this.yostick;

                if (instance) {
                    methods[method].apply(instance, Array.prototype.slice.call(args, 1));
                }
            });
        } else if (typeof method == 'object' || !method) {
            return this.each(function() {
                this.yostick =  new Yostick($(this), args[0]);
            });
        } else {
            $.error('Unknown method: ' +  method);
        }

    };

})(jQuery);