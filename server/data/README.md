# Server Data Directory

This directory contains runtime data for the API server, including:

## Credentials
Credentials are stored in an encrypted format in `credentials.json`. This file is automatically created when the server starts up and is not included in the Git repository.

To set up your credentials:
1. Start the server once to generate the encryption key and empty credentials file
2. Use the API endpoints to set your credentials (see API documentation)
3. Or manually copy and edit the `credentials.json.example` file to `credentials.json`

## Security
- Both the encryption key (`.key`) and the credentials file are excluded from Git
- Credentials are encrypted at rest using AES-256-GCM
- The encryption key is stored in `.key` and should be kept secure