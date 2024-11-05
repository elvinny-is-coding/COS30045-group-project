function loadCSVData(csvFile) {
    console.log(`Loading CSV file from: ${csvFile}`); // Log the CSV file path
    d3.csv(csvFile).then(data => {
        console.log(data);  // Log the data to see if it's loaded correctly
        clearTable();

        if (data.length === 0) {
            console.error("No data found in the CSV file.");
            return; // Exit if no data
        }

        // Your existing table code here...
    }).catch(error => {
        console.error(`Error loading CSV: ${error}`); // Log error
    });
}
