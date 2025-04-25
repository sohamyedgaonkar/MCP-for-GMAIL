# MCP for GMAIL

Mail Control Program (MCP) for Gmail - A powerful tool to automate and enhance your Gmail experience.

## Features

- **Email Filtering**: Advanced filtering beyond Gmail's native capabilities
- **Auto-Responses**: Intelligent auto-responses based on email content
- **Email Scheduling**: Schedule emails to be sent at specific times
- **Email Analytics**: Track email patterns and response rates
- **Bulk Actions**: Perform actions on multiple emails at once
- **Email Templates**: Create and manage templates for quick responses
- **Smart Labels**: Automatically categorize emails based on content analysis

## Setup

### Prerequisites

- Node.js (v16 or higher)
- Google account with Gmail
- Google Cloud Platform project with Gmail API enabled

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/sohamyedgaonkar/MCP-for-GMAIL.git
   cd MCP-for-GMAIL
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your credentials:
   - Go to the Google Cloud Console and create a new project
   - Enable the Gmail API
   - Create OAuth credentials and download the JSON file
   - Rename the file to `credentials.json` and place it in the project root

4. Configure the application:
   ```
   npm run setup
   ```

5. Run the application:
   ```
   npm start
   ```

## Usage

Once authenticated, the application will provide a web interface accessible at `http://localhost:3000`.

From there, you can:
- Configure email filters
- Set up auto-responses
- Create email templates
- Schedule emails
- View email analytics

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.