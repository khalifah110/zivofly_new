export interface ChannelMeta {
  key: 'whatsapp' | 'instagram' | 'messenger' | 'call';
  name: string;
  tagline: string;
  colorClass: string;
  bgLightClass: string;
  borderColorClass: string;
  steps: string[];
  supportsComments: boolean;
}

export const CHANNELS: Record<string, ChannelMeta> = {
  whatsapp: {
    key: 'whatsapp',
    name: 'WhatsApp',
    tagline: 'Reply to customer chats on your business number, day and night.',
    colorClass: 'text-whatsapp',
    bgLightClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    borderColorClass: 'border-emerald-500/30',
    steps: [
      'Choose your business number',
      'Confirm it in the secure Meta window',
      'Pick or create your agent',
      'Go live'
    ],
    supportsComments: false
  },
  instagram: {
    key: 'instagram',
    name: 'Instagram',
    tagline: 'Answer DMs, comments and tags in your own Tone',
    colorClass: 'text-instagram',
    bgLightClass: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    borderColorClass: 'border-rose-500/30',
    steps: [
      'Sign in with Instagram',
      'Allow training on your profile',
      'Pick or create your agent',
      'Go live'
    ],
    supportsComments: true
  },
  messenger: {
    key: 'messenger',
    name: 'Messenger',
    tagline: 'Handle Facebook Page messages and comments automatically.',
    colorClass: 'text-messenger',
    bgLightClass: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    borderColorClass: 'border-blue-500/30',
    steps: [
      'Sign in with Facebook',
      'Allow training on your Page',
      'Pick or create your agent',
      'Go live'
    ],
    supportsComments: true
  },
  call: {
    key: 'call',
    name: 'Calls',
    tagline: 'A voice agent that picks up your business line.',
    colorClass: 'text-call',
    bgLightClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    borderColorClass: 'border-amber-500/30',
    steps: [
      'Add your business number',
      'Verify it',
      'Pick or create your agent',
      'Go live'
    ],
    supportsComments: false
  }
};
