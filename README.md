# AI Calendar Assistant

A comprehensive, AI-powered calendar assistant that syncs across devices with natural language processing, voice commands, and intelligent scheduling capabilities.

## 🌟 Features

### Core Functionality
- **Natural Language Processing**: Create and manage events using natural language
- **Voice Commands**: Hands-free calendar management with speech recognition
- **AI-Powered Scheduling**: Intelligent conflict resolution and optimal time suggestions
- **Cross-Device Sync**: Seamless synchronization across phone, laptop, smartwatch, and tablet
- **Travel Time Estimation**: Automatic travel time calculation and buffer management
- **Auto-Rescheduling**: Smart conflict resolution with minimal user intervention

### Advanced Features
- **Nextcloud Integration**: Sync with existing Nextcloud calendars
- **Smart Reminders**: Context-aware notifications based on location, traffic, and preferences
- **Pattern Analysis**: Learn from your scheduling patterns for better suggestions
- **Multi-Device Support**: Register and sync across multiple devices
- **Privacy-Focused**: All data stays private with optional cloud sync

## 🏗️ Architecture

### Backend (Node.js/Express)
- **RESTful API**: Comprehensive calendar management endpoints
- **AI Integration**: OpenAI GPT-4 for natural language processing
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis for session management and performance
- **Authentication**: JWT-based authentication with device management
- **Real-time**: WebSocket support for live updates

### Frontend (React)
- **Modern UI**: Clean, responsive interface built with React 18
- **Calendar Views**: Month, week, day, and agenda views
- **Voice Interface**: Speech-to-text integration with visual feedback
- **Real-time Updates**: Live synchronization across devices
- **Progressive Web App**: Installable on mobile devices

### AI Services
- **Natural Language Processing**: Parse voice and text input into structured events
- **Conflict Resolution**: Intelligent rescheduling suggestions
- **Travel Optimization**: Route planning and time estimation
- **Smart Reminders**: Context-aware notification system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB 7.0+
- Redis 7.0+
- OpenAI API key
- Google Maps API key (optional)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-calendar-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

3. **Set up environment variables**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your configuration
   ```

4. **Start the development servers**
   ```bash
   # From the root directory
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Application: http://localhost
   - API: http://localhost/api

## 🔧 Configuration

### Environment Variables

#### Server Configuration
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb://localhost:27017/ai-calendar
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key

# AI Services
OPENAI_API_KEY=your-openai-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Nextcloud Integration
NEXTCLOUD_URL=https://your-nextcloud-instance.com
NEXTCLOUD_USERNAME=your-username
NEXTCLOUD_PASSWORD=your-password
```

### API Keys Setup

1. **OpenAI API Key**
   - Sign up at https://platform.openai.com/
   - Create an API key
   - Add to environment variables

2. **Google Maps API Key** (Optional)
   - Enable Google Maps API at https://console.cloud.google.com/
   - Create API key with Maps and Distance Matrix APIs
   - Add to environment variables

## 🌐 AWS Deployment

### Prerequisites
- AWS CLI configured
- Docker installed
- Domain name and SSL certificate

### Deploy to AWS

1. **Set environment variables**
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   export GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
   ```

2. **Run deployment script**
   ```bash
   ./aws/deploy.sh
   ```

### Infrastructure Components
- **ECS Fargate**: Containerized application hosting
- **Application Load Balancer**: Traffic distribution and SSL termination
- **DocumentDB**: Managed MongoDB-compatible database
- **ElastiCache Redis**: Managed Redis cache
- **CloudWatch**: Logging and monitoring
- **Route 53**: DNS management
- **ACM**: SSL certificate management

## 📱 Mobile Support

### Progressive Web App
- Installable on mobile devices
- Offline functionality
- Push notifications
- Native app-like experience

### Cross-Device Sync
- Real-time synchronization
- Device registration and management
- Conflict resolution
- Offline support with sync on reconnect

## 🎤 Voice Commands

### Supported Commands
- **Create Events**: "Schedule a meeting with John tomorrow at 2 PM"
- **Modify Events**: "Move my 3 PM meeting to 4 PM"
- **Query Events**: "What do I have tomorrow?"
- **Reschedule**: "Reschedule all my meetings for tomorrow"

### Voice Features
- Speech-to-text conversion
- Natural language processing
- Visual feedback during recording
- Command validation and suggestions

## 🔄 Synchronization

### Nextcloud Integration
- Connect to existing Nextcloud instances
- Bidirectional calendar sync
- Conflict resolution
- Multiple calendar support

### Sync Features
- Real-time updates
- Offline support
- Conflict detection
- Automatic resolution

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test

# All tests
npm test
```

### Test Coverage
- Unit tests for all services
- Integration tests for API endpoints
- Component tests for React components
- End-to-end tests for critical workflows

## 📊 Monitoring

### Health Checks
- Application health endpoint
- Database connectivity
- External service status
- Performance metrics

### Logging
- Structured logging with Winston
- Request/response logging
- Error tracking
- Performance monitoring

## 🔒 Security

### Authentication
- JWT-based authentication
- Secure password hashing
- Session management
- Device registration

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

### Privacy
- Local data storage option
- Encrypted data transmission
- GDPR compliance
- Data retention policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Development Guidelines
- Follow ESLint configuration
- Write comprehensive tests
- Document new features
- Follow semantic versioning

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Documentation
- API documentation: `/api/docs`
- User guide: Available in the application
- Troubleshooting guide: See ISSUES.md

### Getting Help
- Create an issue for bugs or feature requests
- Check existing issues for solutions
- Join our community discussions

## 🗺️ Roadmap

### Upcoming Features
- [ ] Mobile app (React Native)
- [ ] Smartwatch integration
- [ ] Advanced AI scheduling
- [ ] Team collaboration features
- [ ] Integration with more calendar providers
- [ ] Advanced analytics and insights

### Version History
- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Voice commands and AI integration
- **v1.2.0**: Nextcloud sync and mobile support
- **v2.0.0**: AWS deployment and advanced features

---

Built with ❤️ using modern web technologies and AI capabilities.