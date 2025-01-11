# Usage Guide

## Key Features

🎯 **AI-Powered Processing**: Automated schema detection and data extraction using OpenAI and Google Gemini models

📊 **Validation Diagnostics**: Real-time validation checks with visual indicators for data integrity

🔄 **Manual Override**: Flexible schema configuration for cases where AI detection needs adjustment

📝 **File Appender**: Utility to combine multiple text files while maintaining data structure

📋 **Data Preview**: Interactive table view with sorting and filtering capabilities

🔍 **Detailed Logging**: Comprehensive processing logs for transparency and debugging

## Basic Usage

1. **File Upload and Configuration**
   - Click the Upload button to select your Excel file
   - Enter the sheet name containing the portfolio data
   - Provide a descriptive scheme name
   - Select the month-end date
   - Click "Process - AI" to start automated processing

2. **Manual Override (If Needed)**
   - If AI schema detection isn't accurate, click "Manual Override"
   - Enter the data start row number
   - Specify column letters for:
     - ISIN
     - Instrument Name
     - Market Value
     - Quantity
   - Click Submit to process with manual schema

3. **File Appender**
   - Click "Append" to combine multiple text files
   - Select files in desired order
   - First file's header is retained
   - Subsequent files' headers are automatically skipped
   - Click "Append Files" to create consolidated file

4. **Validation Diagnostics**
   - Monitor the validation table for key metrics:
     - T-NAV comparisons
     - Record counts
     - Schema validations
     - Cash/Derivatives calculations
   - Orange highlights indicate validation issues
   - Click "Legend" for detailed explanation of metrics

5. **Processing Logs**
   - View detailed processing steps
   - Track API calls and responses
   - Monitor data extraction progress
   - Click expand icon for full-screen view
   - Useful for troubleshooting issues

6. **Data Table**
   - Automatically populated after processing
   - Quick preview of extracted data
   - Sort columns by clicking headers
   - Filter data using search box
   - Expand view for detailed analysis

7. **Download**
   - Click "Download" for processed file
   - File includes all extracted data
   - Additional balancing row (ISIN: IN9999999999) for cash/derivatives
   - File format: pipe-delimited text file

## Tips
- Always verify schema detection in validation table
- Use manual override if AI schema detection is incorrect
- Monitor orange warning indicators for potential issues
- Check processing logs for detailed operation flow
- Use legend button to understand validation metrics 