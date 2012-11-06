/*!
 * Copyright (c) 2012 Pete Romano
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 * @fileOverview Espresso JavaScript framework
 * @author Pete Romano <https://github.com/peteromano>
 */
;(function(espressoConfig, undefined, ctx, isCommonJS, espresso, $, require, _, Backbone) {
    //'use strict';

    var VERSION = '1.0.0';

    if(isCommonJS) {
        ctx = global;
        require = ctx.require;
        $ = require('jquery');
        //_ = require('_');
        //Backbone = require('Backbone');
    }

    var config = extend(true, {

            isCommonJS: isCommonJS || false,
            context: ctx,
            require: require,
            jQuery: $,
            jQueryNoConflict: false,    // revert global jQuery and $ vars to previous values
            underscore: _,
            Backbone: Backbone,
            environment: 'prod',

            /**
             * {classPath|libPath|vendorPath|testPath}/[{path}/][{prefix}]{class}[{versionSuffix}][{bundleSuffix}][{compressionSuffix}]{extension}
             */
            loader: {
                classPath: '/',                     // default root of all non-vendor scripts requests
                libPath: '',                        // same exact thing as 'classPath' (for semantics...)
                testPath: '/test',                  // test directory to load integration tests
                test: false,                        // flag the loader that this is a test file
                testSuffix: '.test.js',             // extension for test files
                vendorPath:  '/vendor',             // default root of all vendor (third-party) library requests (not implemented yet)
                vendor: false,                      // flag loader that this is a third-party library
                extension: '.js',                   // default script extension
                prefix: '',                         // specify a filename prefix for current request(s)
                compressSuffix: '.compressed',      // extension suffix for compressed files
                compressed: false,                  // flag the loader to use compressionSuffix
                bundleSuffix: '.bundled',           // extension suffix for bundled files
                bundled: false,                     // flag the loader to use bundleSuffix
                version: '',                        // specify version in filename
                versionSuffix: '-{version}',        // extension suffix template for versioned files
                alias: '',                          // specify the JavaScript object that the request binds to
                force: false                        // override caching mechanisms
            },

            debug: {
                logging: 0
            }

        }, espressoConfig || {});

    var constants = {},         // Used for global readonly vars
        localConstants = {},    // Used for local espresso readonly vars
        used = {},              // The "use" cache; cache for "used" files
        pending = {},           // Used for monitoring pending dependency loads
        readyEvents,            // EventManager for handling library loads
        ie = !isCommonJS && /MSIE+/i.test(ctx.navigator.userAgent); // Sigh...

    constant('LOGGING_TPL',         '[{type}] in {klass}#{method}: {task}: {message} - Espresso');

    constant('R_FUNC_NAME',         /(?:function\s+((?:\w|\$)+)(?:\n|.)*)|(?:\n|.)*/);
    constant('R_USE_ATTRS',         /@(\w*(?:=[^\s]*)*)/g);
    constant('R_USE_REMOVE_STAR',   /(?:(?:\.|\/)\*)/);
    constant('R_USE_NO_INVOKE',     /(?:\(+[^)]*\))|(?:[^= ]+=+[^;]+)/g);
    constant('R_USE_ADD_SLASH',     /\/$|$/);
    constant('R_USE_LAST_SLASH',    /\/(\w*)$/);
    constant('R_USE_NOTHING',       /^$/);
    constant('R_USE_PATH',          /^([0-9A-Za-z./]*).*/);
    constant('R_USE_DOT',           /\./g);
    constant('R_USE_HAS_SLASH',     /^([^\s]*\/)/);

    /**
     * @namespace
     */
    ctx.espresso = espresso = assign('espresso', espresso || {}, isCommonJS ? module.exports : ctx, true);

    !require && (ctx.require = rekwire);

    if(!$) error('espresso', '[core]', 'Checking jQuery Dependency', 'jQuery dependency not found');

    function rekwire() {
        return use.apply(this, arguments);
    }

    function namespace(name, root) {
        if(!name) return name;
        var path = name instanceof Array ? name : name.split('.'), o = root || ctx, next;
        while(next = path.shift()) if(!o[next] || !(o = o[next])) o = o[next] = {};
        return o;
    }

    /**
     * TODO: Use a more graceful method of declaring values as "enumerable" (prolly need to borrow some jquery bits n pieces here)
     *
     * We don't wanna recurse over:
     *      1) Circular references - any object that was already discovered in the current "path" (or stack)
     *      2) HTML nodes, window objects, things like that... The config object is not meant to hold other
     *         objects that have "deep paths", ie, takes forever to enumerate
     */
    function flatten(obj) {
        function circular(val, arr) {
            var found;
            $.map(arr, function(item) { found = found || (item === val); });
            return found;
        }

        function enumerable(val) {
            // IE<9 doesn't expose HTMLElements to the global scope and blows up
            return val !== ctx;/* && !(val instanceof ctx.HTMLElement);*/
        }

        function squash(obj, ret, path, refs) {
            var val;
            ret = ret || {}; path = path || [], refs = refs || [];
            for(var key in obj) {
                val = obj[key];
                path.push(key);
                if(typeof val == 'object' && enumerable(val) && !circular(val, refs))
                    refs.push(val) && squash(val, ret, path, refs) && refs.pop();
                else ret[path.join('.')] = val;
                path.pop();
            }
            return ret;
        }

        return squash(obj);
    }

    function parseConfig(cfg) {
        function parse(obj, cfg) {
            for(var key in obj) {
                if(typeof obj[key] == 'object') parse(obj[key], cfg);
                else obj[key] = typeof obj[key] == 'string' ? substitute(obj[key], cfg) : obj[key];
            }
            return obj;
        }

        return parse($.extend(true, {}, cfg), flatten(cfg));
    }

    function constant(c, v, container) {
        container = container || localConstants;
        if(!v) return container[c];
        else if(typeof container[c = c.toUpperCase()] == 'undefined') container[c] = v;
        return container[c];
    }

    function which() {
        for(var i = 0; i < arguments.length; ++i) if(arguments[i]) return arguments[i];
    }

    function trim(s) {
        return s.replace(/^\s*|\s*$/g, '');
    }

    function lambda(result) {
        return function() { return result; };
    }

    function capitalize(str, beginning) {
        return str.replace(beginning ? /^[a-z]/gi : /(?:\s|^)[a-z]/gi, function($1) {
            return $1.toUpperCase();
        });
    }

    function camelcase(str) {
        return str.replace(/(?:_|-)(\w)/g, function(match, $1) {
            return $1.toUpperCase();
        });
    }

    function substitute(s, d) {
        return s.replace(/{(.+?)}/g, function(m, n) {
            return d[n] || '';
        });
    }

    function curry(fn, args, ctx) {
       return function() {
         return fn.apply(ctx || this, args || []);
       }
    }

    function die(message) {
        if(arguments.length > 1) error.apply(null, arguments);
        else throw new Error(message);
    }

    function assign(path, klass, root, caseInsensitive) {
        var alias = (path = path.split('.')).pop(), o = namespace(path, root);
        return caseInsensitive ?
            o[alias] = o[alias.toUpperCase()] = o[capitalize(alias)] = klass :
            o[alias] = klass;
    }

    // Copied from jQuery lib; patched to fix an IE8 native non-enumerables issue
    function extend() {
        // copy reference to target object
        var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options;

        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !jQuery.isFunction(target) )
            target = {};

        // extend jQuery itself if only one argument is passed
        if ( length == i ) {
            target = this;
            --i;
        }

        for ( ; i < length; i++ )
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) != null ) {
                // Extend the base object
                for ( var name in options ) {
                    var src = target[ name ], copy = options[ name ];

                    // Prevent never-ending loop
                    if ( target === copy )
                        continue;

                    // Recurse if we're merging object values
                    if ( deep && copy && typeof copy === "object" && !copy.nodeType )
                        target[ name ] = extend( deep,
                            // Never move original objects, clone them
                            src || ( copy.length != null ? [ ] : { } )
                        , copy );

                    // Don't bring in undefined values
                    else if ( copy !== undefined )
                        target[ name ] = copy;

                }

               // Hack for IE8 ignoring overridden native methods!
               if(options.hasOwnProperty('toString')) target.toString = options.toString;
               if(options.hasOwnProperty('valueOf')) target.valueOf = options.valueOf;

            }

        // Return the modified object
        return target;
    }

    function ready() {
        if(arguments.length == 1) $(arguments[0]);
        else (readyEvents || (readyEvents = new espresso.util.EventManager({ autofire: true }))).listen.apply(readyEvents, arguments);
    }

    function objectExists(name, root) {
        if(!name) return name;
        var path = name instanceof Array ? name : name.split('.'), o = root || ctx, next;
        while(next = path.shift())
            if(!o[next]) return false;
            else o = o[next];
        return true;
    }

    function configure(cfg) {
        if(typeof cfg == 'string') cfg = flatten(config)[cfg];
        else cfg = cfg ? $.extend(true, config, cfg) : $.extend(true, {}, config);
        cfg.jQueryNoConflict && $.noConflict(true);
        return cfg;
    }

    function args(arrrrgz) {
        return Array.prototype.slice.call(arrrrgz || arguments.callee.caller.arguments);
    }

    function use(packages, callback, loader) {
        var cfg = $.extend(true, {}, config.loader, loader || {}),
            queue = [], args = [];

        function done() {
            queue.pop().apply(null, args);
        }

        function toBool(val) {
            return val != false ? val != 'false' : !!val;
        }

        function decide(condition, fail, pass) {
            if(typeof condition != 'undefined') {
                if(typeof condition == 'string') try { if(!eval(condition.replace(constant('R_USE_NO_INVOKE'), ''))) return fail; } catch(e) {}
                else if(!condition) return fail;
            }

            return pass;
        }

        packages = $.map([].concat(packages), function(path, i) {
            var attrs = $.extend(true, {}, cfg), usingSlashes = false;

            path.replace(constant('R_USE_ATTRS'), function(a, b) {
                var attr = b.split('=');
                attrs[attr[0]] = attr[1] || true;
            });

            attrs = parseConfig(attrs);

            usingSlashes = constant('R_USE_HAS_SLASH').test(path);

            path = path
                .replace(constant('R_USE_REMOVE_STAR'), '')
                .replace(constant('R_USE_PATH'), '$1');

            queue.push(i == 0 ? callback || $.noop : $.noop);

            return decide(attrs.condition, done, function() {
                var p = attrs.alias || path,
                    objExists = objectExists(p),
                    test = toBool(attrs.test) && config.environment == espresso.util.Config.DefaultEnvironments.TEST,
                    file = [
                        (test ? attrs.testPath : attrs.vendor ? attrs.vendorPath : attrs.libPath || attrs.classPath).replace(constant('R_USE_ADD_SLASH'), '/'),
                        (usingSlashes && path || path.replace(constant('R_USE_DOT'), '/'))
                            .replace(constant(toBool(attrs.prefix) ? 'R_USE_LAST_SLASH' : 'R_USE_NOTHING'), '/' + (attrs.prefix || '') + '$1'),
                        test ? attrs.testSuffix : '',
                        toBool(attrs.version) ? attrs.versionSuffix : '',
                        toBool(attrs.bundled) ? attrs.bundleSuffix : '',
                        toBool(attrs.compressed) && !test ? attrs.compressSuffix : '',
                        attrs.extension
                    ].join('');

                args[i] = namespace(p);

                if(!attrs.force && (used[file] || objExists) && !args[i].__pending__) done();
                else {
                    args[i].__pending__ = true;

                    $.getScript(file, function() {
                        args[i] = used[file] = namespace(p);
                        args[i].__pending__ = undefined;
                        delete args[i].__pending__;
                        // if no pending dependencies, then
                        if(!pending[p]) done();
                        // else, add `done` reference to dep manager (use `p` for lookup)
                        else pending[p].ready = done;
                    });
                }
            });
        });

        while(packages.length) packages.shift()();

        return args.length == 1 ? args[0] : args;
    }

    function report(type, klass, method, task, message) {
        log(substitute(constant('LOGGING_TPL'), {
            type: type,
            task: task,
            klass: klass,
            method: method,
            message: message
        }));
    }

    function error(klass, method, task, message) {
        throw new Error(substitute(constant('LOGGING_TPL'), {
            type: 'ERROR',
            task: task,
            klass: klass,
            method: method,
            message: message
        }));
    }

    function log() {
        Array.prototype.shift.call(arguments) >= config.debug.logging && ((ctx.console && ctx.console.log) || $.noop).apply(ctx.console || null, arguments);
    }

    log.curry = function(level) {
        return function() { log.apply(null, [level || 0].concat(Array.prototype.slice.call(arguments))); };
    };

    // We can't wrap the console.log method in IE because window.console.log is an object (not a function) and thus does not have an apply method
    function logger(log) {
        return !ctx.console ? $.noop : (ie ? ctx.console.log : log);
    }

    function copy(fn) {
        return function() { return fn.apply(this, arguments); };
    }

    function createClass() {
        if(typeof arguments[0] != 'string') Array.prototype.unshift.apply(arguments, [null]);
        return lang.Class.create.apply(lang.Class, arguments);
    }

    function assignAll(o) {
        $.each(o, assign);
    }

    function instanceOf(obj, klass) {
        return obj.instanceOf && obj.instanceOf(klass);
     }

    function vector() {
        var v = [];
        espresso.$.each(args(), function(i, a) { v[a[0]] = a[1]; });
        return v;
    }

    var lang = espresso.lang = {
        /**
         * @class
         * @static
         */
        Namespace: {
            /**
             * @methodOf espresso.lang.Namespace
             * @param {String} name
             * @param {Object} root
             */
            create: namespace

        },

        /**
         * @class
         * @static
         */
        Error: {

            create: function(path, message, root) {
                var error = (path = path.split('.')).pop();
                return namespace(path, root)[error] = function() {
                    var o = {};
                    $.each(arguments, function(i, arg) { o[i] = arg; });
                    return Error(substitute(message, o));
                };
            }

        },

        /**
         * @class
         * @static
         */
        Class: {

            alias: function(path, klass, filter, root) {
                var alias = (path = path.split('.')).pop();
                return namespace(path, root)[alias] = function(v) {
                    if(filter) filter(v);
                    return new klass(v);
                };
            },

            create: function(fqid, constructor, options, root) {
                var self,
                    path = fqid ? fqid.split('.') : ['[anonymous]'],
                    className = path.pop(),
                    o = options || {},
                    abstrakt = o.Abstract,
                    extenze = o.Extends || lang.Object,
                    deps = [].concat(typeof extenze == 'string' ? extenze : [] , o.Dependencies || []),
                    instance = null;

                function create() {
                    return function(link) {
                        if(o.Singleton && instance) return instance;
                        else if(!link && !(this instanceof arguments.callee)) return new arguments.callee;

                        var newClass = constructor.apply(this, [$, require, _, Backbone]) || {}, konstructors;

                        self = this;
                        self.__constructors__ = [];
                        self.__parents__ = [];
                        self.__classID__ = self.__classID__ || fqid;

                        if(typeof extenze == 'string') extenze = namespace(extenze.replace(constant('R_USE_PATH'), '$1'));

                        if(abstrakt && !link) error('espresso.lang.Class', 'create', 'Instantiating class', 'Cannot instantiate abstract class ' + fqid);
                        else if(extenze) extend(true, extenze.apply(this, [{ __child__:newClass }]) || {}, newClass);

                        if(link !== null && typeof link == 'object' && link.__child__) {
                            for(var m in abstrakt)
                                if(typeof abstrakt[m] == 'function' && !link.__child__[m])
                                    error('espresso.lang.Class', 'create', 'Validating implementation of abstract class', 'Method ' + fqid + '@' + m + ' must be implemented.');

                            self.__constructors__.push({ konstructor:newClass[className] || $.noop, name:className });
                            self.__parents__.push(fqid);

                            link.__child__['@parent'] = function(m) {
                                return newClass[m]
                                    ? newClass[m].apply(newClass, Array.prototype.shift.apply(arguments) && arguments)
                                    : newClass[(''+arguments.callee.caller).replace(constant('R_FUNC_NAME'), '$1')].apply(newClass, arguments);
                            };
                        } else {
                            konstructors = (function() {
                                var k = self.__constructors__, r = [className];
                                for(var i = 0; i < k.length; ++i) r.push(k[i].name);
                                return r;
                            })();

                            (extend(true, self, newClass))['@super'] = function() { return self.__constructors__.pop().konstructor.apply(self, arguments); };
                            (newClass[className] || $.noop).apply(self, arguments);

                            for(var i = 0; i < konstructors.length; ++i) delete self[konstructors[i]];

                            self.__parents__.push(fqid);

                            self
                                .__setParents(self.__parents__)
                                .__setClassID(self.__classID__)
                                .__clean(className)
                                .__cleanAll();

                            if(o.Singleton) instance = self;
                        }

                        return extend(true, self, newClass);
                    }
                }

                if(deps.length) {
                    // mark `deps` as `pending`
                    pending[fqid] = extend(true, pending[fqid] || {}, { dependencies: deps });
                    // fetch dependencies
                    use(deps, function() {
                        // call `ready` callback when dependencies have been loaded
                        pending[fqid] && pending[fqid].ready && pending[fqid].ready();
                        // unmark pending dependencies
                        pending[fqid] = null;
                        delete pending[fqid];
                    });
                }

                return fqid ? namespace(path, root)[className] = create() : create();
            }

        },

        /**
         * @class
         * @static
         */
        Interface: {

            create:function(fqid, iface) {
                return lang.Class.create(fqid, $.noop, { Abstract:iface });
            }

        },

        /**
         * @class
         * @static
         */
        Package: {

            use: function(packages, callback, loader) {
                return use(packages, typeof callback == 'function' ? callback : function() {
                    readyEvents && readyEvents.fire(callback);
                }, loader);
            }

        }

    };

    lang.Class.create('espresso.lang.Object', function($) {
        var id, parents;

        /**
         * @lends espresso.lang.Object.prototype
         */
        return {
            /**
             * @constructs
             */
            Object: function() {},

            /** @ignore */
            __setParents: function(_parents) {
                parents = _parents || [];
                return this;
            },

            /** @ignore */
            __setClassID: function(_id) {
                id = _id;
                return this;
            },

            /** @ignore */
            __clean: function(garbage) {
                this[garbage] = undefined;
                delete this[garbage];
                return this;
            },

            /** @ignore */
            __cleanAll: function() {
                var trash = ['__parents__', '__setParents', '__constructors__', '__classID__', '__setClassID', '@super', '__cleanAll', '__clean'], garbage;
                while(garbage = trash.shift()) this.__clean(garbage);
                return this;
            },

            getClassID: function() {
                return id;
            },

            /**
             * @param {String|espresso.lang.Object} klass
             * @return {Boolean}
             */
            instanceOf: function(klass) {
                return $.inArray(typeof klass == 'string' ? klass : klass.getClassID(), parents) > -1;
            }

        };

    });

    assignAll({
        /**
         * @name constant
         * @methodOf espresso
         * @param {String} name
         * @param {mixed} value
         * @returns {mixed}
         */
        'espresso.constant':     function(c, v) { return constant(c, v, constants); },
        /**
         * @name jQuery
         * @fieldOf espresso
         * @type {jQuery}
         */
        'espresso.jQuery':       $,
        /**
         * @name $
         * @fieldOf espresso
         * @see espresso.jQuery
         */
        'espresso.$':            $,
        /**
         * @name load
         * @methodOf espresso
         * @see <a href="http://api.jquery.com/load/" target="_blank">jQuery .load()</a>
         */
        'espresso.load':         $.getScript,
        /**
         * @name log
         * @methodOf espresso
         */
        'espresso.log':          logger(log),
        /**
         * @name debug
         * @methodOf espresso
         */
        'espresso.debug':        logger(log.curry(0)),
        /**
         * @name warn
         * @methodOf espresso
         */
        'espresso.warn':         logger(log.curry(1)),
        /**
         * @name error
         * @methodOf espresso
         */
        'espresso.error':        logger(log.curry(2)),
        /**
         * @name trace
         * @methodOf espresso
         */
        'espresso.trace':        logger(log.curry(3)),
        /**
         * @name report
         * @methodOf espresso
         */
        'espresso.report':       report,
        /**
         * @name args
         * @methodOf espresso
         */
        'espresso.args':         args,
        /**
         * @name curry
         * @methodOf espresso
         */
        'espresso.curry':        curry,
        /**
         * @name copy
         * @methodOf espresso
         */
        'espresso.copy':         copy,
        /**
         * @name lambda
         * @methodOf espresso
         */
        'espresso.lambda':       lambda,
        /**
         * @name vector
         * @methodOf espresso
         */
        'espresso.vector':       vector,
        /**
         * @name reflect
         * @methodOf espresso
         */
        'espresso.reflect':      curry(flatten, [espresso]),
        /**
         * @name ready
         * @methodOf espresso
         */
        'espresso.ready':        ready,
        /**
         * @name die
         * @methodOf espresso
         */
        'espresso.die':          die,
        /**
         * @name flatten
         * @methodOf espresso
         */
        'espresso.flatten':      flatten,
        /**
         * @name which
         * @methodOf espresso
         */
        'espresso.which':        which,
        /**
         * @name extend
         * @methodOf espresso
         */
        'espresso.extend':       extend,
        /**
         * @name substitute
         * @methodOf espresso
         */
        'espresso.substitute':   substitute,
        /**
         * @name capitalize
         * @methodOf espresso
         */
        'espresso.capitalize':   capitalize,
        /**
         * @name capitalize
         * @methodOf espresso
         */
        'espresso.camelcase':   camelcase,
        /**
         * @name trim
         * @methodOf espresso
         */
        'espresso.trim':         trim,
        /**
         * @name objectExists
         * @methodOf espresso
         */
        'espresso.objectExists': objectExists,
        /**
         * @name instanceOf
         * @methodOf espresso
         */
        'espresso.instanceOf':   instanceOf,
        /**
         * @name config
         * @methodOf espresso
         */
        'espresso.config':       configure,
        /**
         * @name parseConfig
         * @methodOf espresso
         */
        'espresso.parseConfig':  parseConfig,
        /**
         * @name require
         * @deprecated Since version 0.3.0; use {@link espresso.use} instead
         * @methodOf espresso
         * @see espresso.use
         */
        'espresso.require':      require,
        /**
         * @name use
         * @methodOf espresso
         * @see espresso.lang.Package.use
         */
        'espresso.use':          isCommonJS ? require : lang.Package.use,
        /**
         * @name version
         * @methodOf espresso
         */
        'espresso.version':      lambda(VERSION),
        /**
         * @name espresso.Static
         * @class
         * @constructor
         */
        'espresso.Static':       assign,
        /**
         * @name espresso.Class
         * @class
         * @constructor
         * @see espresso.lang.Class.create
         */
        'espresso.Class':        createClass,
        /**
         * @name espresso.Namespace
         * @class
         * @constructor
         * @see espresso.lang.Namespace.create
         */
        'espresso.Namespace':    lang.Namespace.create,
        /**
         * @name espresso.Package
         * @class
         * @constructor
         * @see espresso.Namespace
         */
        'espresso.Package':      lang.Namespace.create,
        /**
         * @name espresso.Error
         * @class
         * @constructor
         * @see espresso.lang.Error.create
         */
        'espresso.Error':        lang.Error.create,
        /**
         * @name espresso.Alias
         * @class
         * @constructor
         * @see espresso.lang.Class.alias
         */
        'espresso.Alias':        lang.Class.alias,
        /**
         * @name espresso.Interface
         * @class
         * @constructor
         * @see espresso.lang.Interface.create
         */
        'espresso.Interface':    lang.Interface.create,

        'espresso.plugins':      {}
    });

})(
    this.espressoConfig,
    this.undefined,
    this,
    typeof global != 'undefined',
    this.espresso,
    this.jQuery || this.$,
    this.require,
    this._,
    this.Backbone
);

