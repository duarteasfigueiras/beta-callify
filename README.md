# Callify - Intelligent Call Qualification Platform

Callify is a comprehensive call qualification platform that records phone calls, automatically transcribes them, analyzes them using AI with customizable criteria, and generates scores, insights, and actionable next steps. It enables sales teams, customer service representatives, and managers to improve performance based on real data, without manually listening to hours of audio.

## Features

- **Call Recording & Processing**: Automatically receive and process calls via Twilio/Telnyx webhooks
- **AI-Powered Transcription**: Convert audio to text with timestamps using OpenAI Whisper
- **Intelligent Analysis**: GPT-4 powered analysis including summary, key questions, objections, and recommendations
- **Customizable Evaluation Criteria**: Define weighted criteria for call scoring
- **Role-Based Access Control**: Admin/Manager and Agent roles with appropriate permissions
- **Multi-Tenant Architecture**: Complete data isolation between companies
- **Real-Time Alerts**: Notifications for low scores, risk words, long calls, and missing next steps
- **Comprehensive Reports**: Dashboard with metrics, trends, and performance analytics
- **Internationalization**: Full support for Portuguese and English
- **Dark/Light Mode**: Theme customization for user preference

## Technology Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Shadcn/ui components
- React Router for navigation
- React Context + hooks for state management
- React Query for server state
- i18next for internationalization

### Backend
- Node.js with Express
- TypeScript
- SQLite (via better-sqlite3)
- JWT authentication
- OpenAI integration (Whisper + GPT-4)

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- OpenAI API key for transcription and analysis
- Twilio/Telnyx account configured (for production telephony)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd callify
   ```

2. **Run the setup script**
   ```bash
   chmod +x init.sh
   ./init.sh
   ```

3. **Configure environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

4. **Start the development servers**
   ```bash
   ./init.sh --start
   ```

   Or manually:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/api

## Default Test Credentials

After running the seed script:
- **Admin**: username: `admin`, password: `admin123`
- **Agent**: username: `agent`, password: `agent123`

## Project Structure

```
callify/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── db/             # Database setup and migrations
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── index.ts        # Application entry point
│   ├── uploads/            # Uploaded audio files
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom React hooks
│   │   ├── i18n/           # Internationalization files
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client services
│   │   ├── styles/         # Global styles
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json
├── init.sh                 # Setup script
├── features.db             # Feature tracking database
└── README.md
```

## User Roles

### Admin/Manager
- View all calls from all agents
- Listen to all audio recordings
- View all transcriptions and AI analysis
- Add feedback/notes to any call
- View team-wide metrics and reports
- Manage evaluation criteria (create, edit, delete)
- Manage users (invite, remove, change role)
- Configure retention policies
- Delete calls manually

### Agent
- View only their own calls
- Listen to their own audio recordings
- View their own transcriptions and AI analysis
- See performance insights with timestamps
- View feedback from managers (read-only)
- View their own alerts and metrics

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/recover-password` - Request password recovery
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - List company users (Admin)
- `POST /api/users/invite` - Create invitation (Admin)
- `POST /api/users/register` - Register with invitation token
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Remove user (Admin)
- `PUT /api/users/:id/role` - Change role (Admin)

### Calls
- `GET /api/calls` - List calls with filters and pagination
- `GET /api/calls/:id` - Get call detail
- `DELETE /api/calls/:id` - Delete call (Admin)
- `GET /api/calls/:id/audio` - Stream audio file

### Feedback
- `POST /api/calls/:id/feedback` - Add feedback (Admin)
- `GET /api/calls/:id/feedback` - List feedback for call

### Criteria
- `GET /api/criteria` - List company criteria
- `POST /api/criteria` - Create criterion (Admin)
- `PUT /api/criteria/:id` - Update criterion (Admin)
- `DELETE /api/criteria/:id` - Delete criterion (Admin)

### Alerts
- `GET /api/alerts` - List alerts for user
- `PUT /api/alerts/:id/read` - Mark alert as read

### Reports
- `GET /api/reports/overview` - Dashboard summary
- `GET /api/reports/score-by-agent` - Scores by agent
- `GET /api/reports/score-evolution` - Score trends
- `GET /api/reports/calls-by-period` - Call volume
- `GET /api/reports/top-reasons` - Top contact reasons
- `GET /api/reports/top-objections` - Top objections

### Webhooks
- `POST /api/webhooks/twilio` - Receive Twilio call events
- `POST /api/webhooks/telnyx` - Receive Telnyx call events

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Backend server port | 3001 |
| NODE_ENV | Environment mode | development |
| JWT_SECRET | Secret key for JWT | (required) |
| JWT_EXPIRES_IN | Token expiration | 7d |
| DATABASE_PATH | SQLite database path | ./data/callify.db |
| OPENAI_API_KEY | OpenAI API key | (required for AI features) |
| RETENTION_DAYS | Max days to keep recordings | 60 |
| LOW_SCORE_THRESHOLD | Alert threshold for low scores | 5.0 |
| LONG_CALL_THRESHOLD_SECONDS | Alert threshold for long calls | 1800 |

## Development

### Running Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### Building for Production
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

## License

Proprietary - All rights reserved

## Support

For support and questions, please contact the development team.
