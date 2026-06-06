const budgetForm = document.getElementById("budgetForm");
const budgetTableBody = document.getElementById("budgetTableBody");

const totalIncomeElement = document.getElementById("totalIncome");
const totalExpenseElement = document.getElementById("totalExpense");
const balanceElement = document.getElementById("balance");
const printDateElement = document.getElementById("printDate");

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

            const typeLabel = item.type === "income" ? "Pemasukan" : "Pengeluaran";
            const badgeClass = item.type === "income" ? "badge-income" : "badge-expense";

            row.innerHTML = `
        <td>${index + 1}</td>
        <td>${formatDate(item.date)}</td>
        <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
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

function calculateSummary() {
    const totalIncome = budgetData
        .filter(item => item.type === "income")
        .reduce((total, item) => total + item.amount, 0);

    const totalExpense = budgetData
        .filter(item => item.type === "expense")
        .reduce((total, item) => total + item.amount, 0);

    const balance = totalIncome - totalExpense;

    totalIncomeElement.textContent = formatRupiah(totalIncome);
    totalExpenseElement.textContent = formatRupiah(totalExpense);
    balanceElement.textContent = formatRupiah(balance);

    if (balance < 0) {
        balanceElement.style.color = "#dc2626";
    } else {
        balanceElement.style.color = "#2563eb";
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

    const confirmation = confirm("Yakin ingin menghapus semua catatan anggaran?");

    if (!confirmation) return;

    budgetData = [];
    saveToLocalStorage();
    renderBudgetData();
}

function printReport() {
    window.print();
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
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