/**
 * @package espresso.util.Config
 * @author peteromano
 * @version 1.0.0
 */
;(function(espresso) {

espresso.Static('espresso.util.Config.DefaultEnvironments', {
    PROD:   'prod',
    DEV:    'dev',
    TEST:   'test'
});

espresso.Static('espresso.util.Config.LoggingLevels', {
    DEBUG:   0,
    WARN:    1,
    ERROR:   2
});

})(this.espresso);

/**
 * @package espresso.util
 * @author peteromano
 * @version 1.0.0
 */
;(function(espresso) {

espresso.Interface('espresso.util.TwoDIterator', {
    left:         function() {},
    right:        function() {},
    up:           function() {},
    down:         function() {},
    upleft:       function() {},
    upright:      function() {},
    downleft:     function() {},
    downright:    function() {}
});

espresso.Class('espresso.util.DataModel', function($) {
    var self = null;

    function build(data) {
        $.each(data, function(key, value) {
            self[ ['get', espresso.capitalize(espresso.camelcase(key))].join('') ] = function() {
                return value;
            }
        });
    }

    /**
     * @lends espresso.util.DataModel.prototype
     */
    return {
        /**
         * @constructs
         * @param data
         * @augments espresso.lang.Object
         */
        DataModel: function(data) {
            self = this;
            build(data);
            return this;
        }

    };

});

espresso.Class('espresso.util.EventManager', function($) {

    var events,
        eventData,
        config = {
            autofire: false     // if true, after fire() is called once, all future listeners will be immediately autofired
        };

    function createType(type, fn) {
        var queue = new espresso.collections.EventQueue(fn);
        events.put(type, queue);
        return queue;
    }

    return {

        EventManager: function(cfg) {
            $.extend(config, cfg);
            events = new espresso.collections.HashMap;
            eventData = new espresso.collections.HashMap;
        },

        listen: function(type, fn, first) {
            var queue = events.get(type), data;
            if(!queue) createType(type, fn);
            else {
                queue.add(fn, first);
                if(config.autofire && queue.hasFired()) {
                    data = eventData.get(type);
                    queue.flush(data.args, data.scope);
                }
            }
            return this;
        },

        fire: function(type, args, scope, persist) {
            var queue = events.get(type);
            if(!queue) queue = createType(type);
            queue.flush(args, scope, persist);
            eventData.put(type, {
                args: args,
                scope: scope
            });
            return this;
        }

    };

});

})(this.espresso);

