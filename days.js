// =========================
// Rideshare Tracker - days.js
// The work days page: the list of saved days + the "add work day" popup.
// Needs: core.js
// =========================

// ---------- WORK DAYS page ----------

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

    // Total profit: all days, minus the fuel bought on the fuel page (same as Reports "all")
    let totalProfit = 0;
    days.forEach(function (entry) {
        totalProfit += entry.income - entry.fuel - entry.other;
        listBox.appendChild(buildDayCard(entry));
    });
    loadList(FUEL_KEY).forEach(function (fill) {
        totalProfit -= fill.amount;
    });

    document.getElementById("daysCount").textContent = formatNumber(days.length);
    document.getElementById("daysProfit").textContent = formatNumber(totalProfit);

    if (days.length === 0) {
        listBox.appendChild(el("div", "empty-box", "لا توجد أيام عمل مسجلة بعد"));
    }
}


// ---------- Add work day popup ----------

const workModal = document.getElementById("workModal");
const workForm = document.getElementById("workForm");

// Fuel already saved on the fuel page for a date (it is counted in the profit already)
function fuelRecordedOn(date) {
    let total = 0;
    loadList(FUEL_KEY).forEach(function (fill) {
        if (fill.date === date) {
            total += fill.amount;
        }
    });
    return total;
}

// Tells the user what is already counted, so the same fuel is not typed twice
function updateFuelHint() {
    const date = document.getElementById("workDate").value || getTodayString();
    const recorded = fuelRecordedOn(date);
    document.getElementById("workFuelHint").textContent = recorded > 0
        ? "مسجل لهذا اليوم في صفحة الوقود: " + formatNumber(recorded) + " أوقية، وهو محسوب في الربح. لا تكتبه هنا مرة ثانية."
        : "اتركه فارغاً إذا كنت تسجل البنزين من صفحة الوقود.";
}

function openWorkModal() {
    workForm.reset();
    document.getElementById("workDate").value = getTodayString();
    updateFuelHint();
    workModal.classList.remove("hidden");
}

document.getElementById("workDate").addEventListener("change", updateFuelHint);

function closeWorkModal() {
    workModal.classList.add("hidden");
}

workForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const totalKm = readNumber("workKm");
    const personalKm = readNumber("workPersonalKm");
    if (personalKm > totalKm) {
        alert("المشاوير الشخصية أكبر من المسافة الكلية، راجع الأرقام");
        return;
    }

    const date = document.getElementById("workDate").value || getTodayString();
    const typedFuel = readNumber("workFuel");
    const recordedFuel = fuelRecordedOn(date);
    if (typedFuel > 0 && recordedFuel > 0 && !confirm(
        "هذا اليوم فيه بنزين مسجل في صفحة الوقود (" + formatNumber(recordedFuel) +
        " أوقية). إذا كتبت البنزين هنا أيضاً سيُخصم مرتين.\n\nهل تريد الحفظ مع ذلك؟")) {
        return;
    }

    const days = loadList(DAYS_KEY);
    days.push({
        id: newId(),
        date: date,
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

document.getElementById("addWorkButton").addEventListener("click", openWorkModal);
document.getElementById("addWorkTop").addEventListener("click", openWorkModal);
document.getElementById("cancelButton").addEventListener("click", closeWorkModal);

// Close when tapping the dark background
workModal.addEventListener("click", function (event) {
    if (event.target === workModal) {
        closeWorkModal();
    }
});
