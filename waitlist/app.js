/* DodoStays waitlist — form logic.
   Posts signups to the DodoStays API (Fly.io) which persists them to Postgres,
   and reads an aggregate count for social proof. No framework, no build step. */

(function () {
  "use strict";

  // Local dev (served on :8788 next to a locally-run API) vs production.
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API_BASE = isLocal ? "http://localhost:5080" : "https://dodostays-api.fly.dev";

  var HELP = {
    Traveller: "Early access to hand-picked stays across Mauritius — booking opens soon.",
    Host: "List your place at a low launch commission and reach guests who actually want Mauritius.",
  };
  var REGION_LABEL = {
    Traveller: 'Where do you want to stay? <span class="optional">optional</span>',
    Host: "Where's your property? <span class=\"optional\">optional</span>",
  };

  var form = document.getElementById("waitlist-form");
  var successEl = document.getElementById("success");
  var statusEl = document.getElementById("status");
  var socialEl = document.getElementById("social-proof");
  var helpEl = document.getElementById("audience-help");
  var regionLabel = document.getElementById("region-label");
  var submitBtn = document.getElementById("submit-btn");
  var successTitle = document.getElementById("success-title");
  var successBody = document.getElementById("success-body");
  var joinOtherBtn = document.getElementById("join-other");
  var yearEl = document.getElementById("year");

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function selectedAudience() {
    var checked = form.querySelector('input[name="audience"]:checked');
    return checked ? checked.value : "Traveller";
  }

  function syncAudienceCopy() {
    var aud = selectedAudience();
    if (helpEl) helpEl.textContent = HELP[aud];
    if (regionLabel) regionLabel.innerHTML = REGION_LABEL[aud];
  }

  form.querySelectorAll('input[name="audience"]').forEach(function (r) {
    r.addEventListener("change", syncAudienceCopy);
  });
  syncAudienceCopy();

  // --- Social proof --------------------------------------------------------
  function renderStats(total) {
    if (!socialEl) return;
    if (typeof total !== "number") {
      socialEl.textContent = "";
      return;
    }
    if (total <= 0) {
      socialEl.textContent = "Be among the first on the list.";
    } else {
      socialEl.innerHTML =
        "Join <strong>" + total.toLocaleString() + "</strong> " +
        (total === 1 ? "person" : "people") + " already on the list.";
    }
  }

  function loadStats() {
    fetch(API_BASE + "/api/waitlist/stats", { headers: { accept: "application/json" } })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (s) {
        if (s && typeof s.total === "number") renderStats(s.total);
      })
      .catch(function () {
        /* social proof is best-effort; stay silent on failure */
      });
  }
  loadStats();

  // --- Submit --------------------------------------------------------------
  function showError(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.remove("ok");
    statusEl.hidden = false;
  }

  function firstValidationError(problem) {
    try {
      if (problem && problem.errors) {
        var keys = Object.keys(problem.errors);
        if (keys.length) {
          var v = problem.errors[keys[0]];
          return Array.isArray(v) ? v[0] : String(v);
        }
      }
    } catch (e) {
      /* fall through */
    }
    return null;
  }

  function utmSource() {
    try {
      var p = new URLSearchParams(location.search);
      var utm = p.get("utm_source") || p.get("ref");
      if (utm) return utm.slice(0, 500);
      return document.referrer ? document.referrer.slice(0, 500) : null;
    } catch (e) {
      return null;
    }
  }

  function showSuccess(dto, email, audience) {
    form.hidden = true;
    successEl.hidden = false;

    if (dto && dto.alreadyOnList) {
      successTitle.textContent = "You're already on the list.";
      successBody.textContent = "We've got " + email + " saved. We'll email you when we open.";
    } else {
      successTitle.textContent = "You're on the list.";
      successBody.textContent = "We'll email " + email + " the moment early access opens.";
    }

    // Offer the other side of the marketplace.
    var other = audience === "Host" ? "Traveller" : "Host";
    var otherLabel =
      other === "Host" ? "Also want to host? Join as a host" : "Also want to book? Join as a traveller";
    joinOtherBtn.textContent = otherLabel;
    joinOtherBtn.hidden = false;
    joinOtherBtn.onclick = function () {
      var otherRadio = document.getElementById(other === "Host" ? "aud-host" : "aud-traveller");
      if (otherRadio) otherRadio.checked = true;
      syncAudienceCopy();
      document.getElementById("email").value = email;
      successEl.hidden = true;
      form.hidden = false;
      statusEl.hidden = true;
      document.getElementById("name").focus();
    };
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusEl.hidden = true;

    var email = document.getElementById("email").value.trim();
    var audience = selectedAudience();
    if (!email || !/.+@.+\..+/.test(email)) {
      showError("Please enter a valid email address.");
      document.getElementById("email").focus();
      return;
    }

    var payload = {
      email: email,
      audience: audience,
      name: document.getElementById("name").value.trim() || null,
      region: document.getElementById("region").value || null,
      message: document.getElementById("message").value.trim() || null,
      locale: (navigator.language || "en").slice(0, 2),
      source: utmSource(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Joining…";

    fetch(API_BASE + "/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().then(function (body) {
          return { ok: r.ok, status: r.status, body: body };
        });
      })
      .then(function (res) {
        if (res.ok) {
          showSuccess(res.body, email, audience);
          loadStats();
        } else {
          var msg = firstValidationError(res.body) || "Something went wrong. Please try again.";
          showError(msg);
        }
      })
      .catch(function () {
        showError("Couldn't reach the server. Please check your connection and try again.");
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Join the waitlist";
      });
  });
})();
