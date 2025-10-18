import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ToothData, MeasurementType } from '../types.ts';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  toothData: ToothData;
}

const SYSTEM_PROMPT = `You are a dental AI focused on periodontics. Answer concisely and clinically.
Use the provided tooth context. If data is missing, say so and ask for specifics.
Prefer structured bullets for findings and recommendations.`;

function formatSurfaceTriplet(
  obj: Record<string, number | boolean | undefined>,
  surface: 'buccal' | 'lingual'
): string {
  const d = obj[`disto_${surface}`];
  const m = obj[`mid_${surface}`];
  const me = obj[`mesio_${surface}`];
  const fmt = (v: any) => (v === true ? 'Y' : v === false ? 'N' : v ?? 'NA');
  return `Distal=${fmt(d)}, Mid=${fmt(m)}, Mesial=${fmt(me)}`;
}

function buildToothContext(tooth: ToothData): string {
  const pd = tooth.measurements[MeasurementType.POCKET_DEPTH] || {};
  const rec = tooth.measurements[MeasurementType.RECESSION] || {};
  const bop = tooth.measurements[MeasurementType.BLEEDING] || {};
  const plaque = tooth.measurements[MeasurementType.PLAQUE] || {};
  const buccalCal = [pd[`disto_buccal`], pd[`mid_buccal`], pd[`mesio_buccal`]]
    .map((v, i) => (typeof v === 'number' && typeof (rec as any)[['disto_buccal', 'mid_buccal', 'mesio_buccal'][i]] === 'number'
      ? (v as number) + ((rec as any)[['disto_buccal', 'mid_buccal', 'mesio_buccal'][i]] as number)
      : undefined));
  const lingualCal = [pd[`disto_lingual`], pd[`mid_lingual`], pd[`mesio_lingual`]]
    .map((v, i) => (typeof v === 'number' && typeof (rec as any)[['disto_lingual', 'mid_lingual', 'mesio_lingual'][i]] === 'number'
      ? (v as number) + ((rec as any)[['disto_lingual', 'mid_lingual', 'mesio_lingual'][i]] as number)
      : undefined));

  return [
    `Tooth ID: ${tooth.id}`,
    `Risk Score: ${tooth.riskScore ?? 0}`,
    `Mobility: ${tooth.mobility ?? 0}`,
    `Furcation: B=${tooth.furcation?.buccal ?? 0}, L=${tooth.furcation?.lingual ?? 0}`,
    `Buccal PD: ${formatSurfaceTriplet(pd as any, 'buccal')}`,
    `Buccal REC: ${formatSurfaceTriplet(rec as any, 'buccal')}`,
    `Lingual PD: ${formatSurfaceTriplet(pd as any, 'lingual')}`,
    `Lingual REC: ${formatSurfaceTriplet(rec as any, 'lingual')}`,
    `BOP: Buccal ${formatSurfaceTriplet(bop as any, 'buccal')}; Lingual ${formatSurfaceTriplet(bop as any, 'lingual')}`,
    `Plaque: Buccal ${formatSurfaceTriplet(plaque as any, 'buccal')}; Lingual ${formatSurfaceTriplet(plaque as any, 'lingual')}`,
    `Estimated CAL (Buccal): ${buccalCal.map(v => (v ?? 'NA')).join(', ')}`,
    `Estimated CAL (Lingual): ${lingualCal.map(v => (v ?? 'NA')).join(', ')}`,
  ].join('\n');
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, toothData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: SYSTEM_PROMPT }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const endpoint = (process.env.LLM_ENDPOINT as string) || 'http://216.81.248.15:8000/generate';

  useEffect(() => {
    if (isOpen) {
      // Seed context (replace previous context if reopened for a different tooth)
      setMessages(prev => {
        const withoutSystem = prev.filter(m => m.role !== 'system');
        return [
          { role: 'system', content: SYSTEM_PROMPT },
          ...withoutSystem
        ];
      });
    }
  }, [isOpen, toothData.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const contextBlock = useMemo(() => buildToothContext(toothData), [toothData]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSending(true);
    try {
      const history = messages
        .filter(m => m.role !== 'system')
        .concat(userMessage)
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const prompt = `${SYSTEM_PROMPT}\n\nTooth Context:\n${contextBlock}\n\nConversation:\n${history}\n\nAssistant:`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, max_new_tokens: 256, temperature: 0.2 })
      });
      const data = await res.json();
      const text = typeof data?.text === 'string' ? data.text : JSON.stringify(data);
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error calling model: ${err?.message || String(err)}` }]);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[rgba(25,30,45,0.9)] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl text-white w-full max-w-2xl max-h-[85vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <h3 className="text-lg font-bold">Chat with Perio Assistant (Tooth {toothData.id})</h3>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
        </header>
        <div className="px-4 py-2 text-xs text-gray-300 border-b border-gray-700/50 whitespace-pre-wrap">
          {contextBlock}
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.filter(m => m.role !== 'system').map((m, idx) => (
            <div key={idx} className={`max-w-[85%] rounded-lg px-3 py-2 whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600/80 ml-auto' : 'bg-gray-800/80 mr-auto'} `}>
              {m.content}
            </div>
          ))}
        </div>
        <footer className="p-3 border-t border-gray-700/50 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 outline-none border border-gray-700 focus:border-blue-500"
            placeholder="Ask about this tooth, e.g., recommended therapy given PD/REC/BOP..."
          />
          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isSending ? '...' : 'Send'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ChatPanel;


