/*!
 * Copyright 2015 Comcast Cable Communications Management, LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function(root, factory) {
  if(typeof define === 'function' && define.amd) {
    // For Require.js
    define('surfnperf', factory);
  } else if(typeof exports === 'object') {
    // For Browserify
    module.exports = factory(require('surfnperf'));
  } else {
    // Browser global if not using Require.js or Browserify
    root.surfnperf = factory();
  }
}(this, function() {

  /**
   * Date.now() shim for older browsers
   */
  if(!Date.now) {
    Date.now = function now() {
      return new Date().getTime();
    };
  }

  /** 
   * Takes in an object and provides the object default property values
   * if property not defined in the object
   *
   * @name defaults
   * @function
   * @access public
   * @memberOf SurfNPerf
   * @param {Object} o - Object to initialize to default values
   * @param {Object} d - Object with default value properties
   */

  var defaults = function(o, d) {
      for(var prop in d) {
        if(!o.hasOwnProperty(prop)) {
          o[prop] = d[prop];
        }
      }
    },
    /** 
     * Checks if a given value is present in the inputted array
     *
     * @name contains
     * @function
     * @access public
     * @memberOf SurfNPerf
     * @param {Array} array - Array to check
     * @param {} value - Object with default value properties
     * @returns {boolean} Boolean indicating whether the given value is present in the inputted array
     */
    contains = function(array, value) {
      if(Array.prototype.indexOf) {
        return array.indexOf(value) != -1;
      } else {
        var i, length = array.length;
        for(i = 0; i < length; i++) {
          if(array[i] === value) {
            return true;
          }
        }
        return false;
      }
    };

  /**
   * Frontend Web Performance Data Gathering
   *
   * @class SurfNPerf
   */
  var SurfNPerf = function() {
      this._data = {
        custom: {},
        marks: {},
        highResMarks: {},
        events: {}
      };

      this._navigationTiming = null;
      this._highResTime = null;
      this._userTiming = null;

      this._navigationTimingEvents = {
        a: ["navigationStart", "unloadEventEnd", "unloadEventStart", "redirectStart", "redirectEnd", "fetchStart", "domainLookupStart", "domainLookupEnd", "connectStart", "secureConnectionStart", "connectEnd", "requestStart", "responseStart", "responseEnd", "domLoading"],
        b: ["domInteractive", "domContentLoadedEventStart", "domContentLoadedEventEnd", "domComplete", "loadEventStart", "loadEventEnd"]
      };

      this.initialize();
    },
    SNPProto = SurfNPerf.prototype;

  /** 
   * Sets values for global variables _navigationTiming, _highResTime and _userTiming. If window.performance
   * is defined then the values are assigned according to window.performance values, else they are set to false
   *
   * @name setPerformanceApis
   * @function
   * @access private
   * @memberOf SurfNPerf
   */

  SNPProto._setPerformanceApis = function() {
    if(window.performance) {
      this._navigationTiming = !!(window.performance.timing);
      this._highResTime = !!(window.performance.now);
      this._userTiming = !!(window.performance.mark && window.performance.measure && window.performance.getEntriesByName);
    } else {
      this._navigationTiming = false;
      this._highResTime = false;
      this._userTiming = false;
    }
  };

  /**
   * Defines Window.SURN_N_PERF object if it is undefined or its marks property is undefined
   *
   * @name setPerfProperties
   * @function
   * @access private
   * @memberOf SurfNPerf
   */

  SNPProto._setPerfProperties = function() {
    if(!window.SURF_N_PERF || !window.SURF_N_PERF.marks) {
      window.SURF_N_PERF = {
        marks: {},
        highResMarks: {}
      };
    }
  };

  /** 
   * Sets a key value pair in the custom global object. The key is 'initialUrl' and the value is the
   * pathname on the browser window
   *
   * @name _setInitialUrl
   * @function
   * @access private
   * @memberOf SurfNPerf
   */

  SNPProto._setInitialUrl = function() {
    this.setCustom('initialUrl', window.location.pathname);
  };

  /** 
   * Initializes the SURF_N_PERF instance in the browswer by setting Performance APIs,
   * creating appropriate objects and their values
   *
   * @name initialize
   * @function
   * @access public
   * @memberOf SurfNPerf
   */

  SNPProto.initialize = function() {
    this._setPerformanceApis();
    this._setPerfProperties();
    this._setInitialUrl();
  };

  /**
   * Returns the timing data for a particular eventKey
   *
   * @param {String} timeType 'highRes' (to return a DOMHighResTimeStamp, if available) or 'DOM' (to return a DOMTimeStamp's value) - optional. Defaults to 'highRes'
   * @returns {(DOMHighResTimeStamp | number)} time value
   * @memberOf SurfNPerf
   * @access public
   * @function
   */

  SNPProto.now = function(timeType) {
    timeType = timeType || 'highRes';
    if(this._highResTime && timeType === 'highRes') {
      return window.performance.now();
    } else {
      return Date.now();
    }
  };

  /** 
   * Returns window.performance.timing if navigationTiming is set to true, else an empty object
   *
   * @name performanceTiming
   * @function
   * @access public
   * @memberOf SurfNPerf
   * @returns {Object} Either window.performance.timing or empty object
   */

  SNPProto.performanceTiming = function() {
    return this._navigationTiming ? window.performance.timing : {};
  };

  /** 
   * Calculates the difference between when the loadEventEnd was fired and the inputted eventKey is fired
   *
   * @name performanceTimingL2
   * @function
   * @access private
   * @memberOf SurfNPerf
   * @param eventKey
   * @returns {number} A value >= 0
   */

  SNPProto._performanceTimingL2 = function(eventKey) {
    var delta = this.getTimingMark('loadEventEnd', 'DOM') - this.getTimingMark(eventKey, 'DOM'),
      value = window.SURF_N_PERF.highResMarks.loadEventEnd - delta;
    return(value < 0) ? 0 : this._round(value, {
      decimalPlaces: 10
    });
  };

  /**
   * Returns the timing data for a particular eventKey
   *
   * @param {string} eventKey - name of the timing event
   * @param {string} timeType - 'highRes' (to return a DOMHighResTimeStamp, if available) or 'DOM' (to return a DOMTimeStamp's value) - optional. Defaults to 'DOM'
   * @returns {(DOMHighResTimeStamp | number)} time value
   * @memberOf SurfNPerf
   * @access public
   * @function
   */

  SNPProto.getTimingMark = function(eventKey, timeType) {
    timeType = timeType || 'DOM';

    if(this._navigationTiming) {
      if(timeType === 'DOM' || this._highResTime === false) {
        return this.performanceTiming()[eventKey];
      } else { // timeType === 'HighRes'
        return this._performanceTimingL2(eventKey);
      }
    } else {
      if(contains(this._navigationTimingEvents.a, eventKey)) {
        return this.getMark('pageStart', 'DOM');
      } else {
        return this.getMark('loadEventEnd', 'DOM');
      }
    }
  };

  /** 
   * Returns window.performance if userTiming is set to true, else an empty object
   *
   * @name userTiming
   * @function
   * @access public
   * @memberOf SurfNPerf
   * @returns {Object} Either window.performance or empty object
   */

  SNPProto.userTiming = function() {
    return this._userTiming ? window.performance : {};
  };

  /** 
   * Sets the eventKey property of various data objects to the current time (also highResTime is the appropriate flag is set)
   *
   * @name mark
   * @function
   * @access public
   * @memberOf SurfNPerf
   * @param eventKey
   */

  SNPProto.mark = function(eventKey) {
    if(this._highResTime) {
      this._data.highResMarks[eventKey] = this.now();
    }
    if(this._userTiming) {
      this.userTiming().mark(eventKey);
    }
    this._data.marks[eventKey] = this.now('DOM');
  };

  /** 
   * Returns the mark (or timing mark) of the eventKey. The default timetype is 'highRes' is not specified
   *
   * @name getMark
   * @function
   * @access public
   * @memberOf SurfNPerf
   * @param eventKey
   * @param {string}
   * @returns {number} The time mark of the specified eventKey
   */

  SNPProto.getMark = function(eventKey, timeType) {
    var mark;

    timeType = timeType || 'highRes';

    if(timeType === 'highRes' && this._highResTime === true) {
      mark = this._data.highResMarks[eventKey] || window.SURF_N_PERF.highResMarks[eventKey];
    }
    return mark || this._data.marks[eventKey] || window.SURF_N_PERF.marks[eventKey];
  };

  /** 
   * Returns whether there exists a time mark for the inputted event key
   *
   * @name isTimingMark
   * @function
   * @access private
   * @memberOf SurfNPerf
   * @param eventKey
   * @returns {boolean} Whether there exists a timing mark for the event key
   */

  SNPProto._isTimingMark = function(eventKey) {
    return contains(this._navigationTimingEvents.a.concat(this._navigationTimingEvents.b), eventKey);
  };

  /** 
   * Returns
   *
   * @name getDurationMark
   * @function
   * @access private
   * @memberOf SurfNPerf
   * @param eventKey
   * @returns {number} Returns the mark of the event key or timing mark if the event key has a timing mark
   */

  SNPProto._getDurationMark = function(eventKey) {
    if(this._isTimingMark(eventKey)) {
      return this.getTimingMark(eventKey, 'highRes');
    } else {
      return this.getMark(eventKey);
    }
  };

  /** 
   * Rounds inputted number with the inputted format options
   *
   * @name round
   * @function
   * @access private
   * @memberOf SurfNPerf
   * @param {number} n - Number to be rounded
   * @param {Object} options - Options for rounding (like decimal places)
   * @returns {number} The inputted number rounded according to the input options
   */

  SNPProto._round = function(n, options) {
    options = options || {};
    var dp = options.decimalPlaces || 0;
    n = +(n);
    return n.toFixed ? +(n).toFixed(dp) : n;
  };

  /** 
   * Rounds the difference between the two input numbers with the inputted format options
   *
   * @name round
   * @function
   * @access private
   * @memberOf SurfNPerf
   * @param {number} a - First number
   * @param {number} b - Second number
   * @param {Object} options - Options for rounding (like decimal places)
   * @returns {number} The difference of inputted numbers rounded according to the input options
   */

  SNPProto._roundedDuration = function(a, b, options) {
    return this._round(b - a, options);
  };

  /** Create string that describes event measured
   *
   * @name _measureName
   * @function
   * @access private
   * @param a - start event
   * @param b - end event
   * @return {String} event measured
   * @memberOf SurfNPerf
   */
  SNPProto._measureName = function(a, b) {
    return '_SNP_' + a + '_TO_' + b;
  };

  /** Set measuring of event length
   *
   * @name _setMeasure
   * @function
   * @access private
   * @param a - start event
   * @param b - end event
   * @memberOf SurfNPerf
   */

  SNPProto._setMeasure = function(a, b) {
    try {
      this.userTiming().measure(this._measureName(a, b), a, b);
    } catch(e) {
      if(window.console && window.console.error) {
        if(e && e.message) {
          console.error("Surf-N-Perf Exception:", e.message);
        } else {
          console.error("Surf-N-Perf Exception: at least one of these events/marks is not available yet", a, b);
        }
      }
    }
  };

  /** Get duration of event
   *
   * @name _getMeasureDuration
   * @function
   * @access private
   * @param a - start event
   * @param b - end event
   * @return duration of event
   * @memberOf SurfNPerf
   */

  SNPProto._getMeasureDuration = function(a, b) {
    var measure = this.userTiming().getEntriesByName(this._measureName(a, b))[0] || {};
    return measure.duration;
  };

  /** Get duration of event and round according to options
   *
   * @name duration
   * @function
   * @access public
   * @param a - start event
   * @param b - end event
   * @param {Object} options - gives rounding places
   * @return rounded duration of event
   * @memberOf SurfNPerf
   */

  SNPProto.duration = function(a, b, options) {
    if(this._userTiming) {
      this._setMeasure(a, b);
      return this._round(this._getMeasureDuration(a, b), options);
    } else {
      return this._roundedDuration(this._getDurationMark(a), this._getDurationMark(b), options);
    }
  };

  /** Update event data
   *
   * @name updateEvent
   * @function
   * @access public
   * @param eventKey
   * @param key
   * @param value
   * @memberOf SurfNPerf
   */

  SNPProto.updateEvent = function(eventKey, key, value) {
    var obj = {};
    obj[eventKey] = {};

    defaults(this._data.events, obj);

    this._data.events[eventKey][key] = value;
  };

  /** Reset event data to given inputs
   *
   * @name resetEvent
   * @function
   * @access public
   * @param eventKey
   * @param key
   * @param value
   * @memberOf SurfNPerf
   */

  SNPProto.resetEvent = function(eventKey, key, value) {
    this._data.events[eventKey] = {};
    this._data.events[eventKey][key] = value;
  };

  /** Update event start time to current time
   *
   * @name eventStart
   * @function
   * @access public
   * @param eventKey
   * @memberOf SurfNPerf
   */

  SNPProto.eventStart = function(eventKey) {
    this.resetEvent(eventKey, 'start', this.now());
  };

  /** Update event end time to current time
   *
   * @name eventEnd
   * @function
   * @access public
   * @param eventKey
   * @param {Object} options
   * @memberOf SurfNPerf
   */

  SNPProto.eventEnd = function(eventKey, options) {
    var now = this.now(),
      key;

    options = options || {};

    for(key in options) {
      this.updateEvent(eventKey, key, options[key]);
    }

    this.updateEvent(eventKey, 'end', now);
  };

  /** Get event data if there is any
   *
   * @name getEventData
   * @function
   * @access public
   * @param eventKey
   * @param key
   * @return event data
   * @memberOf SurfNPerf
   */

  SNPProto.getEventData = function(eventKey, key) {
    var eventObj = this._data.events[eventKey];
    if(eventObj) {
      return eventObj[key];
    }
  };

  /** Get rounded total event time
   *
   * @name eventDuration
   * @function
   * @access public
   * @param eventKey
   * @param {Object} options - number of decimal places to round
   * @memberOf SurfNPerf
   */

  SNPProto.eventDuration = function(eventKey, options) {
    return this._roundedDuration(this.getEventData(eventKey, 'start'), this.getEventData(eventKey, 'end'), options);
  };

  /** Set data for custom properties
   *
   * @name setCustom
   * @function
   * @access public
   * @param custom event key
   * @param custom event value
   * @memberOf SurfNPerf
   */

  SNPProto.setCustom = function(key, value) {
    this._data.custom[key] = value;
  };

  /** Get data for custom properties
   *
   * @name getCustom
   * @function
   * @access public
   * @param custom event key
   * @returns custom event value
   * @memberOf SurfNPerf
   */

  SNPProto.getCustom = function(key) {
    return this._data.custom[key];
  };

  /**
   * Total time for App Cache, DNS & TCP
   *
   * @name getNetworkTime
   * @function
   * @access public
   * @returns {integer} time in ms
   * @memberOf SurfNPerf
   */
  SNPProto.getNetworkTime = function() {
    return this.duration('fetchStart', 'connectEnd');
  };

  /**
   * Total time for Request & Response
   *
   * @name getServerTime
   * @function
   * @access public
   * @returns {integer} time in ms
   * @memberOf SurfNPerf
   */
  SNPProto.getServerTime = function() {
    return this.duration('requestStart', 'responseEnd');
  };

  /**
   * Total time for App Cache, DNS, TCP, Request & Response
   *
   * @name getNetworkLatency
   * @function
   * @access public
   * @returns {integer} time in ms
   * @memberOf SurfNPerf
   */
  SNPProto.getNetworkLatency = function() {
    return this.duration('fetchStart', 'responseEnd');
  };

  /**
   * Total time to process the Response & fire the onLoad event
   *
   * @name getProcessingLoadTime
   * @function
   * @access public
   * @returns {integer} time in ms
   * @memberOf SurfNPerf
   */
  SNPProto.getProcessingLoadTime = function() {
    return this.duration('responseEnd', 'loadEventEnd');
  };

  /**
   * Total time for a page to load from the time the user initiates the access of the page to the firing of the onLoad event
   *
   * @name getFullRequestLoadTime
   * @function
   * @access public
   * @returns {integer} time in ms
   * @memberOf SurfNPerf
   */
  SNPProto.getFullRequestLoadTime = function() {
    return this.duration('navigationStart', 'loadEventEnd');
  };

  return new SurfNPerf();

}));
