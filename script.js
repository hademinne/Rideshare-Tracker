// =========================
// Rideshare Tracker - script.js
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

// ---------- HOME page ----------

function showTodayDate() {
    const text = new Date().toLocaleDateString("ar-u-nu-latn", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    document.getElementById("headerDate").textContent = text;
}

function renderHome() {
    const today = getTodayString();

    const todayDays = loadList(DAYS_KEY).filter(function (entry) {
        return entry.date === today;
    });
    const todayFuel = loadList(FUEL_KEY).filter(function (entry) {
        return entry.date === today;
    });

    let income = 0, fuel = 0, other = 0, km = 0, hours = 0, personalKm = 0;

    todayDays.forEach(function (entry) {
        income += entry.income;
        fuel += entry.fuel;
        other += entry.other;
        km += entry.km;
        hours += entry.hours;
        personalKm += entry.personalKm || 0;
    });

    // Fuel bought on the fuel page today is also counted
    todayFuel.forEach(function (entry) {
        fuel += entry.amount;
    });

    const profit = income - fuel - other;
    const paidKm = km - personalKm;
    const profitPerKm = paidKm > 0 ? profit / paidKm : 0;

    document.getElementById("profitValue").textContent = formatNumber(profit);
    document.getElementById("incomeValue").textContent = formatNumber(income);
    document.getElementById("fuelValue").textContent = formatNumber(fuel);
    document.getElementById("distanceValue").textContent = formatNumber(km);
    document.getElementById("hoursValue").textContent = formatNumber(hours);
    document.getElementById("otherValue").textContent = formatNumber(other);
    document.getElementById("avgValue").textContent = formatNumber(profitPerKm);
    document.getElementById("distanceNote").textContent = km > 0
        ? "مدفوعة: " + formatNumber(paidKm) + " | شخصية: " + formatNumber(personalKm)
        : "";
}

// ---------- WORK DAYS page ----------

function addChip(parent, label, value) {
    const chip = el("div", "chip");
    chip.appendChild(el("small", "", label));
    chip.appendChild(el("span", "", value));
    parent.appendChild(chip);
}

function buildDayCard(entry) {
    const profit = entry.income - entry.fuel - entry.other;

    const card = el("div", "list-item");

    const top = el("div", "list-top");
    top.appendChild(el("span", "list-date", formatDate(entry.date)));
    top.appendChild(el("span", "list-profit" + (profit < 0 ? " negative" : ""),
        formatNumber(profit) + " أوقية"));
    card.appendChild(top);

    const details = el("div", "list-details");
    addChip(details, "الدخل", formatNumber(entry.income));
    addChip(details, "البنزين", formatNumber(entry.fuel));
    addChip(details, "مصاريف أخرى", formatNumber(entry.other));
    const dayPersonalKm = entry.personalKm || 0;
    addChip(details, "المسافة الكلية (كم)", formatNumber(entry.km));
    addChip(details, "مدفوعة (كم)", formatNumber(entry.km - dayPersonalKm));
    if (dayPersonalKm > 0) {
        addChip(details, "شخصية (كم)", formatNumber(dayPersonalKm));
    }
    addChip(details, "الساعات", formatNumber(entry.hours));
    card.appendChild(details);

    const deleteButton = el("button", "delete-btn", "حذف");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", function () {
        if (confirm("هل تريد حذف هذا اليوم؟")) {
            const rest = loadList(DAYS_KEY).filter(function (item) {
                return item.id !== entry.id;
            });
            saveList(DAYS_KEY, rest);
            renderAll();
        }
    });
    card.appendChild(deleteButton);

    return card;
}

function renderDays() {
    const days = loadList(DAYS_KEY).sort(byDateNewestFirst);
    const listBox = document.getElementById("daysList");
    listBox.textContent = "";

    let totalProfit = 0;
    days.forEach(function (entry) {
        totalProfit += entry.income - entry.fuel - entry.other;
        listBox.appendChild(buildDayCard(entry));
    });

    document.getElementById("daysCount").textContent = formatNumber(days.length);
    document.getElementById("daysProfit").textContent = formatNumber(totalProfit);

    if (days.length === 0) {
        listBox.appendChild(el("div", "empty-box", "لا توجد أيام عمل مسجلة بعد"));
    }
}

