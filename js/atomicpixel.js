(function () {
  "use strict";
  var ENDPOINT = "https://atomictrackercollector-i5adxi4wfq-uc.a.run.app";
  var VISITOR_KEY = "atomic_pixel_visitor";
  var SESSION_KEY = "atomic_pixel_session";
  var QUEUE_KEY = "atomic_pixel_queue";
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  function now() {
    return Date.now();
  }

  function generateId() {
    return Math.random().toString(36).substring(2) + now().toString(36);
  }

  function getVisitorId() {
    try {
      var visitor = localStorage.getItem(VISITOR_KEY);
      if (!visitor) {
        visitor = generateId();
        localStorage.setItem(VISITOR_KEY, visitor);
      }
      return visitor;
    } catch (e) {
      return generateId();
    }
  }

  function getSessionData() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
    } catch (e) {
      return null;
    }
  }

  function saveSessionData(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  function createNewSession() {
    var s = {
      id: generateId(),
      lastActivity: now(),
    };
    saveSessionData(s);
    return s;
  }

  function getSessionId() {
    var s = getSessionData();
    if (!s) return createNewSession().id;
    if (now() - s.lastActivity > SESSION_TIMEOUT_MS)
      return createNewSession().id;
    s.lastActivity = now();
    saveSessionData(s);
    return s.id;
  }

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveQueue(arr) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(arr));
  }

  function enqueue(eventObj) {
    var q = getQueue();
    q.push(eventObj);
    saveQueue(q);
  }

  function trySend(events, callback) {
    if (!navigator.onLine || !events || !events.length) {
      callback(false);
      return;
    }
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events),
    })
      .then(function (res) {
        events.forEach(function (evt) {
          console.log("[AtomicPixel] Event sent:", evt);
        });
        callback(res.ok);
      })
      .catch(function () {
        callback(false);
      });
  }

  function flushQueue() {
    var q = getQueue();
    if (!q.length) return;
    trySend(q, function (success) {
      if (success) {
        saveQueue([]);
      }
    });
  }

  function hashString(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

  function getFingerprintId() {
    var stored = localStorage.getItem("atomic_pixel_fingerprint");
    if (stored) return stored;
    var ua = navigator.userAgent || "";
    var resolution = screen.width + "x" + screen.height;
    var language = navigator.language || "";
    var timezone = new Date().getTimezoneOffset();
    var str = ua + "|" + resolution + "|" + language + "|" + timezone;
    var fp = hashString(str);
    localStorage.setItem("atomic_pixel_fingerprint", fp);
    return fp;
  }

  function getBrowserName(ua) {
    ua = ua.toLowerCase();
    if (ua.indexOf("fban") > -1 || ua.indexOf("fbav") > -1)
      return "Facebook Browser";
    if (ua.indexOf("instagram") > -1) return "Instagram Browser";
    if (
      ua.indexOf("chrome") > -1 &&
      ua.indexOf("edg") === -1 &&
      ua.indexOf("opr") === -1
    )
      return "Chrome";
    if (ua.indexOf("safari") > -1 && ua.indexOf("chrome") === -1)
      return "Safari";
    if (ua.indexOf("firefox") > -1) return "Firefox";
    if (ua.indexOf("edg") > -1) return "Edge";
    if (ua.indexOf("opr") > -1) return "Opera";
    return "Unknown";
  }

  function getOSName(ua) {
    ua = ua.toLowerCase();
    if (ua.indexOf("android") > -1) return "Android";
    if (ua.indexOf("ios") > -1) return "iOS";
    if (ua.indexOf("windows nt") > -1) return "Windows";
    if (ua.indexOf("mac os x") > -1) return "Mac";
    if (ua.indexOf("macintosh") > -1) return "Mac";
    if (ua.indexOf("linux") > -1) return "Linux";
    return "Unknown";
  }

  function getDeviceType() {
    return window.innerWidth < 768 ? "mobile" : "desktop";
  }

  function getOrigin() {
    var params = {};
    var urlParams = new URLSearchParams(window.location.search);
    params.utm_source = urlParams.get("utm_source") || null;
    params.utm_medium = urlParams.get("utm_medium") || null;
    params.utm_campaign = urlParams.get("utm_campaign") || null;
    params.utm_term = urlParams.get("utm_term") || null;
    params.utm_content = urlParams.get("utm_content") || null;
    params.fbclid = urlParams.get("fbclid") || null;
    params.gclid = urlParams.get("gclid") || null;
    params.src = urlParams.get("src") || null;
    params.sck = urlParams.get("sck") || null;
    params.xcod = urlParams.get("xcod") || null;
    return params;
  }

  function sendEvent(eventType) {
    var ua = navigator.userAgent;

    console.log("location", location.hostname);

    var evt = {
      event_type: eventType,
      event_timestamp: now(),
      owner_id: getUid() || null,
      project_id: document.body.getAttribute("data-project") || null,
      funnel_id: document.body.getAttribute("data-funnel") || null,
      page_id:
        (document.body.getAttribute("data-page") || "").replace(/^_/, "") ||
        null,
      page_type: document.body.getAttribute("data-page-type") || null,
      page_category: document.body.getAttribute("data-page-category") || null,
      fingerprint_id: getFingerprintId(),
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      ip: null,
      country: null,
      city: null,
      browser_name: getBrowserName(ua),
      os_name: getOSName(ua),
      user_agent: ua,
      device_type: getDeviceType(),
      url: location.href || null,
      site: location.hostname || null,
      referrer: document.referrer || null,
      origin: getOrigin(),
    };
    console.log("[AtomicPixel] Prepared event:", evt);
    enqueue(evt);
    flushQueue();
  }

  function getUid() {
      try {
          const chunks = [...document.querySelectorAll('[class*="a-u-"]')]
              .map(el => {
                  const cls = [...el.classList].find(c => c.startsWith('a-u-'));
                  return cls && el.dataset.hex ? {
                      v: el.dataset.hex,
                      p: +cls.replace(/\D+/g, '')
                  } : null;
              })
              .filter(Boolean)
              .sort((a, b) => a.p - b.p)
              .map(c => c.v)
              .join('');
          if (chunks) return chunks;
      } catch (e) {}
      return document.body.id?.replace("_", "");
  }

  window.addEventListener("online", flushQueue);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) flushQueue();
  });

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    sendEvent("PageView");
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      sendEvent("PageView");
    });
  }

  // Add this function at the top level with other functions
  function debugLog(message, data = null) {
    // Store debug messages in localStorage with timestamp
    const debugKey = "atomic_pixel_debug";
    const timestamp = new Date().toISOString();
    const debugMessage = `[${timestamp}] ${message}`;

    try {
      let debugLogs = JSON.parse(localStorage.getItem(debugKey) || "[]");
      debugLogs.push(debugMessage);
      if (data) {
        debugLogs.push(JSON.stringify(data, null, 2));
      }
      // Keep only last 50 messages
      if (debugLogs.length > 50) {
        debugLogs = debugLogs.slice(-50);
      }
      localStorage.setItem(debugKey, JSON.stringify(debugLogs));
    } catch (e) {
      console.error("Failed to save debug log:", e);
    }

    // Also log to console
    console.log(debugMessage);
    if (data) {
      console.log(data);
    }
  }

  // Modify the checkout event listener
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".atomicat-checkout-button");
    console.log("btn", btn);

    if (!btn) {
      var parent = e.target.parentElement;
      while (parent) {
        if (
          parent.classList &&
          parent.classList.contains("atomicat-checkout-button")
        ) {
          btn = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }

    console.log("btn 1", btn);
    if (btn) {
      debugLog("[AtomicPixel] Detected InitiateCheckout click");

      var anchor = btn.tagName === "A" ? btn : btn.querySelector("a");
      console.log("anchor", anchor);

      if (
        !anchor ||
        !anchor.getAttribute("target") ||
        anchor.getAttribute("target") === "_self"
      ) {
        // Prevent default navigation
        e.preventDefault();

        var ua = navigator.userAgent;
        var evt = {
          event_type: "InitiateCheckout",
          event_timestamp: now(),
          owner_id: getUid() || null,
          project_id: document.body.getAttribute("data-project") || null,
          funnel_id: document.body.getAttribute("data-funnel") || null,
          page_id:
            (document.body.getAttribute("data-page") || "").replace(/^_/, "") ||
            null,
          page_type: document.body.getAttribute("data-page-type") || null,
          page_category:
            document.body.getAttribute("data-page-category") || null,
          fingerprint_id: getFingerprintId(),
          session_id: getSessionId(),
          visitor_id: getVisitorId(),
          ip: null,
          country: null,
          city: null,
          browser_name: getBrowserName(ua),
          os_name: getOSName(ua),
          user_agent: ua,
          device_type: getDeviceType(),
          url: location.href || null,
          site: location.hostname || null,
          referrer: document.referrer || null,
          origin: getOrigin(),
        };

        debugLog("[AtomicPixel] Sending checkout event", evt);

        // Send event synchronously before navigation
        try {
          var xhr = new XMLHttpRequest();
          xhr.open("POST", ENDPOINT, false); // Synchronous request
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.send(JSON.stringify([evt]));

          if (xhr.status === 200) {
            debugLog("[AtomicPixel] Checkout event sent successfully");
          } else {
            debugLog("[AtomicPixel] Failed to send checkout event", {
              status: xhr.status,
            });
          }
        } catch (error) {
          debugLog("[AtomicPixel] Error sending checkout event", error);
        }

        // Navigate after sending the event
        window.location.href = anchor.href;
      } else {
        // For other cases (like target="_blank"), use the normal async flow
        sendEvent("InitiateCheckout");
      }
    }
  });

  window.addEventListener("pagehide", function () {
    var pending = getQueue();
    if (!pending.length) return;

    // Use synchronous XMLHttpRequest for pending events too
    var xhr = new XMLHttpRequest();
    xhr.open("POST", ENDPOINT, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(pending));

    if (xhr.status === 200) {
      saveQueue([]);
    }
  });

  // Add this to your window.AtomicPixel object
  window.AtomicPixel = {
    track: function (type) {
      sendEvent(type);
    },
    flush: flushQueue,
    // Add debug function to view logs
    debug: function () {
      const debugKey = "atomic_pixel_debug";
      const logs = JSON.parse(localStorage.getItem(debugKey) || "[]");
      console.log("=== AtomicPixel Debug Logs ===");
      logs.forEach((log) => console.log(log));
      return logs;
    },
    // Clear debug logs
    clearDebug: function () {
      localStorage.removeItem("atomic_pixel_debug");
      console.log("AtomicPixel debug logs cleared");
    },
  };
})();
