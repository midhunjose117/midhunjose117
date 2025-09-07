import React, { useState, useEffect } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { 
  Cloud, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download, 
  Upload,
  Settings,
  Calendar as CalendarIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

const Sync = () => {
  const { syncStatus, connectNextcloud, syncFromNextcloud, syncToNextcloud } = useCalendar();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [connectForm, setConnectForm] = useState({
    url: '',
    username: '',
    password: ''
  });
  const [syncForm, setSyncForm] = useState({
    calendarId: 'personal',
    startDate: '',
    endDate: ''
  });
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Set default date range for sync
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    setSyncForm({
      ...syncForm,
      startDate: today.toISOString().split('T')[0],
      endDate: nextWeek.toISOString().split('T')[0]
    });
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    
    try {
      const result = await connectNextcloud(
        connectForm.url,
        connectForm.username,
        connectForm.password
      );
      
      if (result.success) {
        setShowConnectModal(false);
        setConnectForm({ url: '', username: '', password: '' });
        await loadCalendars();
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const loadCalendars = async () => {
    try {
      const response = await fetch('/api/sync/nextcloud-calendars');
      const data = await response.json();
      if (data.success) {
        setAvailableCalendars(data.calendars);
      }
    } catch (error) {
      console.error('Failed to load calendars:', error);
    }
  };

  const handleSyncFromNextcloud = async () => {
    setSyncing(true);
    try {
      const result = await syncFromNextcloud(
        syncForm.calendarId,
        new Date(syncForm.startDate),
        new Date(syncForm.endDate)
      );
      
      if (result.success) {
        setShowSyncModal(false);
        toast.success(`Synced ${result.data.syncResult.syncedEvents.length} events from Nextcloud`);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncToNextcloud = async () => {
    setSyncing(true);
    try {
      const result = await syncToNextcloud(syncForm.calendarId);
      
      if (result.success) {
        toast.success(`Synced ${result.data.syncResults.filter(r => r.success).length} events to Nextcloud`);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sync & Import</h1>
        <p className="text-gray-600">Connect external calendars and sync your data</p>
      </div>

      {/* Connection Status */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Connection Status</h3>
        </div>
        <div className="card-content">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full mr-3 ${
                syncStatus.nextcloudConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div>
                <p className="font-medium text-gray-900">Nextcloud</p>
                <p className="text-sm text-gray-600">
                  {syncStatus.nextcloudConnected ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConnectModal(true)}
              className="btn btn-outline btn-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              {syncStatus.nextcloudConnected ? 'Reconnect' : 'Connect'}
            </button>
          </div>
        </div>
      </div>

      {/* Sync Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{syncStatus.totalEvents}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Cloud className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Synced Events</p>
                <p className="text-2xl font-bold text-gray-900">{syncStatus.syncedEvents}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Last Sync</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatDate(syncStatus.lastSync)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Actions */}
      {syncStatus.nextcloudConnected && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Sync Actions</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setShowSyncModal(true)}
                className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Download className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Sync from Nextcloud</p>
                  <p className="text-sm text-gray-600">Import events from your Nextcloud calendar</p>
                </div>
              </button>

              <button
                onClick={handleSyncToNextcloud}
                disabled={syncing}
                className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <Upload className="h-6 w-6 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Sync to Nextcloud</p>
                  <p className="text-sm text-gray-600">Export your events to Nextcloud</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Connect to Nextcloud</h3>
              
              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nextcloud URL
                  </label>
                  <input
                    type="url"
                    required
                    value={connectForm.url}
                    onChange={(e) => setConnectForm({ ...connectForm, url: e.target.value })}
                    className="input w-full"
                    placeholder="https://your-nextcloud-instance.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={connectForm.username}
                    onChange={(e) => setConnectForm({ ...connectForm, username: e.target.value })}
                    className="input w-full"
                    placeholder="Your Nextcloud username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={connectForm.password}
                    onChange={(e) => setConnectForm({ ...connectForm, password: e.target.value })}
                    className="input w-full"
                    placeholder="Your Nextcloud password"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Connect
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sync from Nextcloud</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calendar
                  </label>
                  <select
                    value={syncForm.calendarId}
                    onChange={(e) => setSyncForm({ ...syncForm, calendarId: e.target.value })}
                    className="input w-full"
                  >
                    {availableCalendars.map((calendar) => (
                      <option key={calendar.id} value={calendar.id}>
                        {calendar.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={syncForm.startDate}
                      onChange={(e) => setSyncForm({ ...syncForm, startDate: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={syncForm.endDate}
                      onChange={(e) => setSyncForm({ ...syncForm, endDate: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSyncModal(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSyncFromNextcloud}
                    disabled={syncing}
                    className="btn btn-primary"
                  >
                    {syncing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : null}
                    Sync
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sync;