// ---------- FUEL page ----------

function buildFuelCard(entry) {
    const card = el("div", "list-item");

    const top = el("div", "list-top");
    top.appendChild(el("span", "list-date", formatDate(entry.date)));
    top.appendChild(el("span", "list-profit fuel-color", formatNumber(entry.amount) + " أوقية"));
    card.appendChild(top);

    const details = el("div", "list-details");
    if (entry.liters > 0) {
        addChip(details, "الكمية (لتر)", formatNumber(entry.liters));
        addChip(details, "سعر اللتر", formatNumber(entry.amount / entry.liters));
    } else {
        addChip(details, "الكمية (لتر)", "غير مسجلة");
    }
    card.appendChild(details);

    const deleteButton = el("button", "delete-btn", "حذف");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", function () {
        if (confirm("هل تريد حذف هذه التعبئة؟")) {
            const rest = loadList(FUEL_KEY).filter(function (item) {
                return item.id !== entry.id;
            });
            saveList(FUEL_KEY, rest);
            renderAll();
        }
    });
    card.appendChild(deleteButton);

    return card;
}

function renderFuel() {
    const fills = loadList(FUEL_KEY).sort(byDateNewestFirst);
    const listBox = document.getElementById("fuelList");
    listBox.textContent = "";

    let totalSpent = 0;
    let totalLiters = 0;
    fills.forEach(function (entry) {
        totalSpent += entry.amount;
        totalLiters += entry.liters;
        listBox.appendChild(buildFuelCard(entry));
    });

    document.getElementById("fuelTotalSpent").textContent = formatNumber(totalSpent);
    document.getElementById("fuelTotalLiters").textContent = formatNumber(totalLiters);

    if (fills.length === 0) {
        listBox.appendChild(el("div", "empty-box", "لا توجد تعبئات وقود مسجلة بعد"));
    }
}

// ---------- REPORTS page ----------

let reportPeriod = "week";

const PERIOD_LABELS = {
    week: "آخر 7 أيام",
    month: "هذا الشهر",
    all: "كل الفترات"
};

function dateKey(date) {
    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
}

function getReportRange(period) {
    const now = new Date();
    if (period === "week") {
        return {
            start: dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)),
            end: dateKey(now)
        };
    }
    if (period === "month") {
        return {
            start: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
            end: dateKey(now)
        };
    }
    return { start: "0000-00-00", end: "9999-99-99" };
}

// Net profit of all entries whose date passes "test"
function netOf(days, fills, test) {
    let net = 0;
    days.forEach(function (entry) {
        if (test(entry.date)) {
            net += entry.income - entry.fuel - entry.other;
        }
    });
    fills.forEach(function (entry) {
        if (test(entry.date)) {
            net -= entry.amount;
        }
    });
    return net;
}

