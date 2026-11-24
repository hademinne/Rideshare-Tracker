// =========================
// Rideshare Tracker - maintenance.js
// The maintenance page: odometer, service items, records and spending.
// Needs: core.js (and days data from days.js)
// =========================

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
