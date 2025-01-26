// API Processing Functions
async function analyzeWithGemini(prompt) {
    try {
        const promptWithFormat = `${prompt}

        Please analyze and respond with ONLY a JSON object in this exact format below. Dont add anything else or any explanations as the JSON would be used as a schema for further automated processing:
        {
            "dataStartRow": number,
            "columns": {
                "isin": string,
                "instrumentName": string,
                "marketValue": string,
                "quantity": string
            }
        }

        Do not include any additional text, markdown formatting, or explanations.`;

        const response = await fetch(`${CONFIG.RT_ENDPOINT}/open-router-completion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.OPENROUTER_MODEL_STRUCTURE,
                messages: [
                    {
                        role: "user",
                        content: promptWithFormat
                    }
                ],
                temperature: 0,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            logToConsole(`Gemini API Error Response: ${errorText}`, true);
            throw new Error(`Gemini API call failed: ${response.statusText}. Details: ${errorText}`);
        }

        const result = await response.json();
        // Log the raw API response
        logToConsole('\n=== Raw OpenRouter Structure Analysis Response ===');
        logToConsole(JSON.stringify(result, null, 2));

        if (!result.choices || !result.choices[0] || !result.choices[0].message) {
            logToConsole(`Invalid Gemini API Response Structure: ${JSON.stringify(result)}`, true);
            throw new Error('Invalid Gemini API response format');
        }

        const content = result.choices[0].message.content;
        // Parse and log the parsed content
        const parsedContent = JSON.parse(content);
        logToConsole('\n=== Parsed OpenRouter Structure Analysis Response ===');
        logToConsole('Data Start Row:', parsedContent.dataStartRow);
        logToConsole('Column Mappings:', JSON.stringify(parsedContent.columns, null, 2));
        logToConsole('Schema Format:', `${parsedContent.dataStartRow}-${parsedContent.columns.isin}-${parsedContent.columns.instrumentName}-${parsedContent.columns.marketValue}-${parsedContent.columns.quantity}`);

        // Parse and display the Gemini structure response
        try {
            const parsedGeminiContent = JSON.parse(content);
            const geminiSchemaDisplay = document.getElementById('geminiSchemaDisplay');
            if (geminiSchemaDisplay) {
                const rowNum = parsedGeminiContent.dataStartRow;
                const cols = parsedGeminiContent.columns;
                const displayValue = `${rowNum}-${cols.isin}-${cols.instrumentName}-${cols.marketValue}-${cols.quantity}`;
                geminiSchemaDisplay.textContent = displayValue;
                
                // Compare schemas after both are populated
                const openaiDisplay = document.getElementById('schemaAnalysisDisplay');
                if (openaiDisplay && openaiDisplay.textContent !== 'Waiting...') {
                    compareAndHighlightSchemas(openaiDisplay.textContent, displayValue);
                }
            }
        } catch (e) {
            logToConsole(`Failed to parse Gemini content: ${content}`, true);
        }

        return content;
    } catch (error) {
        logToConsole(`Gemini API Error: ${error.message}`, true);
        throw error;
    }
}

// Export the function to make it available to other files
window.analyzeWithGemini = analyzeWithGemini;

// Add analyzeWithAI function
async function analyzeWithAI(initialRows, file, sheetName) {
    try {
        // Read the complete file for total value analysis
        logToConsole('Reading complete file data...');
        const completeData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
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
                    logToConsole(`Complete data rows: ${jsonData.length}`);

                    if (jsonData.length === 0) {
                        throw new Error('No data found in sheet');
                    }

                    resolve(jsonData);
                } catch (error) {
                    logToConsole(`Error reading complete data: ${error.message}`, true);
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                logToConsole(`Error reading file: ${error}`, true);
                reject(new Error('Error reading file'));
            };
            reader.readAsArrayBuffer(file);
        });

        // Prepare prompts
        const prompt = `
        I'm analyzing a mutual fund portfolio allocation disclosure file from India. 
        This is a monthly portfolio disclosure file that mutual funds in India must publish.
        
        I need to identify:
        1. The row number where actual data starts (excluding headers). So when I import the data that row would be the first row to be imported. The first data row would always be the first row where the ISIN number and the instrument / security name / stock name  is non-empty. ISIN is the unique identifier for a insturment/ security / stock and always starts with 'IN"'.The first data row is the first row where both the ISIN column contains a value starting with 'IN' and the Instrument Name column is non-empty
        2. The column indices (using letters A, B, C, etc.) for:
           - ISIN (could be labeled as "ISIN", "ISIN number", etc.)
           - Instrument Name (could be "Name of company", "Name of instrument", "Instrument", etc.)
           - Market Value (could be "Market value", "Fair value", "NAV", "FV", etc.)
           - Quantity (could be labeled as "Quantity", "Qty", "Nos", "#", "Units", "No. of Units", etc.)
        
        This information will be used to extract these specific columns and convert them into a pipe-delimited format.
        Please provide the column letters (A, B, C, etc.) where these fields are located.
        
        Here are the first ${initialRows.length} rows of the file:
        ${JSON.stringify(initialRows, null, 2)}
        
        Please analyze and respond with ONLY a JSON object in this format:
        {
            "dataStartRow": number,
            "columns": {
                "isin": "column letter (A, B, C, etc.)",
                "instrumentName": "column letter (A, B, C, etc.)",
                "marketValue": "column letter (A, B, C, etc.)"
            }
        }`;

        logToConsole(`Preparing total value analysis for ${completeData.length} rows...`);
        const totalValuePrompt = `
        I'm analyzing a mutual fund portfolio disclosure file from India. This file contains market values or NAV (Net Asset Value) for various holdings.
        
        I need to find the TOTAL market value or NAV. This total might be labeled as:
        - Grand Total
        - Grand Total Market Value
        - Net Assets
        - Net Asset Value
        - Total NAV
        
        Important Context:
        1. This total is typically found in the same column as other market values/NAV values (column G)
        2. It's usually towards the end of the data, but might be followed by additional schedules
        3. The total row might contain other metrics, but we only want the market value/NAV total
        4. The value should be in the same column as other market values
        
        Here is the complete file data (${completeData.length} rows):
        ${JSON.stringify(completeData, null, 2)}
        
        Please analyze and respond with ONLY a JSON object containing the total value:
        {
            "totalValue": number
        }`;

        logToConsole('Making API calls...');

        // Make API calls with better error handling
        const apiCalls = [
            // OpenAI API call for structure
            (async () => {
                const requestBody = {
                    model: CONFIG.OPENAI_MODEL_STRUCTURE,
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant that analyzes Excel file structures. You identify column positions using letters (A, B, C, etc.) and respond only with JSON."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    response_format: { "type": "json_object" },
                    temperature: 0
                };
                logToConsole('\n=== OpenAI Structure Analysis Request ===');
                logToConsole('URL:', `${CONFIG.RT_ENDPOINT}/open-chat-completion`);
                logToConsole('Request Body:');
                logToConsole(JSON.stringify(requestBody, null, 2));

                try {
                    const response = await fetch(`${CONFIG.RT_ENDPOINT}/open-chat-completion`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    }).catch(error => {
                        logToConsole(`Network error during fetch: ${error.message}`, true);
                        throw new Error(`Network error: ${error.message}`);
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        logToConsole('Error Response Body:', errorText);
                        throw new Error(`OpenAI API call failed: ${response.statusText}. Details: ${errorText}`);
                    }

                    const responseData = await response.json();
                    // Log the raw API response
                    logToConsole('\n=== Raw OpenAI Structure Analysis Response ===');
                    logToConsole(JSON.stringify(responseData, null, 2));

                    // Parse and log the structure content
                    const parsedStructure = JSON.parse(responseData.choices[0].message.content);
                    logToConsole('\n=== Parsed OpenAI Structure Analysis Response ===');
                    logToConsole('Data Start Row:', parsedStructure.dataStartRow);
                    logToConsole('Column Mappings:', JSON.stringify(parsedStructure.columns, null, 2));
                    logToConsole('Schema Format:', `${parsedStructure.dataStartRow}-${parsedStructure.columns.isin}-${parsedStructure.columns.instrumentName}-${parsedStructure.columns.marketValue}-${parsedStructure.columns.quantity}`);

                    return new Response(JSON.stringify(responseData), {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (error) {
                    logToConsole(`OpenAI Structure API Error: ${error.message}`, true);
                    throw error;
                }
            })(),

            // Gemini API call for structure
            analyzeWithGemini(prompt).catch(error => {
                logToConsole(`Gemini API call failed: ${error.message}`, true);
                logToConsole('Full Gemini error:', error);
                // Update the Gemini schema display with error
                const geminiSchemaDisplay = document.getElementById('geminiSchemaDisplay');
                if (geminiSchemaDisplay) {
                    geminiSchemaDisplay.textContent = 'ERR';
                }
                // Return a placeholder response instead of throwing error
                return JSON.stringify({
                    dataStartRow: 0,
                    columns: {
                        isin: "ERR",
                        instrumentName: "ERR",
                        marketValue: "ERR",
                        quantity: "ERR"
                    }
                });
            }),

            // OpenAI API call for total value
            (async () => {
                const requestBody = {
                    model: CONFIG.OPENAI_MODEL_MARKET_VALUE,
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant that analyzes mutual fund data. You identify total market values and respond only with JSON containing a single number."
                        },
                        {
                            role: "user",
                            content: totalValuePrompt
                        }
                    ],
                    response_format: { "type": "json_object" },
                    temperature: 0
                };
                logToConsole('\n=== OpenAI Total Value Analysis Request ===');
                logToConsole('Request Body:');
                logToConsole(JSON.stringify(requestBody, null, 2));

                try {
                    const response = await fetch(`${CONFIG.RT_ENDPOINT}/open-chat-completion`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    });

                    const responseData = await response.json();
                    // Log the raw API response
                    logToConsole('\n=== Raw OpenAI Total Value Analysis Response ===');
                    logToConsole(JSON.stringify(responseData, null, 2));

                    // Parse and log the total value
                    const parsedValue = JSON.parse(responseData.choices[0].message.content);
                    logToConsole('\n=== Parsed OpenAI Total Value Analysis Response ===');
                    logToConsole('Total Value:', parsedValue.totalValue.toLocaleString('en-IN', {maximumFractionDigits: 2}));
                    logToConsole('Formatted Value:', parsedValue.totalValue.toLocaleString('en-IN', {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2
                    }));

                    return new Response(JSON.stringify(responseData), {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (error) {
                    logToConsole('OpenAI Total Value API Error:', error.message);
                    throw error;
                }
            })(),

            // OpenRouter (Gemini) total value analysis call
            (async () => {
                logToConsole('\n=== OpenRouter Total Value Analysis Request ===');
                try {
                    const response = await fetch(`${CONFIG.RT_ENDPOINT}/open-router-completion`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            model: CONFIG.OPENROUTER_MODEL_MARKET_VALUE,
                            messages: [
                                {
                                    role: "user",
                                    content: totalValuePrompt
                                }
                            ],
                            temperature: 0,
                            response_format: { type: "json_object" }
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`OpenRouter Total Value API call failed: ${response.statusText}`);
                    }

                    const result = await response.json();
                    // Log the raw API response
                    logToConsole('\n=== Raw OpenRouter Total Value Analysis Response ===');
                    logToConsole(JSON.stringify(result, null, 2));

                    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
                        throw new Error('Invalid OpenRouter Total Value API response format');
                    }

                    const geminiTotalValueContent = result.choices[0].message.content;
                    // Parse and log the total value
                    const parsedValue = JSON.parse(geminiTotalValueContent);
                    logToConsole('\n=== Parsed OpenRouter Total Value Analysis Response ===');
                    logToConsole('Total Value:', parsedValue.totalValue.toLocaleString('en-IN', {maximumFractionDigits: 2}));
                    logToConsole('Formatted Value:', parsedValue.totalValue.toLocaleString('en-IN', {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2
                    }));

                    try {
                        const geminiTotalValueJson = JSON.parse(geminiTotalValueContent);
                        const geminiValue = parseFloat(geminiTotalValueJson.totalValue);
                        const formattedGeminiTotal = geminiValue.toLocaleString('en-IN', {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: 2
                        });

                        // Update the Gemini total value in the stats table
                        const statsTable = document.querySelector('.stats-table');
                        if (statsTable) {
                            const geminiTotalValueDisplay = document.getElementById('geminiTotalValueDisplay');
                            if (geminiTotalValueDisplay) {
                                geminiTotalValueDisplay.textContent = formattedGeminiTotal;
                            }
                        }
                    } catch (e) {
                        logToConsole('Error parsing OpenRouter total value JSON:', e.message);
                        // Set placeholder value for display
                        const geminiTotalValueDisplay = document.getElementById('geminiTotalValueDisplay');
                        if (geminiTotalValueDisplay) {
                            geminiTotalValueDisplay.textContent = '0.00';
                        }
                    }

                    return new Response(geminiTotalValueContent, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                } catch (error) {
                    logToConsole(`OpenRouter Total Value API Error: ${error.message}`, true);
                    logToConsole('\n=== OpenRouter Total Value API Error Details ===');
                    logToConsole('Error Type:', error.name);
                    logToConsole('Error Stack:', error.stack);
                    // Set placeholder value for display
                    const geminiTotalValueDisplay = document.getElementById('geminiTotalValueDisplay');
                    if (geminiTotalValueDisplay) {
                        geminiTotalValueDisplay.textContent = '0.00';
                    }
                    // Return a placeholder response instead of throwing
                    return new Response(JSON.stringify({ totalValue: 0 }), {
                        status: 200,
                        statusText: 'OK',
                        headers: new Headers()
                    });
                }
            })()
        ];

        // Execute all API calls
        const [openAIResponse, geminiResponse, totalValueResponse] = await Promise.all(apiCalls);

        // Process responses with detailed logging
        if (!openAIResponse.ok) {
            const errorText = await openAIResponse.text();
            logToConsole(`OpenAI API Error Response: ${errorText}`, true);
            throw new Error(`OpenAI API call failed: ${openAIResponse.statusText}. Details: ${errorText}`);
        }

        const openAIResult = await openAIResponse.json();
        if (!openAIResult.choices || !openAIResult.choices[0] || !openAIResult.choices[0].message) {
            logToConsole(`Invalid OpenAI API Response Structure: ${JSON.stringify(openAIResult)}`, true);
            throw new Error('Invalid OpenAI API response format');
        }

        const openAIContent = openAIResult.choices[0].message.content;

        // Process total value response
        const totalValueResult = await totalValueResponse.json();
        logToConsole('\n=== Total Market Value API Debug ===');
        logToConsole('Response Status:', totalValueResponse.status);
        logToConsole('Response Headers:', JSON.stringify(Object.fromEntries(totalValueResponse.headers.entries())));
        logToConsole('Raw Response:', JSON.stringify(totalValueResult, null, 2));

        if (totalValueResult && totalValueResult.choices && totalValueResult.choices[0] && totalValueResult.choices[0].message) {
            const totalValueContent = totalValueResult.choices[0].message.content;
            try {
                const totalValueJson = JSON.parse(totalValueContent);
                const formattedTotal = totalValueJson.totalValue.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2
                });

                const openAIValueDisplay = document.getElementById('openAITotalValueDisplay');
                if (openAIValueDisplay) {
                    openAIValueDisplay.textContent = formattedTotal;
                    
                    // Compare with Gemini value if available
                    const geminiValueDisplay = document.getElementById('geminiTotalValueDisplay');
                    if (geminiValueDisplay && geminiValueDisplay.textContent !== 'Waiting...') {
                        compareAndHighlightTNAV(formattedTotal, geminiValueDisplay.textContent);
                    }
                }
            } catch (e) {
                logToConsole('Error parsing OpenAI total value JSON:', e.message);
            }
        } else {
            logToConsole('Invalid or unexpected total value response structure');
            logToConsole('Response keys:', Object.keys(totalValueResult || {}));
            if (totalValueResult && totalValueResult.error) {
                logToConsole('Error details:', totalValueResult.error);
            }

            // Update display with error
            const openAIValueDisplay = document.getElementById('openAITotalValueDisplay');
            if (openAIValueDisplay) {
                openAIValueDisplay.textContent = 'Error analyzing';
            }
        }

        // Log all responses for comparison
        logToConsole('=== API Response Comparison ===');
        logToConsole('OpenAI Response:');
        logToConsole(openAIContent);
        logToConsole('\nGemini Response:');
        logToConsole(geminiResponse);
        logToConsole('=== End Comparison ===\n');

        try {
            // Clean up the OpenAI content and return it for processing
            const cleanContent = openAIContent.replace(/```json\n|\n```|```/g, '').trim();
            const parsedContent = JSON.parse(cleanContent);

            // Update the schema analysis display with the structure information
            const schemaDisplay = document.getElementById('schemaAnalysisDisplay');
            if (schemaDisplay) {
                const rowNum = parsedContent.dataStartRow;
                const cols = parsedContent.columns;
                const displayValue = `${rowNum}-${cols.isin}-${cols.instrumentName}-${cols.marketValue}-${cols.quantity}`;
                schemaDisplay.textContent = displayValue;
                
                // Compare schemas after both are populated
                const geminiSchemaDisplay = document.getElementById('geminiSchemaDisplay');
                if (geminiSchemaDisplay && geminiSchemaDisplay.textContent !== 'Waiting...') {
                    compareAndHighlightSchemas(displayValue, geminiSchemaDisplay.textContent);
                }
            }

            return parsedContent;
        } catch (e) {
            logToConsole(`Failed to parse OpenAI content: ${openAIContent}`, true);
            throw new Error('Failed to parse OpenAI response as JSON');
        }
    } catch (error) {
        logToConsole(`API Error: ${error.message}`, true);
        throw error;
    }
}

// Export the function to make it available to other files
window.analyzeWithAI = analyzeWithAI; 