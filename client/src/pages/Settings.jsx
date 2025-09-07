import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Bell, Clock, Globe, Shield, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    timezone: user?.timezone || 'UTC'
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [preferencesForm, setPreferencesForm] = useState({
    defaultCalendarView: user?.preferences?.defaultCalendarView || 'month',
    workingHours: {
      start: user?.preferences?.workingHours?.start || '09:00',
      end: user?.preferences?.workingHours?.end || '17:00'
    },
    workingDays: user?.preferences?.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    notifications: {
      email: user?.preferences?.notifications?.email || true,
      push: user?.preferences?.notifications?.push || true,
      sms: user?.preferences?.notifications?.sms || false
    },
    aiSettings: {
      autoReschedule: user?.preferences?.aiSettings?.autoReschedule || true,
      travelTimeBuffer: user?.preferences?.aiSettings?.travelTimeBuffer || 15,
      voiceCommands: user?.preferences?.aiSettings?.voiceCommands || true
    }
  });

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'preferences', name: 'Preferences', icon: Clock },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield }
  ];

  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
    'Australia/Sydney', 'Pacific/Auckland'
  ];

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const result = await updateProfile(profileForm);
    if (result.success) {
      toast.success('Profile updated successfully');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    if (result.success) {
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    const result = await updateProfile({ preferences: preferencesForm });
    if (result.success) {
      toast.success('Preferences updated successfully');
    }
  };

  const handleWorkingDayChange = (day) => {
    const updatedDays = preferencesForm.workingDays.includes(day)
      ? preferencesForm.workingDays.filter(d => d !== day)
      : [...preferencesForm.workingDays, day];
    
    setPreferencesForm({
      ...preferencesForm,
      workingDays: updatedDays
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card">
            <div className="card-content">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h3>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="input w-full"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="input w-full bg-gray-50"
                        placeholder="Email address"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={profileForm.timezone}
                        onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                        className="input w-full"
                      >
                        {timezones.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" className="btn btn-primary">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Calendar Preferences</h3>
                  <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Calendar View
                      </label>
                      <select
                        value={preferencesForm.defaultCalendarView}
                        onChange={(e) => setPreferencesForm({ 
                          ...preferencesForm, 
                          defaultCalendarView: e.target.value 
                        })}
                        className="input w-full"
                      >
                        <option value="month">Month</option>
                        <option value="week">Week</option>
                        <option value="day">Day</option>
                        <option value="agenda">Agenda</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Working Hours
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={preferencesForm.workingHours.start}
                            onChange={(e) => setPreferencesForm({
                              ...preferencesForm,
                              workingHours: {
                                ...preferencesForm.workingHours,
                                start: e.target.value
                              }
                            })}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">End Time</label>
                          <input
                            type="time"
                            value={preferencesForm.workingHours.end}
                            onChange={(e) => setPreferencesForm({
                              ...preferencesForm,
                              workingHours: {
                                ...preferencesForm.workingHours,
                                end: e.target.value
                              }
                            })}
                            className="input w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Working Days
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                          <label key={day} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={preferencesForm.workingDays.includes(day)}
                              onChange={() => handleWorkingDayChange(day)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 capitalize">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Settings
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferencesForm.aiSettings.autoReschedule}
                            onChange={(e) => setPreferencesForm({
                              ...preferencesForm,
                              aiSettings: {
                                ...preferencesForm.aiSettings,
                                autoReschedule: e.target.checked
                              }
                            })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Auto-reschedule conflicts</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferencesForm.aiSettings.voiceCommands}
                            onChange={(e) => setPreferencesForm({
                              ...preferencesForm,
                              aiSettings: {
                                ...preferencesForm.aiSettings,
                                voiceCommands: e.target.checked
                              }
                            })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Enable voice commands</span>
                        </label>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Travel Time Buffer (minutes)</label>
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={preferencesForm.aiSettings.travelTimeBuffer}
                            onChange={(e) => setPreferencesForm({
                              ...preferencesForm,
                              aiSettings: {
                                ...preferencesForm.aiSettings,
                                travelTimeBuffer: parseInt(e.target.value)
                              }
                            })}
                            className="input w-32"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" className="btn btn-primary">
                        <Save className="h-4 w-4 mr-2" />
                        Save Preferences
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
                  <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={preferencesForm.notifications.email}
                          onChange={(e) => setPreferencesForm({
                            ...preferencesForm,
                            notifications: {
                              ...preferencesForm.notifications,
                              email: e.target.checked
                            }
                          })}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Email notifications</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={preferencesForm.notifications.push}
                          onChange={(e) => setPreferencesForm({
                            ...preferencesForm,
                            notifications: {
                              ...preferencesForm.notifications,
                              push: e.target.checked
                            }
                          })}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Push notifications</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={preferencesForm.notifications.sms}
                          onChange={(e) => setPreferencesForm({
                            ...preferencesForm,
                            notifications: {
                              ...preferencesForm.notifications,
                              sms: e.target.checked
                            }
                          })}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">SMS notifications</span>
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" className="btn btn-primary">
                        <Save className="h-4 w-4 mr-2" />
                        Save Notifications
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h3>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        required
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="input w-full"
                        placeholder="Enter current password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="input w-full"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="input w-full"
                        placeholder="Confirm new password"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button type="submit" className="btn btn-primary">
                        <Save className="h-4 w-4 mr-2" />
                        Change Password
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;