// Marionette.Native
// -----------------

//     (c) 2015 Adam Krebs, Jimmy Yuen Ho Wong
//     (c) 2017 Luiz Américo
//     Marionette.Native may be freely distributed under the MIT license.
//     For all details and documentation:
//     https://github.com/blikblum/Marionette.Native

import _ from 'underscore'
import { View, CollectionView } from 'backbone.marionette'

// Cached regex to match an opening '<' of an HTML tag, possibly left-padded
// with whitespace.
var paddedLt = /^\s*</;

// Caches a local reference to `Element.prototype` for faster access.
var ElementProto = (typeof Element !== 'undefined' && Element.prototype) || {};

// Cross-browser event listener shims
var elementAddEventListener = ElementProto.addEventListener

var elementRemoveEventListener = ElementProto.removeEventListener

// Find the right `Element#matches` for IE>=9 and modern browsers.
var matchesSelector = ElementProto.matches ||
    ElementProto.webkitMatchesSelector ||
    ElementProto.mozMatchesSelector ||
    ElementProto.msMatchesSelector ||
    ElementProto.oMatchesSelector;

export var domApi = {
  // Lookup the `selector` string
  // Selector may also be a DOM element
  // Returns an array-like object of nodes
  getEl: function(selector) {
    return _.isObject(selector) ? [selector] : document.querySelectorAll(selector);
  },

  // Finds the `selector` string with the el
  // Returns an array-like object of nodes
  findEl: function(el, selector) {
    return el.querySelectorAll(selector);
  },

  // Detach `el` from the DOM without removing listeners
  detachEl: function(el) {
    if (el.parentNode) el.parentNode.removeChild(el);
  },

  // Replace the contents of `el` with the HTML string of `html`
  setContents: function(el, html) {
    if (html) el.innerHTML = html;
  },

  // Takes the DOM node `el` and appends the DOM node `contents`
  // to the end of the element's contents.
  appendContents: function(el, contents) {
    el.appendChild(contents);
  },

  // Remove the inner contents of `el` from the DOM while leaving
  // `el` itself in the DOM.
  detachContents: function(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }
};

// To extend an existing view to use native methods, extend the View prototype
// with the mixin: _.extend(MyView.prototype, Backbone.NativeViewMixin);
export var mixin = {

  Dom: _.extend({}, View.prototype.Dom, domApi),

  $: function(selector) {
    return this.el.querySelectorAll(selector);
  },

  _removeElement: function() {
    this.undelegateEvents();
    if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
  },

  // Apply the `element` to the view. `element` can be a CSS selector,
  // a string of HTML, or an Element node. If passed a NodeList or CSS
  // selector, uses just the first match.
  _setElement: function(element) {
    if (typeof element === 'string') {
      if (paddedLt.test(element)) {
        var el = document.createElement('div');
        el.innerHTML = element;
        this.el = el.firstChild;
      } else {
        this.el = document.querySelector(element);
      }
    } else if (element && element.length) {
      this.el = element[0];
    } else {
      this.el = element;
    }
    this.$el = [this.el];
  },

  // Set a hash of attributes to the view's `el`. We use the "prop" version
  // if available, falling back to `setAttribute` for the catch-all.
  _setAttributes: function(attrs) {
    for (var attr in attrs) {
      attr in this.el ? this.el[attr] = attrs[attr] : this.el.setAttribute(attr, attrs[attr]);
    }
  },

  // Make a event delegation handler for the given `eventName` and `selector`
  // and attach it to `this.el`.
  // If selector is empty, the listener will be bound to `this.el`. If not, a
  // new handler that will recursively traverse up the event target's DOM
  // hierarchy looking for a node that matches the selector. If one is found,
  // the event's `delegateTarget` property is set to it and the return the
  // result of calling bound `listener` with the parameters given to the
  // handler.
  delegate: function(eventName, selector, listener) {
    this._domEvents || (this._domEvents = []);
    if (typeof selector === 'function') {
      listener = selector;
      selector = null;
    }

    var root = this.el;
    var handler = selector ? function (e) {
      var node = e.target;
      for (; node && node !== root; node = node.parentNode) {
        if (matchesSelector.call(node, selector)) {
          e.delegateTarget = node;
          listener(e);
        }
      }
    } : listener;

    // remove namespace
    var dotIndex = eventName.indexOf('.')
    if (dotIndex > 0) eventName = eventName.slice(0, dotIndex).trim();

    elementAddEventListener.call(this.el, eventName, handler, false);
    this._domEvents.push({eventName: eventName, handler: handler, listener: listener, selector: selector});
    return handler;
  },

  // Remove a single delegated event. Either `eventName` or `selector` must
  // be included, `selector` and `listener` are optional.
  undelegate: function(eventName, selector, listener) {
    if (typeof selector === 'function') {
      listener = selector;
      selector = null;
    }

    if (this.el && this._domEvents) {
      var handlers = this._domEvents.slice();
      var i = handlers.length;
      while (i--) {
        var item = handlers[i];

        var match = item.eventName === eventName &&
            (listener ? item.listener === listener : true) &&
            (selector ? item.selector === selector : true);

        if (!match) continue;

        elementRemoveEventListener.call(this.el, item.eventName, item.handler, false);
        this._domEvents.splice(i, 1);
      }
    }
    return this;
  },

  // Remove all events created with `delegate` from `el`
  undelegateEvents: function() {
    if (this.el && this._domEvents) {
      for (var i = 0, len = this._domEvents.length; i < len; i++) {
        var item = this._domEvents[i];
        elementRemoveEventListener.call(this.el, item.eventName, item.handler, false);
      };
      this._domEvents.length = 0;
    }
    return this;
  }
};

export var NativeView = View.extend(mixin);

export var NativeCollectionView = CollectionView.extend(mixin);
