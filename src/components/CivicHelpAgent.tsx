import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  language?: 'en-IN' | 'hi-IN' | 'mr-IN';
}

type SupportedLanguage = 'en-IN' | 'hi-IN' | 'mr-IN';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'en-IN': 'English',
  'hi-IN': 'हिंदी (Hindi)',
  'mr-IN': 'मराठी (Marathi)'
};

const MULTILINGUAL_EQUITY_EXPLANATIONS: Record<SupportedLanguage, string> = {
  'en-IN': 'Reports from historically neglected wards receive automatic Critical priority to ensure equitable municipal repairs.',
  'mr-IN': 'मागासलेल्या प्रभागांमधील तक्रारींना प्राधान्य देऊन तातडीने दुरुस्ती सुनिश्चित केली जाते.',
  'hi-IN': 'उपेक्षित वार्डों की शिकायतों को प्राथमिकता देकर निष्पक्ष रूप से तत्काल मरम्मत सुनिश्चित की जाती है।'
};

const INSTANT_ANSWERS: Record<SupportedLanguage, Array<{ label: string; prompt: string; answer: string }>> = {
  'en-IN': [
    {
      label: 'What is Equity Boost?',
      prompt: 'What is Equity Boost in Ward 9 and Ward 11?',
      answer: MULTILINGUAL_EQUITY_EXPLANATIONS['en-IN']
    },
    {
      label: 'How to Track My Report?',
      prompt: 'How do I track my civic complaint?',
      answer: 'You can track the live progress of any reported ticket directly from the Dashboard or Grievance Feed. Critical severity complaints automatically trigger outbound telephony alerts to on-duty municipal field engineers.'
    }
  ],
  'hi-IN': [
    {
      label: 'इक्विटी बूस्ट क्या है?',
      prompt: 'वार्ड 9 और 11 के लिए इक्विटी बूस्ट क्या है?',
      answer: MULTILINGUAL_EQUITY_EXPLANATIONS['hi-IN']
    },
    {
      label: 'शिकायत कैसे ट्रैक करें?',
      prompt: 'मेरी नागरिक शिकायत की स्थिति कैसे देखें?',
      answer: 'आप डैशबोर्ड या लाइव फीड से सीधे अपनी शिकायत ट्रैक कर सकते हैं। आपातकालीन शिकायतों पर सीधे अधिकारियों को कॉल भेजी जाती है।'
    }
  ],
  'mr-IN': [
    {
      label: 'इक्विटी बूस्ट काय आहे?',
      prompt: 'प्रभाग ९ आणि ११ साठी इक्विटी बूस्ट काय आहे?',
      answer: MULTILINGUAL_EQUITY_EXPLANATIONS['mr-IN']
    },
    {
      label: 'तक्रार कशी तपासावी?',
      prompt: 'माझ्या तक्रारीची सद्यस्थिती कशी तपासावी?',
      answer: 'तुम्ही डॅशबोर्ड किंवा थेट फीडवरून तुमच्या तक्रारीचा मागोवा घेऊ शकता. गंभीर तक्रारींसाठी थेट क्षेत्रीय अधिकाऱ्यांना कॉल केला जातो.'
    }
  ]
};

