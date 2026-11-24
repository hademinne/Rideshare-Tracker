// =========================
// Rideshare Tracker - backup.js
// The settings page: save a backup file and restore from one.
// Needs: core.js and maintenance.js
// =========================

// ---------- BACKUP (export / import) ----------

const BACKUP_KEY = "rideshareLastBackup";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getLastBackup() {
    try {
        return Number(localStorage.getItem(BACKUP_KEY)) || 0;
    } catch (e) {
        return 0;
    }
}

function setLastBackup() {
    try {
        localStorage.setItem(BACKUP_KEY, String(Date.now()));
    } catch (e) {
        // not important
    }
}

function renderSettings() {
    const daysCount = loadList(DAYS_KEY).length;
    const fuelCount = loadList(FUEL_KEY).length;
    document.getElementById("dataSummary").textContent =
        "المسجل حالياً: " + daysCount + " يوم عمل، " + fuelCount + " تعبئة وقود";

    const last = getLastBackup();
    document.getElementById("lastBackupText").textContent = last
        ? "آخر نسخة احتياطية: " + new Date(last).toLocaleDateString("ar-u-nu-latn", {
            day: "numeric",
            month: "long",
            year: "numeric"
        })
        : "لم تحفظ نسخة احتياطية بعد";
}

// Shows a yellow reminder on the home page if there is data but no recent backup
function renderBackupReminder() {
    const hasData = loadList(DAYS_KEY).length + loadList(FUEL_KEY).length > 0;
    const last = getLastBackup();
    const old = !last || (Date.now() - last) > WEEK_MS;
    document.getElementById("backupReminder").classList.toggle("hidden", !(hasData && old));
}

function showBackupStatus(text, isError) {
    const box = document.getElementById("backupStatus");
    box.textContent = text;
    box.classList.toggle("error", !!isError);
}

function backupFileName() {
    return "rideshare-backup-" + getTodayString() + ".json";
}

function buildBackupText() {
    return JSON.stringify({
        app: "rideshare-tracker",
        version: 2,
        exportedAt: new Date().toISOString(),
        days: loadList(DAYS_KEY),
        fuel: loadList(FUEL_KEY),
        maintItems: loadList(MAINT_ITEMS_KEY),
        services: loadList(SERVICES_KEY),
        odometer: currentOdometer()
    }, null, 2);
}

