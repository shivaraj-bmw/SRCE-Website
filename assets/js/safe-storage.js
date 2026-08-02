// =====================================================================
// SRCE Safe Storage
// Some browsers (Firefox, Safari, some mobile browsers) block
// localStorage entirely when a page is opened directly as a file
// (file:// instead of http://). Without this wrapper, every save
// silently throws and Add/Edit/Delete appear to "do nothing".
//
// This wrapper transparently falls back to an in-memory store so the
// app keeps working during the current visit even when persistent
// storage isn't available, and shows a one-time note explaining that
// changes won't survive a page reload in that case.
// =====================================================================

const SRCEStorage = (function () {
    const memory = {};
    let persistent = true;

    // Detect once whether real localStorage can actually be used here.
    try {
        const testKey = "__srce_storage_test__";
        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);
    } catch (e) {
        persistent = false;
    }

    function get(key) {
        if (persistent) {
            try { return window.localStorage.getItem(key); }
            catch (e) { persistent = false; }
        }
        return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    }

    function set(key, value) {
        memory[key] = value; // always keep an in-memory copy as a safety net
        if (persistent) {
            try { window.localStorage.setItem(key, value); }
            catch (e) { persistent = false; showNotice(); }
        } else {
            showNotice();
        }
    }

    let noticeShown = false;
    function showNotice() {
        if (noticeShown) return;
        noticeShown = true;
        const bar = document.createElement("div");
        bar.textContent =
            "⚠️ This browser is blocking permanent local storage for files opened directly. " +
            "Everything will still work while this tab is open, but changes won't be saved after you close or reload the page. " +
            "To save permanently, upload this site to a host (GitHub Pages, Netlify, etc.) or open it through a local web server.";
        bar.style.cssText =
            "background:#fff3cd;color:#7a5b00;padding:10px 16px;font-size:13px;" +
            "text-align:center;border-bottom:2px solid #ffe08a;position:relative;z-index:2000;";
        document.body.insertBefore(bar, document.body.firstChild);
    }

    return { get, set };
})();
