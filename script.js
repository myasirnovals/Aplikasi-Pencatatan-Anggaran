const budgetForm = document.getElementById("budgetForm");
const budgetTableBody = document.getElementById("budgetTableBody");

const totalIncomeElement = document.getElementById("totalIncome");
const totalExpenseElement = document.getElementById("totalExpense");
const emergencyFundElement = document.getElementById("emergencyFund");
const emergencyWarningElement = document.getElementById("emergencyWarning");
const balanceElement = document.getElementById("balance");
const printDateElement = document.getElementById("printDate");

const MIN_MONTHLY_EMERGENCY_FUND = 500000;
const LOW_EMERGENCY_FUND_LIMIT = 100000;

let budgetData = JSON.parse(localStorage.getItem("budgetData")) || [];

document.addEventListener("DOMContentLoaded", () => {
    setTodayDate();
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

    if (type === "emergency") {
        const totalAvailableIncome = calculateAvailableBalance();

        if (amount > totalAvailableIncome) {
            alert("Setoran dana darurat tidak boleh melebihi saldo tersedia dari pemasukan.");
            return;
        }
    }

    if (type === "emergency_withdraw") {
        const emergencyFund = calculateEmergencyFund();

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
    saveToLocalStorage();
    renderBudgetData();
    budgetForm.reset();
    setTodayDate();
});

function setTodayDate() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("date").value = today;
}

function saveToLocalStorage() {
    localStorage.setItem("budgetData", JSON.stringify(budgetData));
}

function renderBudgetData() {
    budgetTableBody.innerHTML = "";

    if (budgetData.length === 0) {
        budgetTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">Belum ada catatan anggaran.</td>
      </tr>
    `;
    } else {
        budgetData.forEach((item, index) => {
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
    updatePrintDate();
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
    const totalIncome = calculateTotalByType("income");
    const totalExpense = calculateTotalByType("expense");
    const emergencyFund = calculateEmergencyFund();
    const balance = calculateAvailableBalance();

    totalIncomeElement.textContent = formatRupiah(totalIncome);
    totalExpenseElement.textContent = formatRupiah(totalExpense);
    emergencyFundElement.textContent = formatRupiah(emergencyFund);
    balanceElement.textContent = formatRupiah(balance);

    if (balance < 0) {
        balanceElement.style.color = "#dc2626";
    } else {
        balanceElement.style.color = "#2563eb";
    }

    updateEmergencyWarning(emergencyFund);
}

function calculateTotalByType(type) {
    return budgetData
        .filter(item => item.type === type)
        .reduce((total, item) => total + Number(item.amount), 0);
}

function calculateEmergencyFund() {
    const emergencyDeposit = calculateTotalByType("emergency");
    const emergencyWithdraw = calculateTotalByType("emergency_withdraw");

    return emergencyDeposit - emergencyWithdraw;
}

function calculateAvailableBalance() {
    const totalIncome = calculateTotalByType("income");
    const totalExpense = calculateTotalByType("expense");
    const emergencyFund = calculateEmergencyFund();

    return totalIncome - totalExpense - emergencyFund;
}

function updateEmergencyWarning(emergencyFund) {
    const monthlyDeposit = calculateCurrentMonthEmergencyDeposit();

    let warningMessages = [];

    if (monthlyDeposit < MIN_MONTHLY_EMERGENCY_FUND) {
        warningMessages.push(
            `⚠️ Setoran bulan ini kurang dari ${formatRupiah(MIN_MONTHLY_EMERGENCY_FUND)}`
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

function calculateCurrentMonthEmergencyDeposit() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return budgetData
        .filter(item => {
            if (item.type !== "emergency") return false;

            const itemDate = new Date(item.date);
            return (
                itemDate.getMonth() === currentMonth &&
                itemDate.getFullYear() === currentYear
            );
        })
        .reduce((total, item) => total + Number(item.amount), 0);
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

    const confirmation = confirm("Yakin ingin menghapus semua catatan anggaran?");

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
    link.download = `data-anggaran-${fileDate}.csv`;
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
            "Load CSV akan mengganti data yang sedang ada di aplikasi. Lanjutkan?"
        );

        if (!confirmation) return;

        budgetData = parsedData;
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
