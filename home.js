// =========================
// Rideshare Tracker - home.js
// The home page: today's profit and the six small cards.
// Needs: core.js
// =========================

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
