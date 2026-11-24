// =========================
// Rideshare Tracker - core.js
// Shared tools used by every page: saving and loading data, dates, numbers.
// Load this file FIRST.
// =========================

const DAYS_KEY = "rideshareDays";
const FUEL_KEY = "rideshareFuel";

// ---------- Saving and loading ----------

function loadList(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key));
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
}

function saveList(key, list) {
    try {
        localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
        alert("تعذر حفظ البيانات في هذا المتصفح");
    }
}

function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Old saved entries (from the first version) had no id, so give them one
function ensureIds() {
    [DAYS_KEY, FUEL_KEY].forEach(function (key) {
        const list = loadList(key);
        let changed = false;
        list.forEach(function (entry) {
            if (!entry.id) {
                entry.id = newId();
                changed = true;
            }
        });
        if (changed) {
            saveList(key, list);
        }
    });
}

// ---------- Helpers ----------

function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

function formatNumber(number) {
    return Number(number).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatDate(text) {
    const parts = String(text).split("-");
    if (parts.length !== 3) {
        return text;
    }
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(date.getTime())) {
        return text;
    }
    return date.toLocaleDateString("ar-u-nu-latn", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

function byDateNewestFirst(a, b) {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
}

function readNumber(id) {
    const value = parseFloat(document.getElementById(id).value);
    return isNaN(value) || value < 0 ? 0 : value;
}


// ---------- Shared piece: a small box with a label and a value ----------

function addChip(parent, label, value) {
    const chip = el("div", "chip");
    chip.appendChild(el("small", "", label));
    chip.appendChild(el("span", "", value));
    parent.appendChild(chip);
}
