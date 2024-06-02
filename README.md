# Browser Scanner Service

## Overview

The Browser Scanner Service is a web application built using the NestJS framework. It provides an API to scan web pages, extract and normalize their content, and process it using a language model service. The service leverages Puppeteer for browser automation and OpenAI for text processing.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Web Page Scanning**: Automates the process of opening a web page, extracting its HTML content, and normalizing it.
- **Content Normalization**: Parses HTML content, extracts relevant information, and processes it using a language model.
- **Browser Automation**: Uses Puppeteer with various plugins for stealth, ad-blocking, and user-agent anonymization.
- **Language Model Integration**: Integrates with OpenAI's GPT-4 for advanced text processing.

## Architecture

The project is structured as follows:

- **Controllers**: Handle incoming HTTP requests and route them to the appropriate services.
- **Services**: Contain the business logic for scanning and processing web pages.
- **DTOs (Data Transfer Objects)**: Define the shape of data being transferred between layers.
- **Common**: Contains shared utilities and helper functions.

## Installation

1. **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/browser-scanner-service.git
    cd browser-scanner-service
    ```
2. **Install dependencies**:
    ```bash
    npm install
    ```
3. **Set up environment variables**: Create a `.env` file in the root directory and add the following variables:
    - `OPENAI_API_KEY`: Your OpenAI API key.
    - `LOG_COLOR`: Enables colored console logs. Set to `true` or `false`.

4. **Start the application**:
    ```bash
    npm run start
    ```
   
## Usage
To use the Browser Scanner Service, send a POST request to the /api/v1/browser/scan endpoint with a JSON body containing the URL and optional authentication details.

Example request:
```bash
curl --location --request POST 'http://localhost:3000/api/v1/browser/scan' \
--header 'Content-Type: application/json' \
--data-raw '{
    "url": "https://example.com",    
    "username": "user",
    "password": "pass",
    "proxy": "http://proxy.com"
}'
```

## API Endpoints

### POST /api/v1/browser/scan
Description: Scans a web page, extracts its content, and processes it using a language model.

#### Request Body
- `url` (string): The URL of the web page to scan.
- `username` (string): The username for basic authentication (optional).
- `password` (string): The password for basic authentication (optional).
- `proxy` (string): The proxy server URL (optional).

#### Response
- `status` (string): The status of the request (success or error).
- `message` (string): A message describing the result of the request.

## Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key.
- `LOG_COLOR`: Enables colored console logs. Set to `true` or `false`.

## Contributing

1. Fork the repository.
2. Create a new branch (git checkout -b feature/your-feature-name).
3. Make your changes.
4. Commit your changes (git commit -m 'Add some feature').
5. Push to the branch (git push origin feature/your-feature-name).
6. Create a new Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

