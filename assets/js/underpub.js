/*!
 * Underpub.js - v2.0.0
 * Simple pubsub lib hooked into Underscore.js
 * Copyright 2013, TJ Eastmond - tj.eastmond@gmail.com
 * Underpub.js is freely distributable under the MIT license
 */

(function() {
  var PubSub, exports;

  PubSub = (function() {
    var publish, store, subscribe, unsubscribe, _remove;

    store = {};
    _remove = function(e, index) {
      var callbacks, cb, i, _i, _len;

      callbacks = store[e];
      store[e] = [];
      for (i = _i = 0, _len = callbacks.length; _i < _len; i = ++_i) {
        cb = callbacks[i];
        if (i !== index) {
          store[e].push(cb);
        }
      }
      return true;
    };
    publish = function(e, args) {
      var func, _i, _len, _ref;

      if (!store[e]) {
        return false;
      }
      if (store[e].length > 0) {
        _ref = store[e];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          func = _ref[_i];
          func.call(this, args);
        }
      }
      return true;
    };
    subscribe = function(e, callback) {
      if (!store[e]) {
        store[e] = [];
      }
      store[e].push(callback);
      return [e, callback];
    };
    unsubscribe = function(e, callback) {
      var cb, i, _i, _len, _ref;

      if (!store[e]) {
        return true;
      }
      _ref = store[e];
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        cb = _ref[i];
        if (cb === callback) {
          _remove(e, i);
        }
      }
      return true;
    };
    return {
      publish: publish,
      subscribe: subscribe,
      unsubscribe: unsubscribe
    };
  })();

  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = PubSub;
  } else {
    this.PubSub = PubSub;
  }

  if (typeof _ !== 'undefined' && _.mixin) {
    _.mixin({
      publish: PubSub.publish,
      subscribe: PubSub.subscribe,
      unsubscribe: PubSub.unsubscribe
    });
  }

}).call(this);