function exportBackup() {
    const blob = new Blob([buildBackupText()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

    setLastBackup();
    showBackupStatus("تم حفظ الملف " + backupFileName() + " (ابحث عنه في مجلد التنزيلات)");
    renderSettings();
    renderBackupReminder();
}

function shareBackup() {
    const file = new File([buildBackupText()], backupFileName(), { type: "text/plain" });
    navigator.share({ files: [file], title: "نسخة احتياطية - Rideshare Tracker" })
        .then(function () {
            setLastBackup();
            showBackupStatus("تمت مشاركة النسخة الاحتياطية");
            renderSettings();
            renderBackupReminder();
        })
        .catch(function (error) {
            if (!error || error.name !== "AbortError") {
                showBackupStatus("تعذرت المشاركة، استخدم زر الحفظ بدلاً منها", true);
            }
        });
}

// Make sure data coming from a file is safe and has the right shape
function cleanNumber(value) {
    const number = Number(value);
    return isFinite(number) && number >= 0 ? number : 0;
}

function cleanId(value) {
    return typeof value === "string" && value && value.length <= 40 ? value : newId();
}

function cleanDay(raw) {
    if (!raw || typeof raw !== "object" || !/^\d{4}-\d{2}-\d{2}$/.test(String(raw.date))) {
        return null;
    }
    const km = cleanNumber(raw.km);
    return {
        id: cleanId(raw.id),
        date: String(raw.date),
        income: cleanNumber(raw.income),
        fuel: cleanNumber(raw.fuel),
        other: cleanNumber(raw.other),
        km: km,
        personalKm: Math.min(cleanNumber(raw.personalKm), km),
        hours: cleanNumber(raw.hours)
    };
}

function cleanFill(raw) {
    if (!raw || typeof raw !== "object" || !/^\d{4}-\d{2}-\d{2}$/.test(String(raw.date))) {
        return null;
    }
    return {
        id: cleanId(raw.id),
        date: String(raw.date),
        amount: cleanNumber(raw.amount),
        liters: cleanNumber(raw.liters)
    };
}

function cleanText(value, maxLength) {
    return String(value === undefined || value === null ? "" : value).trim().slice(0, maxLength);
}

function cleanItem(raw) {
    if (!raw || typeof raw !== "object") {
        return null;
    }
    const name = cleanText(raw.name, 40);
    if (!name) {
        return null;
    }
    return {
        id: cleanId(raw.id),
        name: name,
        intervalKm: Math.max(1, cleanNumber(raw.intervalKm))
    };
}

function cleanService(raw) {
    if (!raw || typeof raw !== "object" || !/^\d{4}-\d{2}-\d{2}$/.test(String(raw.date))) {
        return null;
    }
    const itemId = cleanText(raw.itemId, 40);
    if (!itemId) {
        return null;
    }
    return {
        id: cleanId(raw.id),
        itemId: itemId,
        itemName: cleanText(raw.itemName, 40) || "صيانة",
        date: String(raw.date),
        odometer: cleanNumber(raw.odometer),
        cost: cleanNumber(raw.cost),
        note: cleanText(raw.note, 120)
    };
}

// Adds the clean entries that are not already saved. Returns how many were added.
function mergeEntries(existing, incoming, cleaner, stats) {
    const knownIds = new Set(existing.map(function (entry) { return entry.id; }));
    let added = 0;
    incoming.forEach(function (raw) {
        const entry = cleaner(raw);
        if (!entry || knownIds.has(entry.id)) {
            stats.skipped += 1;
            return;
        }
        knownIds.add(entry.id);
        existing.push(entry);
        added += 1;
    });
    return added;
}

// Restores maintenance items, maintenance records and the odometer (older backup
// files do not have them, so everything here is optional). Returns records added.
function importMaintenance(data, stats) {
    if (Array.isArray(data.maintItems)) {
        const items = loadList(MAINT_ITEMS_KEY);
        data.maintItems.forEach(function (raw) {
            const clean = cleanItem(raw);
            if (!clean) {
                stats.skipped += 1;
                return;
            }
            const index = items.findIndex(function (entry) {
                return entry.id === clean.id;
            });
            if (index === -1) {
                items.push(clean);
            } else {
                items[index] = clean;
            }
        });
        saveList(MAINT_ITEMS_KEY, items);
    }

    let addedServices = 0;
    if (Array.isArray(data.services)) {
        const services = loadList(SERVICES_KEY);
        addedServices = mergeEntries(services, data.services, cleanService, stats);
        saveList(SERVICES_KEY, services);
    }

    // Keep the reading already on this phone; use the file's reading only if there is none
    if (loadOdometer() === null && typeof data.odometer === "number" &&
        isFinite(data.odometer) && data.odometer >= 0) {
        setOdometer(data.odometer);
    }

    return addedServices;
}

function importBackup(file) {
    if (!file) {
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showBackupStatus("الملف كبير جداً، تأكد أنه نسخة احتياطية من التطبيق", true);
        return;
    }

    const reader = new FileReader();

    reader.onerror = function () {
        showBackupStatus("تعذرت قراءة الملف", true);
    };

    reader.onload = function () {
        let data;
        try {
            data = JSON.parse(String(reader.result));
        } catch (e) {
            showBackupStatus("الملف غير صالح، اختر ملف نسخة احتياطية من التطبيق", true);
            return;
        }

        if (!data || data.app !== "rideshare-tracker" ||
            !Array.isArray(data.days) || !Array.isArray(data.fuel)) {
            showBackupStatus("هذا الملف ليس نسخة احتياطية من التطبيق", true);
            return;
        }

        const stats = { skipped: 0 };
        const days = loadList(DAYS_KEY);
        const fills = loadList(FUEL_KEY);
        const addedDays = mergeEntries(days, data.days, cleanDay, stats);
        const addedFills = mergeEntries(fills, data.fuel, cleanFill, stats);

        saveList(DAYS_KEY, days);
        saveList(FUEL_KEY, fills);
        const addedServices = importMaintenance(data, stats);
        renderAll();

        showBackupStatus(
            "تم استرجاع " + addedDays + " يوم عمل و " + addedFills + " تعبئة وقود" +
            (addedServices > 0 ? " و " + addedServices + " سجل صيانة" : "") +
            (stats.skipped > 0 ? " (تم تجاهل " + stats.skipped + " مكررة أو غير صالحة)" : "")
        );
    };

    reader.readAsText(file);
}

// ---------- Buttons of the settings page ----------

document.getElementById("exportButton").addEventListener("click", exportBackup);
document.getElementById("shareButton").addEventListener("click", shareBackup);
document.getElementById("importButton").addEventListener("click", function () {
    document.getElementById("importFile").click();
});
document.getElementById("importFile").addEventListener("change", function (event) {
    importBackup(event.target.files[0]);
    event.target.value = "";
});

// Show the share button only if this phone can share files
try {
    const probe = new File(["{}"], "probe.json", { type: "text/plain" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [probe] })) {
        document.getElementById("shareButton").classList.remove("hidden");
    }
} catch (e) {
    // no share support: the save button still works
}