/**
 * @package espresso.collections
 * @author peteromano
 * @version 1.0.0
 */
;(function(espresso) {

function empty() {}

espresso.Interface('espresso.collections.List', {
    add: empty,
    get: empty,
    remove: empty,
    size: empty,
    isEmpty: empty
});

/**
 * @package espresso.collections
 * @class LinkedList
 * @author Robby Pelssers
 *
 * Code was taken from the net and ported to espresso framework
 */
espresso.Class('espresso.collections.LinkedList', function($) {
    /**
     * @private
     */
    var _list;

    /**
     * @public
     */
    return {
        /**
         * @constructor
         */
        LinkedList:function (list) {
            _list = list || [];
        },

        //Returns the number of objects in this list.
        size: function() {
            return _list.length;
        },

        //Adds the object at the specified index or at the end of the list if index is null. Returns the index at which the object is added.
        add: function(object, index) {
            if (index == null) {
                _list.push(object);
                return this.size() - 1;
            } else {
                if (index < 0 || index >= _size()) {
                throw new espresso.collections.LinkedList.IndexOutOfBoundsException(index);
                }
                _list.splice(index, 0, object);
                return index;
            }
        },

        //Returns the object at the specified index in this list.
        get: function(index) {
            if (index < 0 || index >= this.size()) {
                throw new espresso.collections.LinkedList.IndexOutOfBoundsException(index);
            }
            return _list[index];
        },

        //Replaces the object at the specified index.
        replace: function(object, index) {
            if (index < 0 || index >= this.size()) {
                throw new espresso.collections.LinkedList.IndexOutOfBoundsException(index);
            }
            _list[index] = object;
        },

        //Removes the object at the specified index.
        remove: function(index) {
            if (index < 0 || index >= this.size()) {
                throw new espresso.collections.LinkedList.IndexOutOfBoundsException(index);
            }
            _list.splice(index, 1);
        },

        //Returns the first object in this list.
        getFirst: function() {
            if (this.isEmpty()) {
                throw new espresso.collections.LinkedList.NoSuchElementException;
            }
            return this.get(0);
        },

        //Returns the last object in this list.
        getLast: function() {
            if (this.isEmpty()) {
                throw new espresso.collections.LinkedList.NoSuchElementException;
            }
            return this.get(this.size() - 1);
        },

        //Returns true if this list is empty.
        isEmpty: function() {
            return this.size() == 0;
        },

        //Removes all objects from this list.
        clear: function() {
            var size = this.size();
            if (size > 0) {
                _list.splice(0, size);
            }
        },

        //Returns an array containing all of the objects in this list in the correct order.
        toArray: function() {
            return _list.slice(0);
        },

        //Returns a new Array containing references to the objects of this list
        clone: function() {
            return new espresso.collections.LinkedList(this.isEmpty() ? null : this.toArray());
        }

    };

}, { Extends: espresso.collections.List });

/**
 * @exception espresso.collections.LinkedList.IndexOutOfBoundsException
 */
espresso.Error('espresso.collections.LinkedList.IndexOutOfBoundsException', 'Index {0} out of bounds on espresso.collections.LinkedList object');

/**
 * @exception espresso.collections.LinkedList.NoSuchElementException
 */
espresso.Error('espresso.collections.LinkedList.NoSuchElementException', 'No such element exists on espresso.collections.LinkedList object.');

/**
 * Iterative sparsed matrix. Implemented as a hashmap of nodes
 * keyed off by their logical positions.
 *
 * @package espresso.collections
 * @class SparsedMatrix
 */
espresso.Class('espresso.collections.SparsedMatrix', function($) {

    var self, iterator, nodes, length;

    function getKey(x, y) {
        return [x, y].join(',');
    }

    function getAdjacentNodes(x, y) {
        function curriedGetNode(x, y) {
            return function() { return getNode(x, y); };
        }

        return {
            up:           curriedGetNode(x, y-1),
            left:         curriedGetNode(x-1, y),
            down:         curriedGetNode(x, y+1),
            right:        curriedGetNode(x+1, y),
            upright:      curriedGetNode(x+1, y-1),
            upleft:       curriedGetNode(x-1, y-1),
            downright:    curriedGetNode(x+1, y+1),
            downleft:     curriedGetNode(x-1, y+1),
            current:      curriedGetNode(x, y)
        };
    }

    function getNode(x, y) {
        return nodes[getKey(x, y)] || setNode(x, y);
    }

    function setNode(x, y, data) {
        var key = getKey(x, y), node = nodes[key];
        if(!node) ++length;
        return nodes[key] = new Node(x, y, data || null);
    }

    function setIterator(x, y) {
        iterator = getAdjacentNodes(x, y);
    }

    function resetIterator() {
        setIterator(0, 0);
    }

    function curriedMove(direction) {
        return function() { return self.move.call(self, direction); };
    }

    function Node(x, y, data) {
        this.x = x;
        this.y = y;
        this.data = data;
     }

    return {

        SparsedMatrix: function() {
            self = this.clear();
        },

        get: function(x, y) {
            if(arguments.length == 0) return iterator.current().data;
            else return getNode(x, y).data;
        },

        set: function(x, y, data) {
            var current;

            if(arguments.length <= 1) {
                data = arguments[0];
                current = iterator.current();
                x = current.x;
                y = current.y;
            } else {
                setIterator(x, y);
            }

            setNode(x, y, data);
            return this;
        },

        clear:function() {
            nodes = {};
            length = 0;
            resetIterator();
            return this;
        },

        length:function() {
            return length;
        },

        position: function() {
            var current = iterator.current();
            return {
                x: current.x,
                y: current.y
            };
        },

        move: function(x, y) {
            var node;

            if(arguments.length == 1) {
                node = iterator[arguments[0]]();
                x = node.x;
                y = node.y;
            }

            setIterator(x, y);
            return this;
        },

        toString: function() {
            var nds = [];
            for(var node in nds) nds.push('{' + node + '}');
            return [
                "Length: " + length,
                // calling any function on the iterator calls getNode() which will implicitly create a node, so just check the length first
                "Iterator: " + (length ? ('{' + iterator.current().x + ',' + iterator.current().y + '}') : 'null'),
                "Nodes: " + nds.join(', ')
            ].join('\n');
        },

        debug: function(logger) {
            if(logger) {
                logger('Length', length);
                // calling any function on the iterator calls getNode() which will implicitly create a node, so just check the length first
                logger('Iterator', length ? { x: iterator.current().x, y: iterator.current().y } : null);
                logger('Nodes', nodes);
            }
        },

        up:           curriedMove('up'),
        left:         curriedMove('left'),
        down:         curriedMove('down'),
        right:        curriedMove('right'),
        upright:      curriedMove('upright'),
        upleft:       curriedMove('upleft'),
        downright:    curriedMove('downright'),
        downleft:     curriedMove('downleft')

    };

}, {

    Extends: espresso.util.TwoDIterator

});

espresso.Static('espresso.collections.SparsedMatrix.DirectionsEnum', {
    UP:           'up',
    LEFT:         'left',
    DOWN:         'down',
    RIGHT:        'right',
    UP_LEFT:      'upleft',
    UP_RIGHT:     'upright',
    DOWN_LEFT:    'downleft',
    DOWN_RIGHT:   'downright'
});

/**
 * @package espresso.collections
 * @class HashMap
 * @author Robby Pelssers
 *
 * Code was taken from the net and ported to espresso framework
 */
espresso.Class('espresso.collections.HashMap', function($) {

    var __self = this, _map = {}, _keys, _values;

    function _addKeyValue(key, value) {
        var index = _keys.add(key);
        _values.add(value);
        _map[key] = index;
    }

    function _updateKeyValue(key, value) {
        var index = _map[key];
        //we only need to update the value
        _values.replace(value, index);
    }

    return {

        HashMap: function() {
            var LinkedList = espresso.collections.LinkedList;
            _keys = new LinkedList;
            _values = new LinkedList;
            return this;
        },

        //Associates the specified value with the specified key in this map.
        put: function(key, value) {
            //check if key exists
            if (_map[key]) {
                _updateKeyValue(key, value);
            } else {
                _addKeyValue(key, value);
            }
            return value;
        },

        add: function(key, value) {
            return this.put(key, value);
        },

        //Returns the value to which the specified key is mapped in this identity hash map, or null if the map contains no mapping for this key.
        get: function(key) {
            var index = _map[key];
            if (index == null) {
                return null;
            }
            return _values.get(index);
        },

        //Removes the mapping for this key from this map if present.
        remove: function(key) {
            if (!_map[key]) {
                return this;
            }
            var index = _map[key ];
            delete _map[key];
            _keys.remove(index);
            _values.remove(index);
            return this;
        },

        //Removes all mappings from this map.
        clear: function() {
            for (var key in _map) {
                delete _map[key];
            }
            _keys.clear();
            _values.clear();
        },

        //Returns an Array (clone)  of the keys contained in this map.
        getKeys: function() {
            return _keys.clone();
        },

        //Returns an Array (clone)  of the values contained in this map.
        getValues: function() {
            return _values.clone();
        },

        //Returns the number of key-value mappings in this map.
        size: function() {
            return _keys.size();
        },

        // Returns true if this map contains no key-value mappings.
        isEmpty: function() {
            return this.size() == 0;
        }

    };

}, { Extends: espresso.collections.List });

/**
 * @package espresso.collections
 * @class EventQueue
 * @author peteromano
 */
espresso.Class('espresso.collections.EventQueue', function($) {
    /**
     * @private
     */
    var _queue, _hasFired = false;

    function execute(dir) {
        if(_queue.length) return _queue[dir]()();
        else throw new espresso.collections.EventQueue.QueueDepletedException;
    }

    /**
     * @public
     */
    return {

        EventQueue:function(fn) {
            _queue = [];
            this.add(fn);
        },

        add:function(fn, first) {
            if(fn instanceof Array) for(var i = 0; i < fn.length; ++i) this.add(fn[i]);
            else if(typeof fn == 'function') _queue[first ? 'unshift' : 'push'](fn);
            return this;
        },

        flush:function(args, scope, persist) {
            var q = _queue, fn;
            persist && (q = [].concat(_queue));
            while(fn = q.shift()) fn.apply(scope, args instanceof Array ? args : [args]);
            _hasFired = true;
            return this;
        },

        step:function() {
            return execute('shift');
        },

        pop:function() {
            return execute('pop');
        },

        length:function() {
            return _queue.length;
        },

        hasFired: function() {
            return _hasFired;
        }

    };

});

/**
 * @exception espresso.collections.EventQueue.QueueDepletedException
 */
espresso.Error('espresso.collections.EventQueue.QueueDepletedException', 'The queue is empty. Nothing to execute.');

}(this.espresso));

