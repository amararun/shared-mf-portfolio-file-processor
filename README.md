# MF Portfolio Files Processor - AI Enabled

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" height="25">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" height="25">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" height="25">
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" height="25">
  <img src="https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" height="25">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" height="25">
</p>

A modern web application for processing mutual fund portfolio files using AI capabilities from OpenAI and Google Gemini. The application automatically identifies file structure and extracts key data points while providing manual override options.

## Key Features

🤖 **Dual AI Processing**: Leverages both OpenAI and Google Gemini for enhanced accuracy  
📊 **Automated Schema Detection**: AI-powered identification of data structure  
💰 **T-NAV Calculation**: Automatic total NAV computation with cross-validation  
🔄 **Manual Override**: Built-in options for manual schema specification  
📱 **Responsive Design**: Mobile-friendly interface with intuitive controls  
📋 **Data Validation**: Cross-verification between AI models with visual indicators  

## Deployment Guide

### 1. Clone the Repository

```bash
git clone https://github.com/[your-username]/mf-portfolio-processor .
```

### 2. Configure API Settings

Update `config.js` with your model preferences and API endpoint:

```javascript
const CONFIG = {
    // OpenAI Models (currently used in the app)
    OPENAI_MODEL_STRUCTURE: "gpt-4o",  // For schema detection
    OPENAI_MODEL_MARKET_VALUE: "gpt-4o-mini",  // For T-NAV calculation
    
    // Google Gemini Models (currently used in the app)
    GEMINI_MODEL_STRUCTURE: "gemini-2.0-flash-exp",  // For schema validation
    GEMINI_MODEL_MARKET_VALUE: "gemini-2.0-flash-exp",  // For T-NAV validation
    
    // API Endpoint
    RT_ENDPOINT: "https://your-fastapi-server.com"  // Replace with your server URL
}
```

These are the models currently used in the application. You can modify them based on your requirements and model availability.

### 3. Setup FastAPI Server

The application requires a FastAPI server for handling AI API calls:
- Deploy the server from: [https://github.com/amararun/shared-openai-realtime-fastapi-ephemeral](https://github.com/amararun/shared-openai-realtime-fastapi-ephemeral)  

- Update `RT_ENDPOINT` in config.js with your server URL
- Configure domain whitelisting in the FastAPI server for security:
  - The server includes IP/domain whitelisting functionality
  - Follow the detailed instructions in the FastAPI server repository to add your domain to the whitelist
  - This is a critical security feature to prevent unauthorized access to your API endpoints
  - Example: If deploying on "example.com", you'll need to whitelist that domain in the server configuration


### 4. Deploy the Application

Deploy on your preferred hosting platform:
- Vercel
- Netlify
- GitHub Pages
- Any static web host

## Usage Notes

- Upload Excel files containing mutual fund portfolio data
- Provide sheet name, scheme name, and month-end date
- Choose between AI processing or manual override
- Review validation indicators (orange highlights indicate discrepancies)
- Download processed text file with proper formatting

## License

MIT License - See LICENSE file for details

---

<p align="center">
Made with ❤️ by <a href="https://www.linkedin.com/in/amarharolikar">Amar Harolikar</a>
</p> 