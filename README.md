# AIMentor - AI-Powered Mentoring Platform

An AI-powered mentoring platform featuring personas of successful entrepreneurs who provide guidance, answer questions, and evaluate business pitches.

## Features

- Chat with AI personas modeled after successful entrepreneurs
- Get expert feedback on your business ideas and pitch decks
- Track conversation history and revisit previous mentoring sessions
- Subscription-based model with tiered access

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL via Supabase
- **AI Integration**: OpenAI API
- **Authentication**: Supabase Auth
- **Payment Processing**: Paystack

## Setup Instructions

1. Clone this repository
2. Set up a virtual environment (instructions below)
3. Install dependencies
4. Configure environment variables
5. Run the application

## Development Environment Setup

### Python Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate
```

### Install Dependencies
```bash
pip install -r requirements.txt
```

## Project Structure
```
aimentor/
├── README.md
├── requirements.txt
├── .gitignore
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models/
│   ├── services/
│   └── utils/
└── tests/
    └── __init__.py
```

## License
[Specify your license]