/**
 * @package espresso.framework
 * @author peteromano
 */
;(function(espresso) {

var $ = espresso.$;

espresso.Class('espresso.framework.Session', function($) {

    return {

        Session: function() {

        }

    };

});

espresso.Class('espresso.framework.Process', function($) {
    var id, path, job, app, self;

    return {

        Process: function(_app, _path, _job) {
            self = this;
            path = _path;
            job = _job;
            app = _app;
            id = app.processes().add(this);
        },

        invoke: function(options) {
            var result;

            app.getService((path = path.split('.')).shift(), function(worker) {
                options = options || {};
                worker = espresso.Namespace(path.join('.'), worker) || worker;
                result = worker[job].apply(worker, [].concat(options.args || [])) || new espresso.framework.ProcessResult;
                result.process(self);
                result.state(espresso.framework.Process.COMPLETE);
                (options.callback || $.noop)(result);
                app.processes().remove(this);
            });

            return result;
        },

        path: function() {
            return path;
        },

        command: function() {
            return job;
        },

        toString: function() {
            return ''+id;
        },

        valueOf: function() {
            return 1*id;
        }

    };

});

espresso.Static('espresso.framework.Process.READY', 0);
espresso.Static('espresso.framework.Process.COMPLETE', 1);

espresso.Class('espresso.framework.collections.Processes', function($) {
    var processes, history;

    return {

        Processes: function() {
            processes = {};
            history = [];
        },

        add: function(process) {
            var id = history.push([process.path(), process.command()]);
            processes[id] = process;
            return id;
        },

        remove: function(process) {
            processes[process] = undefined;
            delete processes[process];
        }

    };

});

espresso.Class('espresso.framework.ProcessResult', function($) {
    var data = {};

    function prop(k, v) {
        return data[k] = typeof v != 'undefined' ? v : data[k];
    }

    return {

        ProcessResult: function(value, options) {
            options = options || {};
            this.value(value);
            this.state(options.state || espresso.framework.Process.READY);
            this.session(options.session);
            this.assert(options.assert);
            this.process(options.process);
        },

        value: function(v) {
            return prop('value', v);
        },

        state: function(v) {
            return prop('state', v || data.value);
        },

        process: function(v) {
            return prop('process', v);
        },

        session: function(v) {
            espresso.extend(data, { session: v });
            return this;
        },

        assert: function(assertion, logger) {
            espresso.extend(data, { assert: [assertion, logger] });
            return this;
        }

    };

});

/**
 * @package espresso.framework
 * @class Application
 * @author peteromano
 */
espresso.Class('espresso.framework.Application', function($) {
    var self, name, context, workers, readyQueue, processes, session;

    var config = {};

    function processWorkers(workerConfig) {
        var parsed = espresso.parseConfig(workerConfig || {}), registry = parsed.registry;
        for(var worker in registry) workers.put(worker, registry[worker]);
        if(parsed.autoload) loadWorkers(parsed.autoload);
        else init();
    }

    function loadWorkers(names) {
        function map(fn) {
            return $.map(names, fn);
        }

        self.use(map(function(name) { return workers.get(name); }), function() {
            map(function(name) { loadWorker(name); });
            init();
        });
    }

    function loadWorker(name, callback) {
        return self.use(workers.get(name), function(worker) {
            (callback || $.noop)(
                worker.getInstance().initialize(self, espresso.parseConfig(config.services[name]))
            );
        });
    }

    function flush() {
        if(readyQueue.length()) readyQueue.flush();
    }

    function init() {
        self.initialize();
    }

    return {

        Application: function(_name, _config, workerConfig, _context) {
            var collections = espresso.collections,
                framework = espresso.framework;

            name = _name;
            context = _context;
            workers = new collections.HashMap;
            readyQueue = new collections.EventQueue;
            session = new framework.Session;
            processes = new framework.collections.Processes;
            self = this.setConfig(_config);

            processWorkers(workerConfig);

            return this;
        },

        setConfig: function(_config) {
            var espressoConfig = espresso.extend(true, (_config || {}).espresso, this.getContext().espressoConfig);
            espresso.config(espressoConfig);
            espresso.extend(true, config, espressoConfig || {}, _config);
            return this;
        },

        getContext: function() {
            return context;
        },

        getConfig: function() {
            return config;
        },

        getName: function() {
            return name;
        },

        loadService:function(name, callback) {
            loadWorker(name, callback);
            return this;
        },

        getService: function(name, callback) {
            var worker = loadWorker(name, callback);

            // espresso.use() returns an object even if the thing doesnt exist
            // (it opens up a namespace as a side-effect of querying).
            // Test for a class and return null if the class isnt there
            // (which means the class hasnt been downloaded yet)
            return typeof worker == 'function' ? worker.getInstance() : null;
        },

        use: function(pkg, callback, loader) {
            return espresso.use(pkg, callback, loader || config.loader);
        },

        domready: function(handler) {
            readyQueue.add(handler);
            $(flush);
            return this;
        },

        execute: function(path, job, options) {
            return new espresso.framework.Process(this, path, job).invoke(options);
        },

        processes: function() {
            return processes;
        },

        session: function() {
            return session;
        }

    };

}, {

    Abstract: {

        initialize: function(config, context) {},

        ready: function() {}

    }

});

/**
 * @package espresso.framework
 * @class Service
 * @author peteromano
 */
espresso.Class('espresso.framework.Service', function($) {

    return {

        Service: $.noop,

        registerComponent: function(name, instance) {
            this[espresso.capitalize(name)] = instance;
            return this;
        },

        hasComponent: function(name) {
            return !!this[espresso.capitalize(name)];
        }

    };

}, {

    Abstract: {

        initialize: function(app, config) {}

    }

});

var apps = {}, plugins = espresso.plugins;

function allyourbase(arebelongtous) {
    return arebelongtous || {};
}

function setGlobalConfig(config) {
    espresso.config(espresso.extend(true, (config || {}).espresso, espresso.config('context').espressoConfig));
}

plugins.Application = {

    create: function(name, app, options, context) {
        var loaded = false,
            configs, workers, defaultConfig,
            initialize,
            bootloader;

        options = allyourbase(options);
        configs = allyourbase(options.Configuration);
        workers = allyourbase(options.Services);
        defaultConfig = allyourbase(configs.Default);

        setGlobalConfig(defaultConfig);

        context = context || espresso.config('context');

        /**
         * TODO: Build cascading and selective config loading scheme
         */
        (app = app($))[name] = function() {
            return this['@super']( name, defaultConfig, workers, context);
        };

        initialize = espresso.copy(app.initialize);

        app.initialize = function() {
            if(loaded) return this;
            else loaded = true;
            initialize.call(this, this.getConfig(), context);
            return this;
        };

        bootloader = espresso.Class(name, function() { return app; }, {
            Dependencies: options.Dependencies,
            Extends: options.Extends || espresso.framework.Application,
            Singleton: true
        }, context);

        app = new bootloader;

        espresso.Static('getInstance', espresso.lambda(app), context[name]);

        return apps[name] = app.domready( $.proxy(app.ready, app) );
    }

};

plugins.Service = {

    create: function(fqid, worker, options) {
        var loaded = false,
            initialize = espresso.copy( (worker = worker($)).initialize ),
            wkr;

        worker.initialize = function() {
            if(loaded) return this;
            else loaded = true;
            initialize.apply(this, arguments);
            return this;
        };

        wkr = espresso.Class(fqid, espresso.lambda(worker), {
            Extends: (options = options || {}).Extends || espresso.framework.Service,
            Dependencies: options.Dependencies,
            Singleton: true
        });

        espresso.Static('getInstance', function() { return new this; }, wkr);

        return wkr;
    }

};

plugins.ProcessResult = function(value, options) {
    return new espresso.framework.ProcessResult(value, options);
};

espresso.Static('Application', plugins.Application.create, espresso);
espresso.Static('Service', plugins.Service.create, espresso);
espresso.Static('getApplication', function(name) { return apps[name] || null; }, espresso);
espresso.Static('ProcessResult', plugins.ProcessResult, espresso);

})(this.espresso);