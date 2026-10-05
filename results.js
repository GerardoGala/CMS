(function() {
    let scoredRows = [];
    let raceCount = 0;
    let currentPage = 1;
    let currentSortIndex = 0; 
    let currentSortAsc = true;

    function getRowsPerPage() {
        return window.matchMedia("(max-width: 768px)").matches ? 6 : 12;
    }

    // Global hook listener fired natively when parser.js completes its read cycle
    window.initializeRegattaScoring = function() {
        const data = window.rawParsedJson;
        const headers = window.originalCSVHeaders;
        if (!data || !data.length) return;

        const totalBoats = data.length;
        const penaltyPoints = totalBoats + 1;
        const raceKeys = headers.filter(key => key.toLowerCase().includes('race'));
        raceCount = raceKeys.length;

        scoredRows = data.map(boat => {
            let totalPoints = 0;
            let scoresList = [];

            raceKeys.forEach(raceKey => {
                let rawScore = String(boat[raceKey] || '').trim().toUpperCase();
                let numericPoints = (rawScore === '' || isNaN(rawScore)) ? penaltyPoints : Number(rawScore);

                scoresList.push({
                    display: rawScore === '' ? 'DNC' : rawScore, 
                    value: numericPoints
                });
                totalPoints += numericPoints;
            });

            return {
                sail: boat["Sail"] || boat["Bow"] || 'N/A',
                name: boat["Boat Name"] || 'N/A',
                helm: boat["Helm Name"] || 'N/A',
                scores: scoresList,
                totalPoints: totalPoints,
                netPoints: totalPoints // Assigned standard total temporarily before discard filter checks
            };
        });

        // Compute render-time Net Discard points dynamically
        scoredRows.forEach(row => {
            if (raceCount >= 5) {
                let maxVal = -1;
                row.scores.forEach(s => { if (s.value > maxVal) maxVal = s.value; });
                if (maxVal !== -1) row.netPoints = row.totalPoints - maxVal;
            }
        });

        currentSortIndex = 4 + raceCount; 
        currentSortAsc = true;
        sortData();

        window.removeEventListener('resize', renderTableAndPagination);
        window.addEventListener('resize', renderTableAndPagination);
        
        buildTableFramework();
        enableCSVExportButton();
    };

    function buildTableFramework() {
        const target = document.getElementById('targetArea');
        if (!target) return;

        let raceHeaders = "";
        for (let i = 1; i <= raceCount; i++) {
            raceHeaders += '<th data-type="race" data-idx="' + (i - 1) + '">R' + i + '</th>';
        }

        target.innerHTML = `
            <table class="report-table">
                <thead>
                    <tr>
                        <th data-type="meta" data-idx="sail">SAIL</th>
                        <th data-type="meta" data-idx="name">BOAT NAME</th>
                        <th data-type="meta" data-idx="helm">HELM</th>
                        ${raceHeaders}
                        <th data-type="meta" data-idx="total">TOTAL</th>
                        <th data-type="meta" data-idx="net">NET</th>
                    </tr>
                </thead>
                <tbody id="table-rows-body"></tbody>
            </table>`;

        target.querySelector('thead').addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (!th) return;

            const type = th.getAttribute('data-type');
            const idx = th.getAttribute('data-idx');

            if (type === 'meta') {
                if (idx === 'sail') currentSortIndex = 1;
                if (idx === 'name') currentSortIndex = 2;
                if (idx === 'helm') currentSortIndex = 3;
                if (idx === 'total') currentSortIndex = 3 + raceCount;
                if (idx === 'net') currentSortIndex = 4 + raceCount;
            } else if (type === 'race') {
                currentSortIndex = 3 + parseInt(idx, 10);
            }

            currentSortAsc = !currentSortAsc; 
            sortData();
            renderTableAndPagination();
        });

        renderTableAndPagination();
    }

    function sortData() {
        scoredRows.sort((a, b) => {
            let valA, valB;

            if (currentSortIndex === 1) { valA = a.sail; valB = b.sail; }
            else if (currentSortIndex === 2) { valA = a.name; valB = b.name; }
            else if (currentSortIndex === 3) { valA = a.helm; valB = b.helm; }
            else if (currentSortIndex >= 4 && currentSortIndex < 4 + raceCount) {
                const rIdx = currentSortIndex - 4;
                valA = a.scores[rIdx].value;
                valB = b.scores[rIdx].value;
            }
            else if (currentSortIndex === 4 + raceCount) { valA = a.totalPoints; valB = b.totalPoints; }
            else { valA = a.netPoints; valB = b.netPoints; }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return currentSortAsc ? valA - valB : valB - valA;
            }
            return currentSortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
        });
    }

    function renderTableAndPagination() {
        const tbody = document.getElementById('table-rows-body');
        const nav = document.getElementById('paginationControls');
        if (!tbody || !scoredRows.length) return;

        const rowsPerPage = getRowsPerPage();
        const totalRows = scoredRows.length;
        const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
        
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const pageSubset = scoredRows.slice(start, end);

        tbody.innerHTML = pageSubset.map(row => {
            let maxPointsValue = -1, discardIndex = -1;
            if (raceCount >= 5) {
                row.scores.forEach((s, idx) => {
                    if (s.value > maxPointsValue) { maxPointsValue = s.value; discardIndex = idx; }
                });
            }

            let scoreCells = "";
            row.scores.forEach((scoreObj, idx) => {
                scoreCells += (idx === discardIndex) ? `<td><span class="discard">${scoreObj.display}</span></td>` : `<td>${scoreObj.display}</td>`;
            });

            return `<tr><td>${row.sail}</td><td><strong>${row.name}</strong></td><td>${row.helm}</td>${scoreCells}<td>${row.totalPoints}</td><td><strong>${row.netPoints}</strong></td></tr>`;
        }).join('');

        nav.innerHTML = `
            <div class="page-indicator">Showing ${start + 1}-${Math.min(end, totalRows)} of ${totalRows} competitors</div>
            <div class="pagination-buttons">
                <button class="pagination-btn" id="prevBtn" ${currentPage === 1 ? 'disabled' : ''}>PREV</button>
                <button class="pagination-btn" id="nextBtn" ${currentPage === totalPages ? 'disabled' : ''}>NEXT</button>
            </div>`;

        document.getElementById('prevBtn').onclick = () => { currentPage--; renderTableAndPagination(); };
        document.getElementById('nextBtn').onclick = () => { currentPage++; renderTableAndPagination(); };
    }

    function enableCSVExportButton() {
        const downloadBtn = document.getElementById('download-scored-btn');
        if (!downloadBtn) return;

        downloadBtn.disabled = false;
        downloadBtn.style.backgroundColor = '#000000';
        downloadBtn.style.color = '#ffffff';
        downloadBtn.style.borderColor = '#000000';
        downloadBtn.style.cursor = 'pointer';

        downloadBtn.onclick = function() {
            let csvContent = "RANK," + window.originalCSVHeaders.join(",") + ",TOTAL,NET\n";

            scoredRows.forEach((row, index) => {
                const rank = index + 1;
                const scoresString = row.scores.map(s => s.display).join(",");
                csvContent += `${rank},${row.sail},${row.name},${row.helm},${scoresString},${row.totalPoints},${row.netPoints}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "ranked_regatta_results.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
    }
})();
