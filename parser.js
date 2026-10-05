// Global scope channels to communicate safely between file splits
window.rawParsedJson = [];
window.originalCSVHeaders = [];

document.getElementById('csv-file-input').addEventListener('change', function(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const lines = evt.target.result.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) return;

        // Extract headers cleanly
        window.originalCSVHeaders = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
        window.rawParsedJson = [];

        // Map textual spreadsheet rows into object sets
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            const rowObj = {};
            window.originalCSVHeaders.forEach((header, index) => {
                rowObj[header] = cols[index] ? cols[index].replace(/^["']|["']$/g, '').trim() : '';
            });
            window.rawParsedJson.push(rowObj);
        }

        // Safely trigger the scoring initialization sitting inside results.js
        if (typeof window.initializeRegattaScoring === 'function') {
            window.initializeRegattaScoring();
        }
    };
    reader.readAsText(files[0]); // Explicitly grab index 0 to prevent Blob object errors
});
