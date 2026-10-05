// Pure functional low-point scoring processor engine
export function processScores(data, headers) {
    if (!data.length) return [];

    const totalBoats = data.length;
    const penaltyPoints = totalBoats + 1;
    const raceKeys = headers.filter(key => key.toLowerCase().includes('race'));
    const raceCount = raceKeys.length;

    const scoredRows = data.map(boat => {
        let totalPoints = 0;
        let worstScore = -1;
        let worstIndex = -1;
        let scoresList = [];

        raceKeys.forEach((raceKey, idx) => {
            let rawScore = String(boat[raceKey] || '').trim().toUpperCase();
            let numericPoints = 0;

            if (rawScore === '' || isNaN(rawScore)) {
                numericPoints = penaltyPoints; 
            } else {
                numericPoints = Number(rawScore);
            }

            scoresList.push({
                display: rawScore === '' ? 'DNC' : rawScore, 
                value: numericPoints
            });

            if (numericPoints > worstScore) {
                worstScore = numericPoints;
                worstIndex = idx;
            }
            totalPoints += numericPoints;
        });

        let netPoints = totalPoints;
        if (raceCount >= 5 && worstIndex !== -1) {
            netPoints = totalPoints - worstScore;
        }

        return {
            sail: boat["Sail"] || boat["Bow"] || 'N/A',
            name: boat["Boat Name"] || 'N/A',
            helm: boat["Helm Name"] || 'N/A',
            scores: scoresList,
            totalPoints: totalPoints,
            netPoints: netPoints
        };
    });

    // Default sorting order: Low Point score winner ascends to the top
    scoredRows.sort((a, b) => a.netPoints - b.netPoints);
    return { scoredRows, raceCount };
}

// Compiles a new plain text document block for instant local download save hooks
export function generateCSVBlob(headers, scoredRows) {
    let csvContent = "RANK," + headers.join(",") + ",TOTAL,NET\n";

    scoredRows.forEach((row, index) => {
        const rank = index + 1;
        const scoresString = row.scores.map(s => s.display).join(",");
        csvContent += `${rank},${row.sail},${row.name},${row.helm},${scoresString},${row.totalPoints},${row.netPoints}\n`;
    });

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}
