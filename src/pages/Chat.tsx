import React from 'react';
import RouteGuard from '@/components/RouteGuard';
import ChatContent from './ChatContent';

const Chat: React.FC = () => {
  return (
    <RouteGuard allowedUserTypes={['patient', 'psychologist']}>
      <ChatContent />
    </RouteGuard>
  );
};

export default Chat;