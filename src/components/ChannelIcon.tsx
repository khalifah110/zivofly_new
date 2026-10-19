import React from 'react';
import { MessageCircle, Instagram, MessageSquare, PhoneCall } from 'lucide-react';
import { PlatformType } from '../types';

interface ChannelIconProps {
  channel: PlatformType | string;
  className?: string;
  size?: number;
}

export const ChannelIcon: React.FC<ChannelIconProps> = ({ channel, className = '', size = 20 }) => {
  switch (channel) {
    case 'whatsapp':
      return <MessageCircle size={size} className={`text-whatsapp ${className}`} />;
    case 'instagram':
      return <Instagram size={size} className={`text-instagram ${className}`} />;
    case 'messenger':
      return <MessageSquare size={size} className={`text-messenger ${className}`} />;
    case 'call':
      return <PhoneCall size={size} className={`text-call ${className}`} />;
    default:
      return <MessageCircle size={size} className={className} />;
  }
};
