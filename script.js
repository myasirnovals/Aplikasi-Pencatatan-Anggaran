const budgetForm = document.getElementById("budgetForm");
const budgetTableBody = document.getElementById("budgetTableBody");

const activeMonthInput = document.getElementById("activeMonth");
const openingBalanceElement = document.getElementById("openingBalance");
const totalIncomeElement = document.getElementById("totalIncome");
const totalExpenseElement = document.getElementById("totalExpense");
const emergencyFundElement = document.getElementById("emergencyFund");
const emergencyWarningElement = document.getElementById("emergencyWarning");
const balanceElement = document.getElementById("balance");
const printDateElement = document.getElementById("printDate");
const reportTitleElement = document.getElementById("reportTitle");

const MIN_MONTHLY_EMERGENCY_FUND = 500000;
const LOW_EMERGENCY_FUND_LIMIT = 100000;

let budgetData = JSON.parse(localStorage.getItem("budgetData")) || [];
let activeMonth = localStorage.getItem("activeMonth") || getCurrentMonthValue();

document.addEventListener("DOMContentLoaded", () => {
    activeMonthInput.value = activeMonth;
    applyDateLimitByActiveMonth();
    renderBudgetData();
});

activeMonthInput.addEventListener("change", function () {
    activeMonth = this.value;
    localStorage.setItem("activeMonth", activeMonth);

    applyDateLimitByActiveMonth();
    renderBudgetData();
});

budgetForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const date = document.getElementById("date").value;
    const type = document.getElementById("type").value;
    const category = document.getElementById("category").value.trim();
    const amount = Number(document.getElementById("amount").value);
    const description = document.getElementById("description").value.trim();

    if (!date || !type || !category || amount <= 0) {
        alert("Mohon isi data dengan benar.");
        return;
    }

    if (!isDateInsideActiveMonth(date)) {
        alert("Tanggal transaksi harus berada dalam bulan aktif.");
        applyDateLimitByActiveMonth();
        return;
    }

    if (type === "emergency") {
        const currentMonthBalance = calculateMonthEndingBalance(activeMonth);

        if (amount > currentMonthBalance) {
            alert("Setoran dana darurat tidak boleh melebihi saldo tersedia pada bulan aktif.");
            return;
        }
    }

    if (type === "emergency_withdraw") {
        const emergencyFund = calculateEmergencyFundUntilMonth(activeMonth);

        if (amount > emergencyFund) {
            alert("Dana darurat tidak mencukupi untuk diambil.");
            return;
        }
    }

    const newData = {
        id: Date.now(),
        date,
        type,
        category,
        amount,
        description
    };

    budgetData.push(newData);
    sortBudgetData();
    saveToLocalStorage();
    renderBudgetData();
    budgetForm.reset();
    applyDateLimitByActiveMonth();
});

function getCurrentMonthValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

function applyDateLimitByActiveMonth() {
    const dateInput = document.getElementById("date");

    const [year, month] = activeMonth.split("-").map(Number);
    const firstDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const lastDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    dateInput.min = firstDate;
    dateInput.max = lastDate;

    const today = new Date();
    const todayValue = today.toISOString().split("T")[0];

    if (todayValue >= firstDate && todayValue <= lastDate) {
        dateInput.value = todayValue;
    } else {
        dateInput.value = firstDate;
    }
}

function isDateInsideActiveMonth(dateString) {
    return getMonthKeyFromDate(dateString) === activeMonth;
}

function getMonthKeyFromDate(dateString) {
    return dateString.slice(0, 7);
}

function saveToLocalStorage() {
    localStorage.setItem("budgetData", JSON.stringify(budgetData));
}

function sortBudgetData() {
    budgetData.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();

        return dateA - dateB;
    });
}

