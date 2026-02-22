const individualCsvPath = '/files/individual_contributions.csv';
const pacCsvPath = '/files/pac_contributions.csv';

let individualTotal = 0;
let pacTotal = 0;

async function parseCSV(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        return Papa.parse(csvText, { header: true }).data;
    } catch (err) {
        console.error('Fetch error:', err);
        throw err;
    }
}

function calculateTotal(data, amountField) {
    let total = 0;
    for (const row of data) {
        if (row[amountField] && row[amountField] !== '') {
            const amount = parseFloat(row[amountField]);
            if (!isNaN(amount)) {
                total += amount;
            }
        }
    }
    return total;
}

function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderPieChart(individualTotal, pacTotal) {
    const pieChart = document.getElementById('pie-chart');
    const individualLabel = document.getElementById('individual-label');
    const pacLabel = document.getElementById('pac-label');

    const total = individualTotal + pacTotal;
    
    if (total === 0) {
        document.getElementById('error-message').textContent = 'No contribution data found.';
        document.getElementById('error-message').style.display = 'block';
        return;
    }

    const individualPercent = (individualTotal / total) * 100;
    const pacPercent = (pacTotal / total) * 100;

    pieChart.style.background = `conic-gradient(
        #3498db 0deg ${individualPercent * 3.6}deg,
        #e74c3c ${individualPercent * 3.6}deg 360deg
    )`;

    individualLabel.textContent = `Individual: ${formatCurrency(individualTotal)} (${individualPercent.toFixed(1)}%)`;
    pacLabel.textContent = `PAC: ${formatCurrency(pacTotal)} (${pacPercent.toFixed(1)}%)`;
}

async function init() {
    try {
        const [individualData, pacData] = await Promise.all([
            parseCSV(individualCsvPath),
            parseCSV(pacCsvPath)
        ]);

        individualTotal = calculateTotal(individualData, 'amount');
        pacTotal = calculateTotal(pacData, 'amount');

        console.log('Individual Total:', individualTotal);
        console.log('PAC Total:', pacTotal);

        renderPieChart(individualTotal, pacTotal);
    } catch (err) {
        console.error('Error loading contributions data:', err);
        document.getElementById('error-message').textContent = 'Error loading contributions data: ' + err.message;
        document.getElementById('error-message').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', init);
