// File Processing Functions

/**
 * Process an Excel file and convert it to a delimited text file with mapped data
 * @param {File} file - The Excel file to process
 * @param {string} sheetName - The name of the sheet to process
 * @param {Object} analysis - The analysis object containing column mappings and data start row
 * @returns {Promise} - Resolves when processing is complete
 */
async function processFullFile(file, sheetName, analysis) {
    return new Promise((resolve, reject) => {
        try {
            logToConsole('Processing file with combined mapping...');
            const downloadBtn = document.getElementById('downloadButton2');
            if (downloadBtn) {
                // Initially disable the button
                downloadBtn.disabled = true;
                downloadBtn.style.backgroundColor = '';
                downloadBtn.onclick = null;
                logToConsole('Download button disabled until processing completes');
            }

            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Convert input sheet name to lowercase
                    const inputSheetNameLower = sheetName.toLowerCase();

                    // Find the sheet name in a case-insensitive way
                    const actualSheetName = Object.keys(workbook.Sheets).find(
                        name => name.toLowerCase() === inputSheetNameLower
                    );

                    if (!actualSheetName) {
                        throw new Error(`Sheet "${sheetName}" not found in workbook`);
                    }

                    const sheet = workbook.Sheets[actualSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    // Get column indices (convert A,B,C to 0,1,2)
                    const columnIndices = {
                        isin: analysis.columns.isin.charCodeAt(0) - 65,
                        instrumentName: analysis.columns.instrumentName.charCodeAt(0) - 65,
                        marketValue: analysis.columns.marketValue.charCodeAt(0) - 65,
                        quantity: analysis.columns.quantity.charCodeAt(0) - 65
                    };

                    logToConsole('Column indices:', JSON.stringify(columnIndices));

                    // Get the selected delimiter
                    const delimiter = document.getElementById('delimiterInput').value;
                    // Convert the string "\t" to an actual tab character if tab is selected
                    const actualDelimiter = delimiter === '\\t' ? '\t' : delimiter;
                    logToConsole(`Using delimiter: ${delimiter === '\\t' ? 'Tab' : delimiter}`);

                    // Create headers for the delimited file with all fields
                    let outputRows = [`SCHEME_NAME${actualDelimiter}MONTH_END${actualDelimiter}ISIN${actualDelimiter}INSTRUMENT_NAME${actualDelimiter}MARKET_VALUE${actualDelimiter}QUANTITY${actualDelimiter}BSE_SYMBOL${actualDelimiter}NSE_SYMBOL${actualDelimiter}COMPANY_NAME_STD`];
                    let totalMarketValue = 0;
                    let totalQuantity = 0;
                    let validRecordCount = 0;

                    // Get scheme name and month end date
                    const schemeName = document.getElementById('schemeNameInput').value.toUpperCase();
                    const monthEndDate = document.getElementById('monthEndInput').value;
                    const formattedDate = monthEndDate ? new Date(monthEndDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }).replace(/\//g, '-') : '';

                    // Read ISIN mapping first
                    let isinMap = new Map();
                    try {
                        const mappingResponse = await fetch('ISIN_SYMBOL_MAPPING.csv');
                        const mappingData = await mappingResponse.text();
                        const mappingRows = mappingData.split('\n');
                        for(let i = 1; i < mappingRows.length; i++) {
                            const row = mappingRows[i].split(',');
                            if(row.length >= 4) {
                                isinMap.set(row[1].trim(), {
                                    std_company_name: row[0].trim().replace(/[\r\n]+/g, ' '),
                                    bse_symbol: row[2].trim().replace(/[\r\n]+/g, ''),
                                    nse_symbol: row[3].trim().replace(/[\r\n]+/g, '')
                                });
                            }
                        }
                        logToConsole(`Loaded ${isinMap.size} ISIN mappings`);
                    } catch (error) {
                        logToConsole(`Warning: Error reading ISIN mapping file: ${error.message}`, true);
                    }

                    // Process rows starting from dataStartRow
                    const startRow = analysis.dataStartRow - 1; // Convert to 0-based index
                    const endRow = jsonData.length;
                    logToConsole(`Processing rows from ${startRow} to ${endRow}`);

                    // Process each row with mappings included
                    for (let i = startRow; i < endRow; i++) {
                        const row = jsonData[i];
                        if (!row) continue;

                        const isin = row[columnIndices.isin];
                        if (isin && typeof isin === 'string' && isin.startsWith('IN')) {
                            validRecordCount++;
                            const marketValue = row[columnIndices.marketValue] || 0;
                            const quantity = row[columnIndices.quantity] || 0;
                            
                            // Get mapping data
                            const mappedData = isinMap.get(isin) || {
                                std_company_name: '',
                                bse_symbol: '',
                                nse_symbol: ''
                            };

                            // Create row with all fields
                            const outputRow = [
                                schemeName,
                                formattedDate,
                                isin,
                                row[columnIndices.instrumentName] || '',
                                marketValue || '',
                                quantity || '',
                                mappedData.bse_symbol,
                                mappedData.nse_symbol,
                                mappedData.std_company_name
                            ].join(actualDelimiter);
                            outputRows.push(outputRow);

                            // Update totals
                            const marketValueNum = parseFloat(String(marketValue).replace(/[^\d.-]/g, '')) || 0;
                            if (!isNaN(marketValueNum)) totalMarketValue += marketValueNum;
                            const quantityNum = parseFloat(String(quantity).replace(/[^\d.-]/g, '')) || 0;
                            if (!isNaN(quantityNum)) totalQuantity += quantityNum;
                        }
                    }

                    // Update display values with totals
                    const totalValueDisplay = document.getElementById('totalValueDisplay');
                    if (totalValueDisplay) {
                        const formattedTotal = totalMarketValue.toLocaleString('en-IN', {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: 2
                        });
                        totalValueDisplay.textContent = formattedTotal;
                        logToConsole(`Total Market Value: ${formattedTotal}`);
                    }

                    const recordCountDisplay = document.getElementById('recordCountDisplay');
                    if (recordCountDisplay) {
                        recordCountDisplay.textContent = validRecordCount.toLocaleString('en-IN');
                        logToConsole(`Valid Record Count: ${validRecordCount}`);
                    }

                    const totalQuantityDisplay = document.getElementById('totalQuantityDisplay');
                    if (totalQuantityDisplay) {
                        const formattedQuantity = totalQuantity.toLocaleString('en-IN', {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: 2
                        });
                        totalQuantityDisplay.textContent = formattedQuantity;
                        logToConsole(`Total Quantity: ${formattedQuantity}`);
                    }

                    // Get OpenAI value and add difference row
                    const openAIDisplay = document.getElementById('openAITotalValueDisplay');
                    if (openAIDisplay) {
                        const openAIValue = parseFloat(openAIDisplay.textContent.replace(/[^\d.-]/g, ''));
                        if (!isNaN(openAIValue)) {
                            const difference = openAIValue - totalMarketValue;
                            const diffRow = [
                                schemeName,
                                formattedDate,
                                'IN9999999999',
                                'ZZZ! Cash / Derivatives / Balancing Num',
                                difference,
                                '',
                                '', // BSE_SYMBOL
                                '', // NSE_SYMBOL
                                ''  // COMPANY_NAME_STD
                            ].join(actualDelimiter);
                            outputRows.push(diffRow);
                            
                            // Update difference display
                            const diffAmtDisplay = document.getElementById('diffAmtDisplay');
                            if (diffAmtDisplay) {
                                const formattedDiff = difference.toLocaleString('en-IN', {
                                    maximumFractionDigits: 2,
                                    minimumFractionDigits: 2
                                });
                                diffAmtDisplay.textContent = formattedDiff;
                            }
                        }
                    }

                    // Create final file and set up download
                    const fileContent = outputRows.join('\n');
                    const fileName = `${file.name.replace(/\.[^/.]+$/, '')}_${actualSheetName}_mod.txt`;
                    
                    // Set up download button
                    if (downloadBtn) {
                        downloadBtn.disabled = false;
                        downloadBtn.style.backgroundColor = '#16a34a';
                        downloadBtn.style.cursor = 'pointer';
                        downloadBtn.classList.remove('disabled');
                        downloadBtn.removeAttribute('disabled');
                        
                        downloadBtn.onclick = function() {
                            logToConsole('Download button clicked, creating file...');
                            const blob = new Blob([fileContent], { type: 'text/plain' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileName;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                            logToConsole(`Downloading file: ${fileName}`);
                        };
                    }

                    // Display in table
                    displayInTable(outputRows);
                    resolve();
                } catch (error) {
                    logToConsole(`Error processing file: ${error.message}`, true);
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            logToConsole(`Error: ${error.message}`, true);
            reject(error);
        }
    });
}

// Export the function to make it available to other files
window.processFullFile = processFullFile; 