// The bars of the chart: one per day (week / month) or one per month (all)
function buildBuckets(period, days, fills) {
    const now = new Date();
    const buckets = [];

    function dayBucket(date) {
        const key = dateKey(date);
        buckets.push({
            label: String(date.getDate()),
            test: function (value) { return value === key; }
        });
    }

    if (period === "week") {
        for (let i = 6; i >= 0; i--) {
            dayBucket(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
        }
    } else if (period === "month") {
        for (let day = 1; day <= now.getDate(); day++) {
            dayBucket(new Date(now.getFullYear(), now.getMonth(), day));
        }
    } else {
        let earliest = dateKey(now);
        days.concat(fills).forEach(function (entry) {
            if (entry.date && entry.date < earliest) {
                earliest = entry.date;
            }
        });

        const lastTwelve = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const parts = earliest.split("-");
        let first = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
        if (isNaN(first.getTime()) || first < lastTwelve) {
            first = lastTwelve;
        }

        const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
        while (cursor <= now) {
            const prefix = dateKey(cursor).slice(0, 7);
            buckets.push({
                label: prefix.slice(5, 7) + "/" + prefix.slice(2, 4),
                test: function (value) { return String(value).slice(0, 7) === prefix; }
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }
    }

    return buckets;
}

function addReportCard(parent, label, value, note) {
    const card = el("div", "summary-card");
    card.appendChild(el("span", "", label));
    card.appendChild(el("strong", "", value));
    if (note) {
        card.appendChild(el("small", "note", note));
    }
    parent.appendChild(card);
}

function renderChart(period, days, fills) {
    const chart = document.getElementById("reportChart");
    chart.textContent = "";

    document.getElementById("chartTitle").textContent =
        period === "all" ? "صافي الربح الشهري" : "صافي الربح اليومي";

    const buckets = buildBuckets(period, days, fills).map(function (bucket) {
        return { label: bucket.label, value: netOf(days, fills, bucket.test) };
    });

    let maxValue = 0;
    buckets.forEach(function (bucket) {
        maxValue = Math.max(maxValue, Math.abs(bucket.value));
    });

    buckets.forEach(function (bucket) {
        const column = el("div", "bar-col");
        column.title = bucket.label + ": " + formatNumber(bucket.value) + " أوقية";

        const track = el("div", "bar-track");
        const bar = el("div", "bar" + (bucket.value < 0 ? " negative" : ""));
        bar.style.height = maxValue > 0 ? (Math.abs(bucket.value) / maxValue * 100) + "%" : "0%";
        track.appendChild(bar);
        column.appendChild(track);

        column.appendChild(el("span", "bar-label", bucket.label));
        if (period === "week") {
            column.appendChild(el("span", "bar-value", formatNumber(bucket.value)));
        }

        chart.appendChild(column);
    });
}

function renderReports() {
    const range = getReportRange(reportPeriod);

    function inRange(entry) {
        return entry.date >= range.start && entry.date <= range.end;
    }

    const days = loadList(DAYS_KEY).filter(inRange);
    const fills = loadList(FUEL_KEY).filter(inRange);

    let income = 0, workFuel = 0, other = 0, km = 0, hours = 0, fillSpent = 0, personalKm = 0;
    const perDate = {};

    function dateInfo(date) {
        if (!perDate[date]) {
            perDate[date] = { net: 0, hasWork: false };
        }
        return perDate[date];
    }

    days.forEach(function (entry) {
        income += entry.income;
        workFuel += entry.fuel;
        other += entry.other;
        km += entry.km;
        hours += entry.hours;
        personalKm += entry.personalKm || 0;
        const info = dateInfo(entry.date);
        info.net += entry.income - entry.fuel - entry.other;
        info.hasWork = true;
    });

    fills.forEach(function (entry) {
        fillSpent += entry.amount;
        dateInfo(entry.date).net -= entry.amount;
    });

    const fuel = workFuel + fillSpent;
    const net = income - fuel - other;
    const paidKm = km - personalKm;

    let workDays = 0;
    let bestDate = null;
    let bestNet = 0;
    Object.keys(perDate).forEach(function (date) {
        if (perDate[date].hasWork) {
            workDays += 1;
            if (bestDate === null || perDate[date].net > bestNet) {
                bestDate = date;
                bestNet = perDate[date].net;
            }
        }
    });

    // Top card
    document.getElementById("repNet").textContent = formatNumber(net);
    document.getElementById("repNetBox").classList.toggle("negative", net < 0);
    document.getElementById("repRange").textContent = PERIOD_LABELS[reportPeriod];

    // Period buttons
    document.querySelectorAll(".period-btn").forEach(function (button) {
        button.classList.toggle("active", button.dataset.period === reportPeriod);
    });

    // Small cards
    const grid = document.getElementById("reportGrid");
    grid.textContent = "";
    addReportCard(grid, "الدخل", formatNumber(income) + " أوقية");
    addReportCard(grid, "البنزين", formatNumber(fuel) + " أوقية");
    addReportCard(grid, "مصاريف أخرى", formatNumber(other) + " أوقية");
    addReportCard(grid, "المسافة الكلية", formatNumber(km) + " كم",
        km > 0 ? "مدفوعة " + formatNumber(paidKm) + " | شخصية " + formatNumber(personalKm) : "");
    addReportCard(grid, "ساعات العمل", formatNumber(hours) + " ساعة");
    addReportCard(grid, "أيام العمل", formatNumber(workDays));
    addReportCard(grid, "ربح/كم مدفوع", formatNumber(paidKm > 0 ? net / paidKm : 0) + " أوقية");
    addReportCard(grid, "ربح/ساعة", formatNumber(hours > 0 ? net / hours : 0) + " أوقية");
    if (bestDate !== null) {
        addReportCard(grid, "أفضل يوم", formatNumber(bestNet) + " أوقية", formatDate(bestDate));
    } else {
        addReportCard(grid, "أفضل يوم", "-");
    }

    renderChart(reportPeriod, days, fills);
}

// ---------- MAINTENANCE ----------

const MAINT_ITEMS_KEY = "rideshareMaintItems";
const SERVICES_KEY = "rideshareServices";
const ODO_KEY = "rideshareOdometer";

// Estimated starting intervals (in km). The user can change them from the app.
const DEFAULT_MAINT_ITEMS = [
    { id: "oil", name: "زيت المحرك مع الفلتر", intervalKm: 5000 },
    { id: "airfilter", name: "فلتر الهواء", intervalKm: 15000 },
    { id: "fuelfilter", name: "فلتر البنزين", intervalKm: 30000 },
    { id: "plugs", name: "بوجيهات الإشعال", intervalKm: 40000 },
    { id: "gearoil", name: "زيت القير", intervalKm: 40000 },
    { id: "coolant", name: "سائل التبريد", intervalKm: 40000 },
    { id: "brakes", name: "تيل الفرامل", intervalKm: 30000 },
    { id: "tires", name: "الإطارات", intervalKm: 40000 },
    { id: "battery", name: "البطارية", intervalKm: 60000 }
];

// The first time the app opens, fill the list with the default items
function ensureMaintItems() {
    try {
        if (localStorage.getItem(MAINT_ITEMS_KEY) === null) {
            saveList(MAINT_ITEMS_KEY, DEFAULT_MAINT_ITEMS.map(function (item) {
                return { id: item.id, name: item.name, intervalKm: item.intervalKm };
            }));
        }
    } catch (e) {
        // not important
    }
}

// ----- Odometer -----
// We save the reading the user typed, plus how many km were logged in work days
// at that moment. Every km logged later is added to the reading automatically.

function loadOdometer() {
    try {
        const data = JSON.parse(localStorage.getItem(ODO_KEY));
        if (data && typeof data === "object" && isFinite(data.reading) && data.reading >= 0) {
            return { reading: Number(data.reading), loggedAtSet: Number(data.loggedAtSet) || 0 };
        }
    } catch (e) {
        // no saved reading
    }
    return null;
}

function totalLoggedKm() {
    let total = 0;
    loadList(DAYS_KEY).forEach(function (entry) {
        total += entry.km;
    });
    return total;
}

function currentOdometer() {
    const saved = loadOdometer();
    if (!saved) {
        return null;
    }
    return saved.reading + Math.max(0, totalLoggedKm() - saved.loggedAtSet);
}

function setOdometer(reading) {
    try {
        localStorage.setItem(ODO_KEY, JSON.stringify({
            reading: reading,
            loggedAtSet: totalLoggedKm()
        }));
    } catch (e) {
        alert("تعذر حفظ البيانات في هذا المتصفح");
    }
}

// ----- Status of each item -----

function lastServiceFor(itemId, services) {
    let best = null;
    services.forEach(function (service) {
        if (service.itemId !== itemId) {
            return;
        }
        if (!best || service.date > best.date ||
            (service.date === best.date && service.odometer >= best.odometer)) {
            best = service;
        }
    });
    return best;
}

function itemStatus(item, services, odo) {
    const last = lastServiceFor(item.id, services);
    if (!last) {
        return { level: "none", last: null };
    }
    if (odo === null) {
        return { level: "unknown", last: last };
    }
    const used = Math.max(0, odo - last.odometer);
    const remaining = item.intervalKm - used;
    let level = "ok";
    if (remaining < 0) {
        level = "late";
    } else if (remaining <= item.intervalKm * 0.15) {
        level = "soon";
    }
    return { level: level, last: last, used: used, remaining: remaining };
}

function maintBadge(status) {
    if (status.level === "none") {
        return { cls: "none", text: "لم تسجل بعد" };
    }
    if (status.level === "unknown") {
        return { cls: "none", text: "حدد قراءة العدّاد" };
    }
    if (status.level === "late") {
        return { cls: "late", text: "متأخر " + formatNumber(Math.round(-status.remaining)) + " كم" };
    }
    return { cls: status.level, text: "باقي " + formatNumber(Math.round(status.remaining)) + " كم" };
}

// ----- Drawing the page -----

function buildMaintCard(item, status, spent) {
    const card = el("div", "list-item");

    const top = el("div", "list-top");
    top.appendChild(el("span", "list-date", item.name));
    const badge = maintBadge(status);
    top.appendChild(el("span", "badge " + badge.cls, badge.text));
    card.appendChild(top);

    if (status.last && status.level !== "unknown") {
        const bar = el("div", "progress");
        const fill = el("div", "fill " + status.level);
        fill.style.width = Math.min(100, status.used / item.intervalKm * 100) + "%";
        bar.appendChild(fill);
        card.appendChild(bar);
    }

    const details = el("div", "list-details");
    addChip(details, "الفترة", "كل " + formatNumber(item.intervalKm) + " كم");
    if (status.last) {
        addChip(details, "آخر صيانة", formatDate(status.last.date));
        addChip(details, "عند العدّاد", formatNumber(status.last.odometer) + " كم");
    }
    if (spent > 0) {
        addChip(details, "المصروف عليه", formatNumber(spent) + " أوقية");
    }
    card.appendChild(details);

    const actions = el("div", "item-actions");

    const doneButton = el("button", "small-btn primary", "سجلت صيانة");
    doneButton.type = "button";
    doneButton.addEventListener("click", function () {
        openServiceModal(item);
    });
    actions.appendChild(doneButton);

    const editButton = el("button", "small-btn", "تعديل");
    editButton.type = "button";
    editButton.addEventListener("click", function () {
        openItemModal(item);
    });
    actions.appendChild(editButton);

    card.appendChild(actions);
    return card;
}

function buildServiceCard(service) {
    const card = el("div", "list-item");

    const top = el("div", "list-top");
    top.appendChild(el("span", "list-date", service.itemName));
    top.appendChild(el("span", "list-profit fuel-color", formatNumber(service.cost) + " أوقية"));
    card.appendChild(top);

    const details = el("div", "list-details");
    addChip(details, "التاريخ", formatDate(service.date));
    addChip(details, "عند العدّاد", formatNumber(service.odometer) + " كم");
    card.appendChild(details);

    if (service.note) {
        card.appendChild(el("div", "list-note", service.note));
    }

    const deleteButton = el("button", "delete-btn", "حذف");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", function () {
        if (confirm("هل تريد حذف هذا السجل؟")) {
            const rest = loadList(SERVICES_KEY).filter(function (item) {
                return item.id !== service.id;
            });
            saveList(SERVICES_KEY, rest);
            renderAll();
        }
    });
    card.appendChild(deleteButton);

    return card;
}

function renderMaintenance() {
    const odo = currentOdometer();
    const items = loadList(MAINT_ITEMS_KEY);
    const services = loadList(SERVICES_KEY);

    // Odometer card
    document.getElementById("odoValue").textContent =
        odo === null ? "-" : formatNumber(Math.round(odo)) + " كم";
    document.getElementById("odoButton").textContent =
        odo === null ? "تحديد القراءة" : "تعديل القراءة";
    document.getElementById("odoNote").textContent = odo === null
        ? "اكتب قراءة عدّاد سيارتك الآن لتظهر لك حالة كل بند. بعدها يضيف التطبيق مسافة أيام العمل تلقائياً."
        : "يزيد العدّاد تلقائياً بمسافة أيام العمل التي تسجلها. صحّحه إذا اختلف عن عدّاد السيارة.";

    // Spending summary
    const monthPrefix = getTodayString().slice(0, 7);
    let total = 0;
    let monthTotal = 0;
    const spentByItem = {};
    const groups = {};

    services.forEach(function (service) {
        total += service.cost;
        if (String(service.date).slice(0, 7) === monthPrefix) {
            monthTotal += service.cost;
        }
        spentByItem[service.itemId] = (spentByItem[service.itemId] || 0) + service.cost;

        if (!groups[service.itemId]) {
            groups[service.itemId] = { name: service.itemName, count: 0, cost: 0 };
        }
        groups[service.itemId].count += 1;
        groups[service.itemId].cost += service.cost;
    });

    document.getElementById("maintTotal").textContent = formatNumber(total);
    document.getElementById("maintMonth").textContent = formatNumber(monthTotal);

    // Items
    const itemsBox = document.getElementById("maintItems");
    itemsBox.textContent = "";
    items.forEach(function (item) {
        itemsBox.appendChild(buildMaintCard(
            item,
            itemStatus(item, services, odo),
            spentByItem[item.id] || 0
        ));
    });
    if (items.length === 0) {
        itemsBox.appendChild(el("div", "empty-box", "لا توجد بنود صيانة. اضغط على + بند لإضافة بند"));
    }

    // Spending per item
    const breakdown = document.getElementById("maintBreakdown");
    breakdown.textContent = "";
    const rows = Object.keys(groups).map(function (key) {
        return groups[key];
    }).sort(function (a, b) {
        return (b.cost - a.cost) || (b.count - a.count);
    });
    const maxCost = rows.length > 0 ? rows[0].cost : 0;

    rows.forEach(function (row) {
        const line = el("div", "break-row");
        const head = el("div", "break-top");
        head.appendChild(el("span", "", row.name));
        head.appendChild(el("span", "", formatNumber(row.cost) + " أوقية"));
        line.appendChild(head);

        const bar = el("div", "progress");
        const fill = el("div", "fill brand");
        fill.style.width = (maxCost > 0 ? row.cost / maxCost * 100 : 0) + "%";
        bar.appendChild(fill);
        line.appendChild(bar);

        line.appendChild(el("div", "break-count", "عدد المرات: " + row.count));
        breakdown.appendChild(line);
    });
    if (rows.length === 0) {
        breakdown.appendChild(el("div", "empty-text", "لا توجد مصاريف صيانة مسجلة بعد"));
    }

    // History
    const history = document.getElementById("maintHistory");
    history.textContent = "";
    services.slice().sort(byDateNewestFirst).forEach(function (service) {
        history.appendChild(buildServiceCard(service));
    });
    if (services.length === 0) {
        history.appendChild(el("div", "empty-box", "لا يوجد سجل صيانة بعد"));
    }
}

// Yellow/red bar on the home page when something is late or close
function renderMaintReminder() {
    const box = document.getElementById("maintReminder");
    const odo = currentOdometer();
    if (odo === null) {
        box.classList.add("hidden");
        return;
    }

    const services = loadList(SERVICES_KEY);
    let late = 0;
    let soon = 0;
    loadList(MAINT_ITEMS_KEY).forEach(function (item) {
        const level = itemStatus(item, services, odo).level;
        if (level === "late") {
            late += 1;
        } else if (level === "soon") {
            soon += 1;
        }
    });

    if (late + soon === 0) {
        box.classList.add("hidden");
        return;
    }

    let text = "";
    if (late > 0) {
        text += "عندك " + late + " بند صيانة متأخر";
        text += soon > 0 ? " و " + soon + " قريب الموعد" : "";
    } else {
        text += soon + " بند صيانة قريب الموعد";
    }
    box.textContent = text + ". اضغط هنا للتفاصيل.";
    box.classList.remove("hidden");
}

// ----- Popups -----

const serviceModal = document.getElementById("serviceModal");
const serviceForm = document.getElementById("serviceForm");
const itemModal = document.getElementById("itemModal");
const itemForm = document.getElementById("itemForm");
const odoModal = document.getElementById("odoModal");
const odoForm = document.getElementById("odoForm");

function showModal(modal) {
    modal.classList.remove("hidden");
}

function hideModal(modal) {
    modal.classList.add("hidden");
}

function openServiceModal(item) {
    serviceForm.reset();
    document.getElementById("serviceItemId").value = item.id;
    document.getElementById("serviceTitle").textContent = "تسجيل صيانة: " + item.name;
    document.getElementById("serviceDate").value = getTodayString();
    const odo = currentOdometer();
    document.getElementById("serviceKm").value = odo === null ? "" : String(Math.round(odo));
    showModal(serviceModal);
}

function openItemModal(item) {
    itemForm.reset();
    document.getElementById("itemId").value = item ? item.id : "";
    document.getElementById("itemTitle").textContent = item ? "تعديل البند" : "إضافة بند صيانة";
    document.getElementById("itemName").value = item ? item.name : "";
    document.getElementById("itemInterval").value = item ? String(item.intervalKm) : "";
    document.getElementById("itemDeleteButton").classList.toggle("hidden", !item);
    showModal(itemModal);
}

function openOdoModal() {
    odoForm.reset();
    const odo = currentOdometer();
    document.getElementById("odoInput").value = odo === null ? "" : String(Math.round(odo));
    showModal(odoModal);
}

serviceForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const itemId = document.getElementById("serviceItemId").value;
    const item = loadList(MAINT_ITEMS_KEY).filter(function (entry) {
        return entry.id === itemId;
    })[0];
    if (!item) {
        hideModal(serviceModal);
        return;
    }

    const date = document.getElementById("serviceDate").value || getTodayString();
    const odometer = readNumber("serviceKm");

    const services = loadList(SERVICES_KEY);
    services.push({
        id: newId(),
        itemId: item.id,
        itemName: item.name,
        date: date,
        odometer: odometer,
        cost: readNumber("serviceCost"),
        note: document.getElementById("serviceNote").value.trim().slice(0, 120)
    });
    saveList(SERVICES_KEY, services);

    // A reading taken today that is higher than ours is a fresher odometer reading
    const odo = currentOdometer();
    if (date >= getTodayString() && (odo === null || odometer > odo)) {
        setOdometer(odometer);
    }

    hideModal(serviceModal);
    renderAll();
});

itemForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const id = document.getElementById("itemId").value;
    const name = document.getElementById("itemName").value.trim().slice(0, 40);
    const intervalKm = readNumber("itemInterval");

    if (!name || intervalKm < 1) {
        alert("اكتب اسم البند وعدد الكيلومترات");
        return;
    }

    const items = loadList(MAINT_ITEMS_KEY);
    const existing = items.filter(function (entry) {
        return entry.id === id;
    })[0];

    if (existing) {
        existing.name = name;
        existing.intervalKm = intervalKm;

        // keep old records readable under the new name
        const services = loadList(SERVICES_KEY);
        services.forEach(function (service) {
            if (service.itemId === id) {
                service.itemName = name;
            }
        });
        saveList(SERVICES_KEY, services);
    } else {
        items.push({ id: newId(), name: name, intervalKm: intervalKm });
    }
    saveList(MAINT_ITEMS_KEY, items);

    hideModal(itemModal);
    renderAll();
});

odoForm.addEventListener("submit", function (event) {
    event.preventDefault();
    setOdometer(readNumber("odoInput"));
    hideModal(odoModal);
    renderAll();
});

document.getElementById("itemDeleteButton").addEventListener("click", function () {
    const id = document.getElementById("itemId").value;
    if (confirm("هل تريد حذف هذا البند؟ سجل صيانته السابق سيبقى محفوظاً.")) {
        const rest = loadList(MAINT_ITEMS_KEY).filter(function (entry) {
            return entry.id !== id;
        });
        saveList(MAINT_ITEMS_KEY, rest);
        hideModal(itemModal);
        renderAll();
    }
});

