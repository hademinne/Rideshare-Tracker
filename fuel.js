// =========================
// Rideshare Tracker - fuel.js
// The fuel page: the list of fill-ups + the "add fuel" popup.
// Needs: core.js
// =========================

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


// ---------- Add fuel popup ----------

const fuelModal = document.getElementById("fuelModal");
const fuelForm = document.getElementById("fuelForm");

function openFuelModal() {
    fuelForm.reset();
    document.getElementById("fuelDate").value = getTodayString();
    fuelModal.classList.remove("hidden");
}

function closeFuelModal() {
    fuelModal.classList.add("hidden");
}

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

document.getElementById("addFuelTop").addEventListener("click", openFuelModal);
document.getElementById("fuelCancelButton").addEventListener("click", closeFuelModal);

// Close when tapping the dark background
fuelModal.addEventListener("click", function (event) {
    if (event.target === fuelModal) {
        closeFuelModal();
    }
});
