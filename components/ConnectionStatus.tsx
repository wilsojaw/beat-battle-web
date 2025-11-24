'use client';

import { useSocketStore } from '@/store/socketStore';

/**
 * ConnectionStatus - Displays current socket connection state
 *
 * Shows a small indicator in the corner of the screen with connection status:
 * - Connected: Green dot
 * - Reconnecting: Yellow dot with pulse animation
 * - Disconnected/Error: Red dot
 */
export function ConnectionStatus() {
  const { connected, reconnecting, error } = useSocketStore();

  // Don't show anything if connected and no issues
  if (connected && !reconnecting && !error) {
    return null;
  }

  let statusColor = 'bg-red-500';
  let statusText = 'Disconnected';
  let pulseAnimation = '';

  if (reconnecting) {
    statusColor = 'bg-yellow-500';
    statusText = 'Reconnecting...';
    pulseAnimation = 'animate-pulse';
  } else if (error) {
    statusColor = 'bg-red-500';
    statusText = `Error: ${error}`;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
      <div className="bg-white rounded-lg shadow-lg p-3 flex items-center gap-2 border border-gray-200">
        <div className={`w-3 h-3 rounded-full ${statusColor} ${pulseAnimation}`} />
        <span className="text-sm font-medium text-gray-700">{statusText}</span>
      </div>
    </div>
  );
}