function renderBudgetData() {
    budgetTableBody.innerHTML = "";

    const monthlyData = getDataByMonth(activeMonth);

    if (monthlyData.length === 0) {
        budgetTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">Belum ada catatan anggaran pada bulan ini.</td>
      </tr>
    `;
    } else {
        monthlyData.forEach((item, index) => {
            const row = document.createElement("tr");
            const typeInfo = getTypeInfo(item.type);

            row.innerHTML = `
        <td>${index + 1}</td>
        <td>${formatDate(item.date)}</td>
        <td><span class="badge ${typeInfo.badgeClass}">${typeInfo.label}</span></td>
        <td>${escapeHTML(item.category)}</td>
        <td>${formatRupiah(item.amount)}</td>
        <td>${escapeHTML(item.description || "-")}</td>
        <td class="no-print">
          <button class="btn-delete" onclick="deleteBudgetItem(${item.id})">Hapus</button>
        </td>
      `;

            budgetTableBody.appendChild(row);
        });
    }

    calculateSummary();
    updateReportTitle();
    updatePrintDate();
}

function getDataByMonth(monthKey) {
    return budgetData.filter(item => getMonthKeyFromDate(item.date) === monthKey);
}

function getTypeInfo(type) {
    if (type === "income") {
        return {
            label: "Pemasukan",
            badgeClass: "badge-income"
        };
    }

    if (type === "expense") {
        return {
            label: "Pengeluaran",
            badgeClass: "badge-expense"
        };
    }

    if (type === "emergency") {
        return {
            label: "Setor Dana Darurat",
            badgeClass: "badge-emergency"
        };
    }

    if (type === "emergency_withdraw") {
        return {
            label: "Ambil Dana Darurat",
            badgeClass: "badge-emergency-withdraw"
        };
    }

    return {
        label: "Tidak Diketahui",
        badgeClass: "badge-expense"
    };
}

function calculateSummary() {
    const openingBalance = calculateOpeningBalance(activeMonth);
    const monthlyIncome = calculateMonthlyTotalByType(activeMonth, "income");
    const monthlyNormalExpense = calculateMonthlyTotalByType(activeMonth, "expense");
    const monthlyEmergencyDeposit = calculateMonthlyTotalByType(activeMonth, "emergency");
    const monthlyEmergencyWithdraw = calculateMonthlyTotalByType(activeMonth, "emergency_withdraw");

    const emergencyFund = calculateEmergencyFundUntilMonth(activeMonth);

    const totalMonthlyExpense =
        monthlyNormalExpense +
        monthlyEmergencyDeposit +
        monthlyEmergencyWithdraw;

    const remainingBudget =
        openingBalance +
        monthlyIncome -
        totalMonthlyExpense;

    openingBalanceElement.textContent = formatRupiah(openingBalance);
    totalIncomeElement.textContent = formatRupiah(monthlyIncome);
    totalExpenseElement.textContent = formatRupiah(totalMonthlyExpense);
    emergencyFundElement.textContent = formatRupiah(emergencyFund);
    balanceElement.textContent = formatRupiah(remainingBudget);

    if (remainingBudget < 0) {
        balanceElement.style.color = "#dc2626";
    } else {
        balanceElement.style.color = "#2563eb";
    }

    updateEmergencyWarning(emergencyFund, monthlyEmergencyDeposit);
}

function calculateMonthlyTotalByType(monthKey, type) {
    return budgetData
        .filter(item => getMonthKeyFromDate(item.date) === monthKey && item.type === type)
        .reduce((total, item) => total + Number(item.amount), 0);
}

function calculateOpeningBalance(monthKey) {
    let balance = 0;

    const previousData = budgetData.filter(item => {
        return getMonthKeyFromDate(item.date) < monthKey;
    });

    previousData.forEach(item => {
        if (item.type === "income") {
            balance += Number(item.amount);
        }

        if (item.type === "expense") {
            balance -= Number(item.amount);
        }

        if (item.type === "emergency") {
            balance -= Number(item.amount);
        }

        if (item.type === "emergency_withdraw") {
            balance -= Number(item.amount);
        }
    });

    return balance;
}

function calculateMonthEndingBalance(monthKey) {
    const openingBalance = calculateOpeningBalance(monthKey);
    const monthlyIncome = calculateMonthlyTotalByType(monthKey, "income");
    const monthlyNormalExpense = calculateMonthlyTotalByType(monthKey, "expense");
    const monthlyEmergencyDeposit = calculateMonthlyTotalByType(monthKey, "emergency");
    const monthlyEmergencyWithdraw = calculateMonthlyTotalByType(monthKey, "emergency_withdraw");

    return (
        openingBalance +
        monthlyIncome -
        monthlyNormalExpense -
        monthlyEmergencyDeposit -
        monthlyEmergencyWithdraw
    );
}

function calculateEmergencyFundUntilMonth(monthKey) {
    let emergencyFund = 0;

    const dataUntilThisMonth = budgetData.filter(item => {
        return getMonthKeyFromDate(item.date) <= monthKey;
    });

    dataUntilThisMonth.forEach(item => {
        if (item.type === "emergency") {
            emergencyFund += Number(item.amount);
        }

        if (item.type === "emergency_withdraw") {
            emergencyFund -= Number(item.amount);
        }
    });

    return emergencyFund;
}

function updateEmergencyWarning(emergencyFund, monthlyEmergencyDeposit) {
    let warningMessages = [];

    if (monthlyEmergencyDeposit < MIN_MONTHLY_EMERGENCY_FUND) {
        warningMessages.push(
            `⚠️ Setoran dana darurat bulan ini kurang dari ${formatRupiah(MIN_MONTHLY_EMERGENCY_FUND)}`
        );
    }

    if (emergencyFund < LOW_EMERGENCY_FUND_LIMIT) {
        warningMessages.push(
            `🚨 Dana darurat menipis, saldo di bawah ${formatRupiah(LOW_EMERGENCY_FUND_LIMIT)}`
        );
    }

    if (warningMessages.length > 0) {
        emergencyWarningElement.className = "warning-text";
        emergencyWarningElement.innerHTML = warningMessages.join("<br>");
    } else {
        emergencyWarningElement.className = "safe-text";
        emergencyWarningElement.textContent = "✅ Dana darurat aman bulan ini";
    }
}

function deleteBudgetItem(id) {
    const confirmation = confirm("Yakin ingin menghapus catatan ini?");

    if (!confirmation) return;

    budgetData = budgetData.filter(item => item.id !== id);
    saveToLocalStorage();
    renderBudgetData();
}

function clearAllData() {
    if (budgetData.length === 0) {
        alert("Belum ada data yang bisa dihapus.");
        return;
    }

    const confirmation = confirm("Yakin ingin menghapus semua catatan anggaran dari seluruh bulan?");

    if (!confirmation) return;

    budgetData = [];
    saveToLocalStorage();
    renderBudgetData();
}

function printReport() {
    window.print();
}

function exportCSV() {
    if (budgetData.length === 0) {
        alert("Belum ada data untuk disimpan ke CSV.");
        return;
    }

    const csvHeader = ["id", "date", "type", "category", "amount", "description"];

    const csvRows = budgetData.map(item => {
        return [
            item.id,
            item.date,
            item.type,
            escapeCSV(item.category),
            item.amount,
            escapeCSV(item.description || "")
        ].join(",");
    });

    const csvContent = [csvHeader.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const fileDate = new Date().toISOString().split("T")[0];

    link.href = url;
    link.download = `data-anggaran-semua-bulan-${fileDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);
}

function importCSV(event) {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        const csvText = e.target.result;
        const parsedData = parseCSV(csvText);

        if (parsedData.length === 0) {
            alert("File CSV kosong atau format tidak sesuai.");
            return;
        }

        const confirmation = confirm(
            "Load CSV akan mengganti semua data yang sedang ada di aplikasi. Lanjutkan?"
        );

        if (!confirmation) return;

        budgetData = parsedData;
        sortBudgetData();
        saveToLocalStorage();
        renderBudgetData();

        event.target.value = "";
        alert("Data CSV berhasil dimuat.");
    };

    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);

    if (lines.length < 2) return [];

    const header = splitCSVLine(lines[0]);
    const requiredHeader = ["id", "date", "type", "category", "amount", "description"];

    const isHeaderValid = requiredHeader.every((col, index) => header[index] === col);

    if (!isHeaderValid) {
        alert("Format header CSV tidak sesuai.");
        return [];
    }

    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = splitCSVLine(lines[i]);

        if (values.length < 6) continue;

        const item = {
            id: Number(values[0]) || Date.now() + i,
            date: values[1],
            type: values[2],
            category: values[3],
            amount: Number(values[4]),
            description: values[5]
        };

        if (
            item.date &&
            ["income", "expense", "emergency", "emergency_withdraw"].includes(item.type) &&
            item.category &&
            item.amount > 0
        ) {
            data.push(item);
        }
    }

    return data;
}

function escapeCSV(value) {
    const text = String(value);
    const escapedText = text.replaceAll('"', '""');

    return `"${escapedText}"`;
}

function splitCSVLine(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"' && insideQuotes && nextChar === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            result.push(current);
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

function updateReportTitle() {
    const [year, month] = activeMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);

    const formattedMonth = new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric"
    }).format(date);

    reportTitleElement.textContent = `Laporan Detail Anggaran - ${formattedMonth}`;
}

function formatRupiah(number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(number);
}

function formatDate(dateString) {
    const date = new Date(dateString);

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(date);
}

function updatePrintDate() {
    const now = new Date();

    const formattedDate = new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(now);

    printDateElement.textContent = `Dicetak pada: ${formattedDate}`;
}

function escapeHTML(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
