(function () {
  const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTNyMUnFrPbo824r0UvxIQUIv2sT0OtbjnkuDOE6H139gv7YmPUl7LdzUxGMyJDqDeaHRZ4JHuDM-QC/pub?output=csv";
  const BARCHART_API_KEY = "bcd118c6edf926e7f7d038ca212c8df9";
  const API_BASE = "https://ondemand.websol.barchart.com/getQuote.csv";

  async function fetchSheetData() {
    const res = await fetch(SHEET_CSV_URL);
    const text = await res.text();
    const rows = text.trim().split("\n").slice(1).map(row => row.split(","));
    return rows.map(([delivery, symbol, basis]) => ({
      delivery: delivery?.trim(),
      symbol: symbol?.trim(),
      basis: parseFloat(basis?.trim())
    }));
  }

  async function fetchFuturesQuotes(symbols) {
    const query = `${API_BASE}?apikey=${BARCHART_API_KEY}&symbols=${symbols.join(",")}`;
    const res = await fetch(query);
    const text = await res.text();
    const lines = text.trim().split("\n");
    const idxPrice = 5;
    const idxChange = 7;

    const data = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const symbol = cols[0].replace(/"/g, "");
      const price = parseFloat(cols[idxPrice].replace(/"/g, "")) / 100;
      const change = parseFloat(cols[idxChange].replace(/"/g, "")) / 100;
      data[symbol] = { price, change };
    }
    return data;
  }

  async function renderBidTable() {
    const container = document.getElementById("corn-bid-widget");
    if (!container) return;

    container.innerHTML = `
      <style>
        .corn-bid-table {
          font-family: Arial, sans-serif;
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .corn-bid-table th, .corn-bid-table td {
          padding: 10px;
          border: 1px solid #ccc;
          text-align: right;
        }
        .corn-bid-table th {
          background-color: #f4f4f4;
        }
        .corn-bid-table td:first-child,
        .corn-bid-table th:first-child {
          text-align: left;
        }
        .corn-bid-timestamp {
          margin-top: 12px;
          font-size: 0.85em;
          color: #666;
        }
      </style>
      <h2>Corn</h2>
      <table class="corn-bid-table">
        <thead>
          <tr>
            <th>Delivery</th>
            <th>Futures Month</th>
            <th>Futures</th>
            <th>Change</th>
            <th>Basis</th>
            <th>Bid</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
      <div class="corn-bid-timestamp" id="corn-timestamp"></div>
    `;

    const tbody = container.querySelector("tbody");
    const timestamp = container.querySelector("#corn-timestamp");

    try {
      const sheetData = await fetchSheetData();
      const symbols = [...new Set(sheetData.map(row => row.symbol))];
      const futuresData = await fetchFuturesQuotes(symbols);

      tbody.innerHTML = "";

      sheetData.forEach(row => {
        const future = futuresData[row.symbol];
        if (!future) return;

        const bid = (future.price + row.basis).toFixed(4);
        const futPrice = future.price.toFixed(4);
        const futChange = future.change.toFixed(4);
        const basis = row.basis.toFixed(2);

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.delivery}</td>
          <td>${row.symbol}</td>
          <td>${futPrice}</td>
          <td style="color: ${future.change >= 0 ? 'green' : 'red'};">${futChange}</td>
          <td>${basis}</td>
          <td>${bid}</td>
        `;
        tbody.appendChild(tr);
      });

      timestamp.textContent = "Powered by Professional Ag Marketing: " + new Date().toLocaleString();
    } catch (err) {
      console.error("Error loading bid table:", err);
      tbody.innerHTML = `<tr><td colspan="6">Error loading data.</td></tr>`;
    }
  }

  renderBidTable();
  setInterval(renderBidTable, 10 * 60 * 1000);
})();
