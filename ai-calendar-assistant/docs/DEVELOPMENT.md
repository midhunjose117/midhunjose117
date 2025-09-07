# AI Calendar Assistant - Development Guide

## Architecture Overview

The AI Calendar Assistant follows a microservices architecture with the following components:

### Backend (FastAPI)
- **API Layer**: RESTful endpoints for calendar operations
- **Services Layer**: Business logic for NLP, scheduling, sync
- **Data Layer**: SQLAlchemy models and database operations
- **Integration Layer**: External API integrations (OpenAI, Google Maps, CalDAV)

### Frontend (React)
- **Components**: Reusable UI components
- **Pages**: Main application views
- **State Management**: Context API for global state
- **API Client**: Axios-based API communication

### Infrastructure
- **Database**: PostgreSQL for persistent storage
- **Cache**: Redis for session management and caching
- **Queue**: Celery for background tasks
- **Reverse Proxy**: Nginx for routing and SSL

## Development Workflow

### 1. Setting Up Development Environment

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Dev dependencies

# Frontend
cd ../frontend
npm install
```

### 2. Code Style & Linting

#### Backend (Python)
```bash
# Format code
black .

# Lint code
flake8 .

# Type checking
mypy .

# Run all checks
make lint
```

#### Frontend (JavaScript/TypeScript)
```bash
# Format code
npm run format

# Lint code
npm run lint

# Type checking
npm run type-check
```

### 3. API Development

#### Adding a New Endpoint

1. Create schema in `schemas/`
```python
# schemas/reminder.py
from pydantic import BaseModel
from datetime import datetime

class ReminderCreate(BaseModel):
    event_id: int
    reminder_time: datetime
    method: str  # email, push, sms
```

2. Add model if needed in `models/`
```python
# models/reminder.py
from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from core.database import Base

class Reminder(Base):
    __tablename__ = "reminders"
    
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    reminder_time = Column(DateTime)
    method = Column(String)
```

3. Create API endpoint in `api/`
```python
# api/reminders.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter()

@router.post("/reminders")
async def create_reminder(
    reminder: ReminderCreate,
    db: Session = Depends(get_db)
):
    # Implementation
    pass
```

4. Register router in `main.py`
```python
from api import reminders

app.include_router(
    reminders.router, 
    prefix=f"{settings.API_PREFIX}/reminders", 
    tags=["reminders"]
)
```

### 4. Service Development

#### Creating a New Service

```python
# services/notification_service.py
from typing import List
from models import User, Event, Reminder

class NotificationService:
    def __init__(self, db):
        self.db = db
    
    async def send_reminder(self, reminder: Reminder):
        """Send reminder notification"""
        event = reminder.event
        user = event.user
        
        if reminder.method == "email":
            await self._send_email_reminder(user, event)
        elif reminder.method == "push":
            await self._send_push_notification(user, event)
    
    async def _send_email_reminder(self, user: User, event: Event):
        # Email implementation
        pass
```

### 5. Frontend Development

#### Creating a New Component

```typescript
// components/EventCard.tsx
import React from 'react';
import { Event } from '../types';

interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (eventId: number) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  onEdit, 
  onDelete 
}) => {
  return (
    <div className="event-card">
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <div className="event-actions">
        <button onClick={() => onEdit(event)}>Edit</button>
        <button onClick={() => onDelete(event.id)}>Delete</button>
      </div>
    </div>
  );
};
```

#### Adding a New Page

```typescript
// pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(null);
  
  useEffect(() => {
    loadPreferences();
  }, []);
  
  const loadPreferences = async () => {
    const response = await api.get('/preferences');
    setPreferences(response.data);
  };
  
  return (
    <div className="settings-page">
      <h1>Settings</h1>
      {/* Settings form */}
    </div>
  );
};
```

### 6. Testing

#### Backend Testing

```python
# tests/test_calendar_api.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_event():
    response = client.post(
        "/api/v1/events",
        json={
            "title": "Test Meeting",
            "start_time": "2024-01-15T10:00:00",
            "end_time": "2024-01-15T11:00:00",
            "calendar_id": 1
        },
        headers={"Authorization": "Bearer test-token"}
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Test Meeting"
```

#### Frontend Testing

```typescript
// components/__tests__/EventCard.test.tsx
import { render, fireEvent } from '@testing-library/react';
import { EventCard } from '../EventCard';

describe('EventCard', () => {
  const mockEvent = {
    id: 1,
    title: 'Test Event',
    description: 'Test Description',
    startTime: new Date(),
    endTime: new Date()
  };
  
  it('renders event details', () => {
    const { getByText } = render(
      <EventCard 
        event={mockEvent} 
        onEdit={jest.fn()} 
        onDelete={jest.fn()} 
      />
    );
    
    expect(getByText('Test Event')).toBeInTheDocument();
    expect(getByText('Test Description')).toBeInTheDocument();
  });
  
  it('calls onEdit when edit button clicked', () => {
    const onEdit = jest.fn();
    const { getByText } = render(
      <EventCard 
        event={mockEvent} 
        onEdit={onEdit} 
        onDelete={jest.fn()} 
      />
    );
    
    fireEvent.click(getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(mockEvent);
  });
});
```

### 7. Database Migrations

```bash
# Create a new migration
alembic revision -m "add_reminders_table"

# Edit the generated file in alembic/versions/
# Add upgrade and downgrade functions

# Apply migration
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### 8. Background Tasks

```python
# services/tasks.py
from celery import Celery
from datetime import datetime, timedelta

celery = Celery('tasks', broker='redis://localhost:6379')

@celery.task
def check_upcoming_reminders():
    """Check for reminders that need to be sent"""
    upcoming = datetime.utcnow() + timedelta(minutes=15)
    
    reminders = db.query(Reminder).filter(
        Reminder.reminder_time <= upcoming,
        Reminder.sent == False
    ).all()
    
    for reminder in reminders:
        send_reminder.delay(reminder.id)

@celery.task
def send_reminder(reminder_id: int):
    """Send a specific reminder"""
    reminder = db.query(Reminder).get(reminder_id)
    notification_service = NotificationService(db)
    await notification_service.send_reminder(reminder)
```

### 9. API Documentation

FastAPI automatically generates documentation:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

Add detailed descriptions:

```python
@router.post(
    "/events",
    response_model=EventResponse,
    summary="Create a new calendar event",
    description="""
    Create a new calendar event with the following features:
    - Natural language parsing support
    - Automatic travel time calculation
    - Conflict detection
    - Smart scheduling suggestions
    """
)
async def create_event(event: EventCreate):
    pass
```

### 10. Performance Optimization

#### Backend
- Use database indexes for frequently queried fields
- Implement caching with Redis
- Use async/await for I/O operations
- Batch database operations when possible

#### Frontend
- Implement lazy loading for components
- Use React.memo for expensive components
- Optimize bundle size with code splitting
- Implement virtual scrolling for long lists

### 11. Security Best Practices

- Always validate input data with Pydantic
- Use parameterized queries (SQLAlchemy handles this)
- Implement rate limiting on API endpoints
- Store sensitive data in environment variables
- Use HTTPS in production
- Implement CORS properly
- Regular dependency updates

### 12. Debugging

#### Backend Debugging
```python
# Add debug logging
import logging
logger = logging.getLogger(__name__)

@router.post("/events")
async def create_event(event: EventCreate):
    logger.debug(f"Creating event: {event.dict()}")
    # Implementation
```

#### Frontend Debugging
```typescript
// Use React Developer Tools
// Add console logs strategically
console.log('Event data:', event);

// Use debugger statement
debugger;

// Network tab for API calls
```

### 13. Git Workflow

```bash
# Create feature branch
git checkout -b feature/add-reminders

# Make changes and commit
git add .
git commit -m "feat: add reminder functionality"

# Push to remote
git push origin feature/add-reminders

# Create pull request for review
```

### 14. Continuous Integration

GitHub Actions workflow example:
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.11
    
    - name: Install dependencies
      run: |
        pip install -r backend/requirements.txt
        pip install -r backend/requirements-dev.txt
    
    - name: Run tests
      run: |
        cd backend
        pytest
    
    - name: Run linting
      run: |
        cd backend
        flake8 .
        mypy .
```

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [SQLAlchemy Documentation](https://www.sqlalchemy.org/)
- [OpenAI API Reference](https://platform.openai.com/docs/)