export const CivicHelpAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en-IN');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      sender: 'bot',
      text: 'Welcome to CivicFlow Citizen Assistant. How can I assist you with municipal grievances, tracking, or ward dispatch today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: 'en-IN'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Speech Synthesis helper
  const speakText = useCallback((text: string, lang: SupportedLanguage, msgId?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (msgId) setSpeakingMsgId(msgId);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick best available voice for language
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang === lang || v.lang.startsWith(lang.slice(0, 2)));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
  }, []);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = selectedLang;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
          console.warn('[CivicHelpAgent] Speech recognition event/error:', event.error);
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0]?.[0]?.transcript;
          if (transcript) {
            setInputValue(transcript);
            // Auto submit speech input
            handleSend(transcript, undefined, true);
          }
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }
  }, [selectedLang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.lang = selectedLang;
        recognitionRef.current.start();
      } catch (err: any) {
        console.warn('Speech recognition start exception:', err.message);
      }
    }
  };

  const handleSend = async (customPrompt?: string, instantReply?: string, usedVoiceMode = false) => {
    const text = (customPrompt || inputValue).trim();
    if (!text || isTyping) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: selectedLang
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputValue('');
    setIsTyping(true);

    const botMsgId = `bot-${Date.now()}`;

    if (instantReply) {
      setTimeout(() => {
        const botMsg: Message = {
          id: botMsgId,
          sender: 'bot',
          text: instantReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          language: selectedLang
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
        if (voiceOutputEnabled || usedVoiceMode) {
          speakText(instantReply, selectedLang, botMsgId);
        }
      }, 350);
      return;
    }

    try {
      const lower = text.toLowerCase();
      let botReply = '';

      // Check for Equity Boost in English, Hindi, or Marathi
      if (
        lower.includes('equity boost') ||
        lower.includes('ward 9') ||
        lower.includes('ward 11') ||
        lower.includes('इक्विटी') ||
        lower.includes('वार्ड 9') ||
        lower.includes('वार्ड 11') ||
        lower.includes('प्रभाग ९') ||
        lower.includes('प्रभाग ११')
      ) {
        botReply = MULTILINGUAL_EQUITY_EXPLANATIONS[selectedLang];
      } else if (lower.includes('track') || lower.includes('status') || lower.includes('ट्रेस') || lower.includes('तपासा')) {
        botReply = selectedLang === 'mr-IN'
          ? 'तुमच्या तक्रारीची सद्यस्थिती डॅशबोर्डवर उपलब्ध आहे. तातडीच्या तक्रारींवर थेट कॉलिंगद्वारे लक्ष ठेवले जाते.'
          : selectedLang === 'hi-IN'
          ? 'आपकी शिकायत की स्थिति डैशबोर्ड पर उपलब्ध है। आपातकालीन स्थिति में अधिकारियों को सीधी कॉल भेजी जाती है।'
          : 'To track your report, check your ticket ID on the Dashboard or Live Feed. Automated voice calls are placed to field leads whenever status changes occur.';
      } else {
        try {
          const res = await fetch('/api/issues/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: text })
          });
          const data = await res.json();
          if (data?.analysis?.summary) {
            botReply = `Issue summary: ${data.analysis.summary} | Priority: ${data.analysis.priority} | Department: ${data.analysis.department}.`;
          } else {
            botReply = selectedLang === 'mr-IN'
              ? 'आपली तक्रार नोंदवली आहे. महापालिका नियंत्रण कक्ष त्वरित कारवाई करेल.'
              : selectedLang === 'hi-IN'
              ? 'आपकी शिकायत दर्ज कर ली गई है। नगर निगम टीम तुरंत कार्रवाई करेगी।'
              : 'Your inquiry has been processed. You can report civic hazards or initiate field supervisor calls via the dashboard.';
          }
        } catch {
          botReply = selectedLang === 'mr-IN'
            ? 'सिव्हिकफ्लो सहाय्यक सक्रिय आहे. आपण तक्रार नोंदवू शकता किंवा अधिकाऱ्यांशी संपर्क साधू शकता.'
            : selectedLang === 'hi-IN'
            ? 'सिविकफ्लो सहायक सक्रिय है। आप अपनी समस्या बता सकते हैं।'
            : 'CivicFlow dispatch is active. You can track complaints, inspect ward allocations, or contact municipal officers directly.';
        }
      }

      const botMsg: Message = {
        id: botMsgId,
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: selectedLang
      };
      setMessages((prev) => [...prev, botMsg]);

      if (voiceOutputEnabled || usedVoiceMode) {
        speakText(botReply, selectedLang, botMsgId);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: 'Unable to reach the assistant service at this moment. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          language: selectedLang
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative flex items-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full shadow-2xl border border-slate-700/80 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Open Citizen Helping Agent"
        >
          {/* Pulsing green indicator dot */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
          </span>
          <span className="text-xl">💬</span>
          <span className="text-sm font-semibold tracking-wide text-emerald-400">Civic Assistant</span>
        </button>
      ) : (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 w-80 sm:w-96 h-[460px] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="bg-slate-800/90 border-b border-slate-700/80 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-xs font-bold">
                CF
              </div>
              <div>
                <h3 className="text-xs font-bold text-white leading-tight">Citizen Voice Assistant</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] text-emerald-400 font-medium">Regional Voice Ready</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Voice Output Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (voiceOutputEnabled) window.speechSynthesis?.cancel();
                  setVoiceOutputEnabled(!voiceOutputEnabled);
                }}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  voiceOutputEnabled
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle Voice Output"
              >
                {voiceOutputEnabled ? '🔊 Voice: ON' : '🔇 Voice: OFF'}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                aria-label="Close Assistant"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Language Selection & Instant Answer Bar */}
          <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/70 flex items-center justify-between gap-2">
            {/* Language Selector */}
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as SupportedLanguage)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-0.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="en-IN">English (India)</option>
              <option value="hi-IN">हिंदी (Hindi)</option>
              <option value="mr-IN">मराठी (Marathi)</option>
            </select>

            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {(INSTANT_ANSWERS[selectedLang] || INSTANT_ANSWERS['en-IN']).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(item.prompt, item.answer)}
                  disabled={isTyping}
                  className="whitespace-nowrap px-2.5 py-0.5 text-[10px] font-medium bg-slate-800 hover:bg-emerald-950/60 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-700/70 rounded-full transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1 max-w-[90%]">
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Speaker icon for bot messages */}
                  {msg.sender === 'bot' && (
                    <button
                      type="button"
                      onClick={() => speakText(msg.text, msg.language || selectedLang, msg.id)}
                      className={`p-1 text-xs rounded transition-colors cursor-pointer ${
                        speakingMsgId === msg.id
                          ? 'text-emerald-400 bg-emerald-950 border border-emerald-700 animate-pulse'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title="Speak Message"
                    >
                      🔊
                    </button>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 px-1 mt-0.5 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs py-1 px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[10px] text-slate-400 ml-1">Assistant typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Listening Overlay Indicator */}
          {isListening && (
            <div className="px-3 py-1.5 bg-red-950/80 border-t border-red-800/80 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <span className="text-xs font-semibold text-red-200">
                  Listening in {LANGUAGE_LABELS[selectedLang]}... Speak now
                </span>
              </div>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[10px] bg-red-900 hover:bg-red-800 text-white px-2 py-0.5 rounded cursor-pointer"
              >
                Stop
              </button>
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2 bg-slate-800/90 border-t border-slate-700/80 flex items-center gap-1.5"
          >
            {/* Microphone Toggle Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse shadow-lg'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
              title={speechSupported ? `Speak in ${LANGUAGE_LABELS[selectedLang]}` : 'Voice not supported in this browser'}
            >
              🎙️
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Type or speak (${LANGUAGE_LABELS[selectedLang]})...`}
              className="flex-1 bg-slate-950/80 border border-slate-700 text-xs text-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 placeholder-slate-400"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition-colors font-medium text-xs flex items-center justify-center cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CivicHelpAgent;
