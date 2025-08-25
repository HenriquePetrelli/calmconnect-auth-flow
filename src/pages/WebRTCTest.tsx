import React from 'react';
import { WebRTCTestComponent } from '@/components/WebRTCTestComponent';

const WebRTCTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <WebRTCTestComponent />
      </div>
    </div>
  );
};

export default WebRTCTest;