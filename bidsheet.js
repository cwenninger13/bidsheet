(function () {
  const SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTNyMUnFrPbo824r0UvxIQUIv2sT0OtbjnkuDOE6H139gv7YmPUl7LdzUxGMyJDqDeaHRZ4JHuDM-QC/pub?output=csv";

  const container = document.getElementById("corn-bid-widget");
  if (!container) return;

  container.innerHTML = `
    <style>
      .corn-bid-table {
        font-family: Arial, sans-serif;
        width: 100%;
        border-collapse: collapse;
        border-radius: 12px;
        overflow: hidden;
        margin-top: 10px;
        background: #fff;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      .corn-bid-table th, .corn-bid-table td {
        padding: 10px;
        border: 1px solid #ccc;
        text-align: right;
      }
      .corn-bid-table th {
        background-color: #f4f4f4;
      }
      .corn-bid-table td:first-child, .corn-bid-table th:first-child {
        text-align: left;
      }
      .corn-bid-timestamp {
        margin-top: 8px;
        font-size: 0.85em;
        color: #666;
      }
    </style>
    <h2>Corn Updated</h2>
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

  async function fetchSheetData() {
    const res = await fetch(SHEET_CSV_URL);
    const text = await res.text();
    const rows = text.trim().split("\n").slice(1).map(row => row.split(","));
    return rows.map(([delivery, symbol, basis]) => ({
      delivery: delivery.trim(),
      symbol: symbol.trim(),
      basis: parseFloat(basis.trim())
    }));
  }

  async function fetchYahooQuote(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.CBT`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    try {
      const res = await fetch(proxy);
      const wrapper = await res.json();
      const data = JSON.parse(wrapper.contents);

      const meta = data.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      const prev = meta.previousClose;
      const change = price - prev;

      return { price, change };
    } catch (e) {
      console.error("Failed to fetch", symbol, e);
      return null;
    }
  }

  async function updateTable() {
    try {
      const sheetData = await fetchSheetData();
      const symbols = [...new Set(sheetData.map(row => row.symbol))];
      const futuresData = {};

      // Fetch all Yahoo quotes in parallel
      const results = await Promise.all(symbols.map(fetchYahooQuote));
      symbols.forEach((sym, i) => {
        if (results[i]) futuresData[sym] = results[i];
      });

      const tbody = container.querySelector("tbody");
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

      container.querySelector("#corn-timestamp").textContent =
        "Prices delayed from Yahoo Finance | Updated: " + new Date().toLocaleString();

    } catch (err) {
      container.querySelector("tbody").innerHTML = `<tr><td colspan="6">Error loading data.</td></tr>`;
      console.error("Bid table error:", err);
    }
  }

  updateTable();
  setInterval(updateTable, 10 * 60 * 1000); // every 10 mins
})();