document.getElementById("addItemButton").addEventListener("click", function () {
    openItemModal(null);
});
document.getElementById("odoButton").addEventListener("click", openOdoModal);
document.getElementById("serviceCancelButton").addEventListener("click", function () {
    hideModal(serviceModal);
});
document.getElementById("itemCancelButton").addEventListener("click", function () {
    hideModal(itemModal);
});
document.getElementById("odoCancelButton").addEventListener("click", function () {
    hideModal(odoModal);
});

[serviceModal, itemModal, odoModal].forEach(function (modal) {
    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            hideModal(modal);
        }
    });
});

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

// ---------- Popups ----------

const workModal = document.getElementById("workModal");
const workForm = document.getElementById("workForm");
const fuelModal = document.getElementById("fuelModal");
const fuelForm = document.getElementById("fuelForm");

function openWorkModal() {
    workForm.reset();
    document.getElementById("workDate").value = getTodayString();
    workModal.classList.remove("hidden");
}

function closeWorkModal() {
    workModal.classList.add("hidden");
}

function openFuelModal() {
    fuelForm.reset();
    document.getElementById("fuelDate").value = getTodayString();
    fuelModal.classList.remove("hidden");
}

function closeFuelModal() {
    fuelModal.classList.add("hidden");
}

workForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const totalKm = readNumber("workKm");
    const personalKm = readNumber("workPersonalKm");
    if (personalKm > totalKm) {
        alert("المشاوير الشخصية أكبر من المسافة الكلية، راجع الأرقام");
        return;
    }

    const days = loadList(DAYS_KEY);
    days.push({
        id: newId(),
        date: document.getElementById("workDate").value || getTodayString(),
        income: readNumber("workIncome"),
        fuel: readNumber("workFuel"),
        other: readNumber("workOther"),
        km: totalKm,
        personalKm: personalKm,
        hours: readNumber("workHours")
    });
    saveList(DAYS_KEY, days);

    closeWorkModal();
    renderAll();
});

fuelForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const fills = loadList(FUEL_KEY);
    fills.push({
        id: newId(),
        date: document.getElementById("fuelDate").value || getTodayString(),
        amount: readNumber("fuelAmount"),
        liters: readNumber("fuelLiters")
    });
    saveList(FUEL_KEY, fills);

    closeFuelModal();
    renderAll();
});

document.getElementById("addWorkButton").addEventListener("click", openWorkModal);
document.getElementById("addWorkTop").addEventListener("click", openWorkModal);
document.getElementById("cancelButton").addEventListener("click", closeWorkModal);

document.getElementById("addFuelTop").addEventListener("click", openFuelModal);
document.getElementById("fuelCancelButton").addEventListener("click", closeFuelModal);

// Close when tapping the dark background
workModal.addEventListener("click", function (event) {
    if (event.target === workModal) {
        closeWorkModal();
    }
});

fuelModal.addEventListener("click", function (event) {
    if (event.target === fuelModal) {
        closeFuelModal();
    }
});

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

document.querySelectorAll(".period-btn").forEach(function (button) {
    button.addEventListener("click", function () {
        reportPeriod = button.dataset.period;
        renderReports();
    });
});

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

// Ask the browser not to delete our saved data when the phone is low on space
try {
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(function () {});
    }
} catch (e) {
    // not important
}

// ---------- Start ----------

ensureIds();
ensureMaintItems();
showTodayDate();
renderAll();

// Lets the phone install the app and open it offline (works only on a web link)
if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
}
