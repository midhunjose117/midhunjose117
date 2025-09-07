'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { CalendarView } from '@/components/calendar/CalendarView';
import { VoiceInput } from '@/components/voice/VoiceInput';
import { AIChat } from '@/components/ai/AIChat';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { PlusIcon, MicrophoneIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, checkAuth } = useAuthStore();
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <Header />
        
        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            {/* Action Bar */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user.full_name || user.username}!
                </h1>
                <p className="text-gray-600">
                  Manage your schedule with AI assistance
                </p>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowVoiceInput(true)}
                  className="flex items-center space-x-2"
                >
                  <MicrophoneIcon className="h-4 w-4" />
                  <span>Voice Command</span>
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={() => setShowAIChat(true)}
                  className="flex items-center space-x-2"
                >
                  <SparklesIcon className="h-4 w-4" />
                  <span>AI Assistant</span>
                </Button>
                
                <Button
                  onClick={() => router.push('/events/new')}
                  className="flex items-center space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>New Event</span>
                </Button>
              </div>
            </div>
            
            {/* Calendar View */}
            <div className="h-full rounded-lg bg-white shadow">
              <CalendarView />
            </div>
          </div>
        </main>
      </div>
      
      {/* Voice Input Modal */}
      {showVoiceInput && (
        <VoiceInput
          isOpen={showVoiceInput}
          onClose={() => setShowVoiceInput(false)}
        />
      )}
      
      {/* AI Chat Modal */}
      {showAIChat && (
        <AIChat
          isOpen={showAIChat}
          onClose={() => setShowAIChat(false)}
        />
      )}
    </div>
  );
}