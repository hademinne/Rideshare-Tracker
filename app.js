// =========================
// Rideshare Tracker - app.js
// Starts the app: moves between pages, draws everything, installs the offline helper.
// Load this file LAST.
// =========================

// ---------- Draw every page ----------

function renderAll() {
    renderHome();
    renderDays();
    renderFuel();
    renderReports();
    renderMaintenance();
    renderMaintReminder();
    renderSettings();
    renderBackupReminder();
}


// ---------- Navigation between pages ----------

function showView(name, label) {
    const known = ["home", "days", "fuel", "reports", "maintenance", "settings"];
    const target = known.indexOf(name) !== -1 ? name : "soon";

    ["home", "days", "fuel", "reports", "maintenance", "settings", "soon"].forEach(function (view) {
        document.getElementById("view-" + view).classList.toggle("hidden", view !== target);
    });

    document.querySelectorAll("[data-view]").forEach(function (item) {
        item.classList.toggle("active", item.dataset.view === name);
    });

    if (target === "soon") {
        document.getElementById("soonTitle").textContent = label || "";
    }

    window.scrollTo(0, 0);
}

document.querySelectorAll("[data-view]").forEach(function (item) {
    item.addEventListener("click", function () {
        showView(item.dataset.view, item.dataset.label);
    });
});

// Ask the browser not to delete our saved data when the phone is low on space
try {
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(function () {});
    }
} catch (e) {
    // not important
}

// ---------- Start ----------

// If a file was forgotten when uploading, say which one instead of showing a broken app
const missingFiles = [];
if (typeof loadList !== "function") { missingFiles.push("core.js"); }
if (typeof renderHome !== "function") { missingFiles.push("home.js"); }
if (typeof renderDays !== "function") { missingFiles.push("days.js"); }
if (typeof renderFuel !== "function") { missingFiles.push("fuel.js"); }
if (typeof renderReports !== "function") { missingFiles.push("reports.js"); }
if (typeof renderMaintenance !== "function") { missingFiles.push("maintenance.js"); }
if (typeof renderSettings !== "function") { missingFiles.push("backup.js"); }

if (missingFiles.length > 0) {
    const banner = document.createElement("div");
    banner.className = "missing-banner";
    banner.textContent = "ملفات ناقصة في الموقع: " + missingFiles.join(" ، ") +
        " — ارفعها على GitHub ثم أعد فتح التطبيق.";
    document.body.insertBefore(banner, document.body.firstChild);
} else {
    ensureIds();
    ensureMaintItems();
    showTodayDate();
    renderAll();
}

// Lets the phone install the app and open it offline (works only on a web link)
if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
}
