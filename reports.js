// =========================
// Rideshare Tracker - reports.js
// The reports page: week / month / all, summary cards and the bar chart.
// Needs: core.js
// =========================

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


// ---------- Period buttons (week / month / all) ----------

document.querySelectorAll(".period-btn").forEach(function (button) {
    button.addEventListener("click", function () {
        reportPeriod = button.dataset.period;
        renderReports();
    });
});
