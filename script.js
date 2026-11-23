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
    document.getElementById("headerDate").textContent = "📅 " + text;
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

function renderAll() {
    renderHome();
    renderDays();
    renderFuel();
    renderReports();
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
    const known = ["home", "days", "fuel", "reports"];
    const target = known.indexOf(name) !== -1 ? name : "soon";

    ["home", "days", "fuel", "reports", "soon"].forEach(function (view) {
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

// ---------- Start ----------

ensureIds();
showTodayDate();
renderAll();

// Lets the phone install the app and open it offline (works only on a web link)
if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
}
