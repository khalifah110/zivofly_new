import React from 'react';
import { MessageCircle, Instagram, MessageSquare, PhoneCall } from 'lucide-react';
import { PlatformType } from '../types';
import { TikTokLogo } from './BrandLogos';

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
    case 'tiktok':
      return <TikTokLogo size={size} className={className} />;
    case 'call':
      return <PhoneCall size={size} className={`text-call ${className}`} />;
    case 'messenger':
      return <MessageSquare size={size} className={`text-messenger ${className}`} />;
    default:
      return <MessageCircle size={size} className={className} />;
  }
};
