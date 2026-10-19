import React, { useState } from 'react';
import { Agent, AvailabilitySchedule, CustomVoiceConfig, PlatformType } from '../types';
import { apiFetch } from '../lib/api';
import { CustomAgentVoiceSection } from './CustomAgentVoiceSection';
import {
  Bot,
  Sparkles,
  Clock,
  Sliders,
  CheckCircle2,
  Instagram,
  Phone,
  Facebook,
  PhoneCall,
  Save,
  Globe,
  HelpCircle,
} from 'lucide-react';

interface AgentBuilderProps {
  agent: Agent;
  onUpdateAgent: (updated: Agent) => void;
  onRequestManualPause: () => void;
}

export const AgentBuilder: React.FC<AgentBuilderProps> = ({
  agent,
  onUpdateAgent,
  onRequestManualPause,
}) => {
  const [name, setName] = useState(agent.name || '');
  const [description, setDescription] = useState(agent.description || '');
  const [roleAndDuties, setRoleAndDuties] = useState(agent.roleAndDuties || '');
  const [customVoice, setCustomVoice] = useState<CustomVoiceConfig | undefined>(agent.customVoice);
  const [platforms, setPlatforms] = useState<PlatformType[]>(agent.platforms || []);
  const [is24x7, setIs24x7] = useState(agent.availability?.is24x7 ?? true);
  const [timezone, setTimezone] = useState(agent.availability?.timezone || 'America/New_York');
  const [startHour, setStartHour] = useState(agent.availability?.startHour || '08:00');
  const [endHour, setEndHour] = useState(agent.availability?.endHour || '20:00');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const togglePlatform = (p: PlatformType) => {
    const currentPlatforms = platforms || [];
    if (currentPlatforms.includes(p)) {
      setPlatforms(currentPlatforms.filter((item) => item !== p));
    } else {
      setPlatforms([...currentPlatforms, p]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const updated: Agent = {
      ...agent,
      name,
      description,
      roleAndDuties,
      customVoice,
      platforms,
      availability: {
        ...agent.availability,
        is24x7,
        timezone,
        startHour,
        endHour,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await apiFetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.agent) {
        onUpdateAgent(data.agent);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-neutral-800" />
            <h2 className="text-xl font-bold text-neutral-900">Agent Persona & Operating Parameters</h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Configure agent duties, channel bindings, and active operational hours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl flex items-center gap-2 shadow-sm transition-all"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Saved Successfully</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Basic Profile */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Agent Identity
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Agent Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              placeholder="e.g. VIP Concierge Assistant"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Short Description / Title
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-1 focus:ring-neutral-900 focus:outline-none"
              placeholder="e.g. Autonomous customer care across social & calls"
            />
          </div>
        </div>

        {/* Role & Duties Prompt */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-neutral-700">
              Role & Duties Instructions (System Prompt)
            </label>
            <span className="text-[11px] text-neutral-400">Instructs the AI how to behave and represent your business</span>
          </div>
          <textarea
            rows={5}
            value={roleAndDuties}
            onChange={(e) => setRoleAndDuties(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-1 focus:ring-neutral-900 focus:outline-none leading-relaxed font-sans"
            placeholder="You are the friendly, polished luxury concierge for the business. You warmly assist customers with appointments, pricing, location directions, service inquiries, and product questions. Always keep a welcoming, helpful, and concise tone."
          />
          <p className="text-[11px] text-neutral-500 mt-1">
            Tip: Specific instructions on policies, cancellation rules, and pricing will be merged with your RAG Knowledge Base.
          </p>

          {/* Custom Agent Voice Section */}
          <div className="mt-4 pt-3 border-t border-neutral-100">
            <CustomAgentVoiceSection
              value={customVoice}
              onChange={setCustomVoice}
            />
          </div>
        </div>
      </div>

      {/* Active Channels */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-neutral-800" />
          Active Channels
        </h3>
        <p className="text-xs text-neutral-500">
          Select which communication channels this agent is authorized to handle.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'instagram' as PlatformType, name: 'Instagram', icon: Instagram, color: 'text-[#E1306C]' },
            { id: 'whatsapp' as PlatformType, name: 'WhatsApp', icon: Phone, color: 'text-[#25D366]' },
            { id: 'messenger' as PlatformType, name: 'Messenger', icon: Facebook, color: 'text-[#0866FF]' },
            { id: 'call' as PlatformType, name: 'Phone Calls', icon: PhoneCall, color: 'text-amber-500' },
          ].map((item) => {
            const isSelected = (platforms || []).includes(item.id);
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => togglePlatform(item.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center gap-2 ${
                  isSelected
                    ? 'border-neutral-900 bg-neutral-50 shadow-2xs font-bold text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? item.color : 'text-neutral-400'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs">{item.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                  {isSelected ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational Hours & Timezone Schedule */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-800" />
              Availability & Operating Schedule
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Control when the agent autonomously replies vs when inquiries are held. Default is 24/7.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setIs24x7(true)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                is24x7 ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              24/7 Autonomous
            </button>
            <button
              type="button"
              onClick={() => setIs24x7(false)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                !is24x7 ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Custom Schedule
            </button>
          </div>
        </div>

        {!is24x7 && (
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Business Timezone
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white focus:outline-none"
                  >
                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                    <option value="America/Chicago">Central Time (US & Canada)</option>
                    <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                    <option value="Europe/London">London (GMT / BST)</option>
                    <option value="Europe/Paris">Paris, Berlin, Rome (CET)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Asia/Singapore">Singapore (SGT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Active Start Time
                </label>
                <input
                  type="time"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Active End Time
                </label>
                <input
                  type="time"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white focus:outline-none"
                />
              </div>
            </div>

            <p className="text-[11px] text-neutral-500">
              Outside these hours, the agent holds incoming messages and queues a polite greeting stating when the business reopens.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
