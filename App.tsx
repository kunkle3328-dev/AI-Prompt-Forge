
import React, { useState, useEffect, useContext, createContext, useCallback, useRef, FC, ReactNode } from 'react';
import type { Content } from "@google/genai";
import * as GeminiService from './services/geminiService';

declare const hljs: any;

// ========= 1. TYPE DEFINITIONS =========

type View = 'landing' | 'dashboard' | 'chat' | 'prompt-builder' | 'code-builder' | 'generator' | 'history' | 'store';
type CodeBuilderTab = 'full-app' | 'quick-snippet';

interface User {
  name: string;
  email: string;
}

interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
  timestamp: string;
}

interface ChatSettings {
  persona: string;
  tone: string;
  temperature: number;
}

interface AppState {
  currentView: View;
  currentUser: User | null;
  userCredits: number;
  savedPrompts: SavedPrompt[];
  currentChatHistory: Content[];
  promptForCodeBuilder: string | null;
  chatSettings: ChatSettings;
}

interface AppContextType {
  state: AppState;
  navigateTo: (view: View) => void;
  login: (user: User) => void;
  logout: () => void;
  addCredits: (amount: number) => void;
  deductCredits: (amount: number) => boolean;
  checkCredits: () => boolean;
  savePrompt: (title: string, prompt: string) => void;
  deletePrompt: (id: string) => void;
  setChatHistory: React.Dispatch<React.SetStateAction<Content[]>>;
  setPromptForCodeBuilder: (prompt: string) => void;
  updateChatSettings: (settings: ChatSettings) => void;
  showToast: (message: string) => void;
  showModal: (content: ReactNode) => void;
  hideModal: () => void;
}

// ========= 2. ICONS =========
const IconMenu: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>);
const IconClose: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const IconDashboard: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l-1.5-1.5m1.5 1.5l1.5-1.5m-1.5 1.5v4.5m1.5-6.375l-1.5-1.5m1.5 1.5l1.5-1.5m-1.5 1.5v3.375m1.5-6.375l-1.5-1.5m1.5 1.5l1.5-1.5m-1.5 1.5v4.5m-3-12.375l-1.5-1.5m1.5 1.5l1.5-1.5m-1.5 1.5v4.5m3-3.375l-1.5-1.5m1.5 1.5l1.5-1.5m-1.5 1.5V9m3 3.375l-1.5-1.5m1.5 1.5l1.5-1.5m-1.5 1.5v4.5m3-6.375l-1.5-1.5m1.5 1.5l1.5-1.5m-1.5 1.5V9m3 3.375l-1.5-1.5m1.5 1.5l1.5-1.5m-1.5 1.5v4.5m3-3.375l-1.5-1.5m1.5 1.5l1.5-1.5m-1.5 1.5v4.5m0-19.5h-15a2.25 2.25 0 00-2.25 2.25v15a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0019.5 3z" /></svg>);
const IconChat: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const IconBuilder: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>);
const IconCode: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>);
const IconGenerator: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.5 21.75l-.398-1.197a3.375 3.375 0 00-2.31-2.31L12.75 18l1.197-.398a3.375 3.375 0 002.31-2.31L16.5 14.25l.398 1.197a3.375 3.375 0 002.31 2.31L20.25 18l-1.197.398a3.375 3.375 0 00-2.31 2.31z" /></svg>);
const IconHistory: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>);
const IconStore: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.823-6.831A1.125 1.125 0 0018.102 6H4.217L4.09 5.424A1.125 1.125 0 003 4.5H2.25z" /></svg>);
const IconLogout: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>);
const IconCredits: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25-2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9A2.25 2.25 0 0018.75 6.75h-1.5a3 3 0 00-6 0h-1.5A2.25 2.25 0 003 9v3m18 0h-1.5a3 3 0 000-6h1.5m-18 0h1.5a3 3 0 010-6h-1.5" /></svg>);
const IconCopy: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>);
const IconRegenerate: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-11.664 0l4.5-4.5m-4.5 4.5l-4.5-4.5m12.06-7.06h-4.992a8.25 8.25 0 00-11.664 0l-3.181 3.183m11.664 0l-4.5 4.5m4.5-4.5l4.5 4.5" /></svg>);
const IconSend: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>);
const IconSave: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>);
const IconDelete: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>);
const IconWarning: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>);
const IconSettings: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-1.226.55-.22 1.156-.22 1.706 0 .55.22 1.02.684 1.11 1.226l.082.498a1.5 1.5 0 001.447 1.262l.5-.094c.542-.102 1.106.09 1.422.508.316.418.396.972.22 1.45l-.16.48c-.176.532-.042 1.135.328 1.526l.4.402c.418.418.508.98.22 1.45l-.16.48c-.176.532.042 1.135.328 1.526l.4.402c.418.418.396.972.22 1.45l-.16.48c-.176.532.042 1.135.328 1.526l.4.402c.418.418.508.98.22 1.45l-.16.48a1.5 1.5 0 01-1.422.508l-.5-.094a1.5 1.5 0 00-1.447 1.262l-.082.498c-.09.542-.56 1.007-1.11 1.226-.55.22-1.156-.22-1.706 0-.55-.22-1.02-.684-1.11-1.226l-.082-.498a1.5 1.5 0 00-1.447-1.262l-.5.094c-.542.102-1.106-.09-1.422-.508-.316-.418-.396-.972-.22-1.45l.16-.48c.176-.532.042-1.135-.328-1.526l-.4-.402c-.418-.418-.508-.98-.22-1.45l.16-.48c.176-.532-.042-1.135-.328-1.526l-.4-.402c-.418-.418-.396-.972-.22-1.45l.16-.48c.176-.532.042-1.135-.328-1.526l-.4-.402a1.5 1.5 0 01-1.422-.508l-.5.094a1.5 1.5 0 00-1.447-1.262l-.082-.498z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const IconCheck: FC<{ className?: string }> = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>);

// ========= 3. APP CONTEXT =========
const AppContext = createContext<AppContextType | null>(null);
const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};

// ========= 4. UI COMPONENTS =========

const GlassCard: FC<{ children: ReactNode, className?: string, animated?: boolean }> = ({ children, className = '', animated = false }) => (
  <div className={`${animated ? 'glass-card-animated' : 'glass-card'} ${className}`}>
    {children}
  </div>
);

const Button: FC<{ onClick?: () => void, children: ReactNode, className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean }> = ({ onClick, children, className = '', type = 'button', disabled = false }) => (
  <button onClick={onClick} type={type} disabled={disabled} className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-dark focus:ring-accent-blue disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${className}`}>
    {children}
  </button>
);

const Spinner: FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-spin rounded-full h-5 w-5 border-b-2 border-white ${className}`}></div>
);

const Toast: FC<{ message: string, show: boolean }> = ({ message, show }) => {
  if (!show) return null;
  return (
    <div className="fixed bottom-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50 fade-in">
      {message}
    </div>
  );
};

const Modal: FC<{ show: boolean, onClose: () => void, children: ReactNode }> = ({ show, onClose, children }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="modal-scale-in" onClick={(e) => e.stopPropagation()}>
        <GlassCard className="p-6 relative max-w-lg w-full">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <IconClose className="h-6 w-6" />
            </button>
            {children}
        </GlassCard>
      </div>
    </div>
  );
};


// ========= 5. LAYOUT COMPONENTS =========
const Sidebar: FC<{ closeMenu?: () => void }> = ({ closeMenu = () => {} }) => {
    const { navigateTo, state, logout } = useAppContext();
    const navItems = [
      { view: 'dashboard' as View, icon: IconDashboard, label: 'Dashboard' },
      { view: 'chat' as View, icon: IconChat, label: 'AI Chat' },
      { view: 'prompt-builder' as View, icon: IconBuilder, label: 'Prompt Builder' },
      { view: 'code-builder' as View, icon: IconCode, label: 'Code Builder' },
      { view: 'generator' as View, icon: IconGenerator, label: 'Generator' },
      { view: 'history' as View, icon: IconHistory, label: 'History' },
      { view: 'store' as View, icon: IconStore, label: 'Store' },
    ];

    const handleNavigate = (view: View) => {
        navigateTo(view);
        closeMenu();
    };

    const handleLogout = () => {
        logout();
        closeMenu();
    };
  
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
            <IconGenerator className="h-8 w-8 text-accent-blue" />
            <h1 className="text-xl font-bold">AI Prompt Forge</h1>
        </div>
        <nav className="flex-grow space-y-2">
          {navItems.map(({ view, icon: Icon, label }) => (
            <button
              key={view}
              onClick={() => handleNavigate(view)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${state.currentView === view ? 'bg-white/10 text-white' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
         <div className="mt-auto">
            <div className="p-2 mb-4">
                <div className="flex justify-between items-center text-sm mb-1 text-text-secondary">
                    <span>Credits</span>
                    <span>{state.userCredits}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div className="bg-accent-blue h-1.5 rounded-full" style={{ width: `${Math.min(state.userCredits, 100)}%` }}></div>
                </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-white transition-colors"
            >
              <IconLogout className="h-5 w-5" />
              <span>Logout</span>
            </button>
        </div>
      </div>
    );
};
  
const Header: FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
    const { state } = useAppContext();
    return (
      <header className="md:hidden glass-card flex items-center justify-between p-4 sticky top-0 z-30 m-2">
        <div className="flex items-center gap-2">
          <IconGenerator className="h-6 w-6 text-accent-blue" />
          <h1 className="text-lg font-bold">AI Prompt Forge</h1>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
                <IconCredits className="h-5 w-5 text-accent-blue" />
                <span>{state.userCredits}</span>
            </div>
            <button onClick={onMenuClick}>
                <IconMenu className="h-6 w-6" />
            </button>
        </div>
      </header>
    );
};

const Layout: FC<{ children: ReactNode }> = ({ children }) => {
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const closeMobileMenu = () => setMobileMenuOpen(false);
    
    return (
      <div className="min-h-screen flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 glass-card fixed top-2 left-2 bottom-2">
          <Sidebar />
        </aside>
  
        {/* Mobile Menu */}
        <div className={`fixed inset-0 z-40 transform transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden`}>
            <div className="w-64 h-full glass-card">
                <Sidebar closeMenu={closeMobileMenu} />
            </div>
            <div className="absolute top-4 right-4" onClick={() => setMobileMenuOpen(false)}>
                <IconClose className="h-6 w-6"/>
            </div>
        </div>
        {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setMobileMenuOpen(false)}></div>}
  
        <div className="flex-1 flex flex-col md:ml-64">
          <Header onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 p-2 md:p-6 lg:p-8 flex flex-col">
            <div className="fade-in flex-1 flex flex-col">{children}</div>
          </main>
        </div>
      </div>
    );
};

const copyToClipboard = (text: string, showToast: (msg: string) => void) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!");
};

// ========= 6. VIEW COMPONENTS =========

const LandingView: FC = () => {
    // FIX: Destructure `showToast` from the app context to make it available for use in this component.
    const { login, showModal, hideModal, showToast } = useAppContext();

    const handleAuthSuccess = () => {
        login({ name: 'Demo User', email: 'demo@example.com' });
        hideModal();
    };

    const AuthForm: FC<{ initialFormType: 'login' | 'signup' }> = ({ initialFormType }) => {
        const [formType, setFormType] = useState(initialFormType);
        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            handleAuthSuccess();
        };
        return (
            <div>
                <h2 className="text-3xl font-bold text-center mb-6">{formType === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formType === 'signup' && (
                        <input type="text" placeholder="Your Name" className="w-full p-3 bg-white/10 rounded-lg border border-transparent focus:border-accent-blue focus:outline-none" required />
                    )}
                    <input type="email" placeholder="Email Address" className="w-full p-3 bg-white/10 rounded-lg border border-transparent focus:border-accent-blue focus:outline-none" required />
                    <input type="password" placeholder="Password" className="w-full p-3 bg-white/10 rounded-lg border border-transparent focus:border-accent-blue focus:outline-none" required />
                    <Button type="submit" className="w-full btn-primary !py-3">{formType === 'login' ? 'Login' : 'Sign Up & Get 20 Credits'}</Button>
                </form>
                <p className="text-center mt-4 text-sm text-text-secondary">
                    {formType === 'login' ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => setFormType(formType === 'login' ? 'signup' : 'login')} className="font-semibold text-accent-blue hover:underline ml-1">
                        {formType === 'login' ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        );
    };

    const openAuthModal = (type: 'login' | 'signup') => {
        showModal(<AuthForm initialFormType={type} />);
    };

    return (
        <div className="landing-page">
            <div className="landing-bg-container">
                <div className="glow-orb"></div>
                <div className="glow-orb"></div>
            </div>

            <nav className="navbar-glass">
                <GlassCard className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <IconGenerator className="h-8 w-8 text-accent-blue" />
                        <h1 className="text-xl font-bold">AI Prompt Forge</h1>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <a href="#features" className="hover:text-accent-blue transition-colors">Features</a>
                        <a href="#pricing" className="hover:text-accent-blue transition-colors">Pricing</a>
                        <a href="#testimonials" className="hover:text-accent-blue transition-colors">Testimonials</a>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                        <Button onClick={() => openAuthModal('login')} className="btn-secondary">Login</Button>
                        <Button onClick={() => openAuthModal('signup')} className="btn-primary">Sign Up</Button>
                    </div>
                    <div className="md:hidden">
                        <Button onClick={() => openAuthModal('signup')} className="btn-primary !px-4 !py-2">Get Started</Button>
                    </div>
                </GlassCard>
            </nav>

            <header className="hero-section">
                <div className="relative z-10">
                    <h1 className="text-5xl md:text-7xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-accent-blue to-accent-purple leading-tight fade-in">
                        Forge The Future of Code
                    </h1>
                    <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mb-8 fade-in-delay-1">
                        From a single idea to production-ready applications in minutes. Leverage our advanced AI toolkit to build prompts, generate code, and chat with a powerful AI assistant, supercharging your entire development workflow.
                    </p>
                    <div className="space-x-4 fade-in-delay-2">
                        <Button onClick={() => openAuthModal('signup')} className="btn-primary !px-8 !py-3 !text-base">Get Started For Free</Button>
                    </div>
                </div>
            </header>
            
            <main>
                <section id="features" className="section text-center">
                    <h2 className="text-4xl font-bold mb-4 fade-in">A New Era of Development</h2>
                    <p className="text-text-secondary max-w-2xl mx-auto mb-12 fade-in">AI Prompt Forge provides everything you need to turn creative concepts into tangible code with unprecedented speed and precision.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <GlassCard className="p-8 feature-card fade-in">
                            <IconBuilder className="h-12 w-12 text-accent-blue mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Intelligent Prompt Builder</h3>
                            <p className="text-text-secondary text-sm">Craft perfect, detailed project prompts with AI-powered suggestions for audience, features, tech stack, and more. Eliminate ambiguity and get exactly what you envision.</p>
                        </GlassCard>
                         <GlassCard className="p-8 feature-card fade-in-delay-1">
                            <IconCode className="h-12 w-12 text-accent-purple mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Multi-Framework Code Generation</h3>
                            <p className="text-text-secondary text-sm">Generate clean, production-ready code in HTML, React, and Vue. From quick snippets to full applications, our AI understands best practices and modern syntax.</p>
                        </GlassCard>
                         <GlassCard className="p-8 feature-card fade-in-delay-2">
                            <IconChat className="h-12 w-12 text-accent-blue mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Collaborative AI Chat</h3>
                            <p className="text-text-secondary text-sm">Brainstorm ideas, debug code, and get instant answers with a customizable AI assistant. Adjust its persona, tone, and creativity to match your needs.</p>
                        </GlassCard>
                    </div>
                </section>

                <section id="pricing" className="section">
                    <h2 className="text-4xl font-bold mb-4 text-center fade-in">Choose Your Plan</h2>
                    <p className="text-text-secondary max-w-2xl mx-auto mb-12 text-center fade-in">Start for free and scale as you grow. Our pricing is simple and designed for developers at every stage.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <GlassCard className="p-8 flex flex-col pricing-card fade-in">
                            <h3 className="text-2xl font-bold">Hobbyist</h3>
                            <p className="text-5xl font-black my-4">Free</p>
                            <p className="text-text-secondary text-sm mb-6">Perfect for trying out the platform.</p>
                            <ul className="space-y-3 text-left mb-8 flex-grow">
                                <li className="flex items-center gap-3"><IconCheck className="h-5 w-5 text-green-400"/> 20 Free Credits</li>
                                <li className="flex items-center gap-3"><IconCheck className="h-5 w-5 text-green-400"/> Basic AI Models</li>
                            </ul>
                            <Button onClick={() => openAuthModal('signup')} className="btn-secondary w-full mt-auto">Get Started</Button>
                        </GlassCard>
                        <GlassCard animated className="p-8 flex flex-col pricing-card scale-105 fade-in-delay-1" >
                            <p className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent-purple px-3 py-1 text-xs font-semibold rounded-full">MOST POPULAR</p>
                            <h3 className="text-2xl font-bold">Pro</h3>
                            <p className="text-5xl font-black my-4">$10<span className="text-lg font-medium text-text-secondary">/120 credits</span></p>
                            <p className="text-text-secondary text-sm mb-6">For professionals and frequent users.</p>
                            <ul className="space-y-3 text-left mb-8 flex-grow">
                                <li className="flex items-center gap-3"><IconCheck className="h-5 w-5 text-green-400"/> 120 Credits</li>
                                <li className="flex items-center gap-3"><IconCheck className="h-5 w-5 text-green-400"/> Advanced AI Models (Gemini Pro)</li>
                                <li className="flex items-center gap-3"><IconCheck className="h-5 w-5 text-green-400"/> Save & Manage Unlimited Prompts</li>
                                <li className="flex items-center gap-3"><IconCheck className="h-5 w-5 text-green-400"/> Priority Support</li>
                            </ul>
                            <Button onClick={() => openAuthModal('signup')} className="btn-primary w-full mt-auto">Choose Pro</Button>
                        </GlassCard>
                        <GlassCard className="p-8 flex flex-col pricing-card fade-in-delay-2">
                             <h3 className="text-2xl font-bold">Enterprise</h3>
                            <p className="text-5xl font-black my-4">Custom</p>
                            <p className="text-text-secondary text-sm mb-6">For teams and businesses with custom needs.</p>
                             <ul className="space-y-3 text-left mb-8 flex-grow">
                                <li className="flex items-center gap-3"><IconCheck className="h-5 w-5 text-green-400"/> Custom Credit Allotments</li>
                                <li className="flex items-center gap-3"><IconCheck className="h-5 w-5 text-green-400"/> Team Management & Billing</li>
                                <li className="flex items-center gap-3"><IconCheck className="h-5 w-5 text-green-400"/> On-premise Options</li>
                                <li className="flex items-center gap-3"><IconCheck className="h-5 w-5 text-green-400"/> Dedicated Support</li>
                            </ul>
                            <Button onClick={() => showToast("Contacting sales!")} className="btn-secondary w-full mt-auto">Contact Sales</Button>
                        </GlassCard>
                    </div>
                </section>
                
                 <section id="testimonials" className="section">
                    <h2 className="text-4xl font-bold mb-12 text-center fade-in">Loved by Developers Worldwide</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <GlassCard className="p-6 testimonial-card fade-in">
                            <p className="text-text-secondary mb-4">"AI Prompt Forge has cut my initial project setup time by 90%. I can go from a client brief to a working prototype in the same afternoon. Absolutely game-changing."</p>
                            <div className="font-semibold">- Sarah L., Freelance Web Developer</div>
                        </GlassCard>
                         <GlassCard className="p-6 testimonial-card fade-in-delay-1">
                            <p className="text-text-secondary mb-4">"The prompt builder is pure genius. It forces me to think through the project requirements properly, and the AI suggestions are always spot on. The generated code is surprisingly clean."</p>
                             <div className="font-semibold">- Mike R., Senior Frontend Engineer</div>
                        </GlassCard>
                         <GlassCard className="p-6 testimonial-card fade-in-delay-2">
                            <p className="text-text-secondary mb-4">"As a student, this is the ultimate learning tool. I can experiment with different frameworks and see best practices in action instantly. The AI Chat is like having a 24/7 tutor."</p>
                             <div className="font-semibold">- Chloe T., Computer Science Student</div>
                        </GlassCard>
                    </div>
                </section>

                <section className="section text-center">
                    <GlassCard className="p-12 max-w-4xl mx-auto fade-in">
                         <h2 className="text-4xl font-bold mb-4">Ready to Revolutionize Your Workflow?</h2>
                        <p className="text-text-secondary max-w-2xl mx-auto mb-8">Join thousands of developers building faster and smarter with AI Prompt Forge. Get started today with 20 free credits on us.</p>
                        <Button onClick={() => openAuthModal('signup')} className="btn-primary !px-10 !py-4 !text-lg">Start Building for Free</Button>
                    </GlassCard>
                </section>
            </main>

            <footer className="text-center p-8 border-t border-glass-border">
                <p className="text-sm text-text-secondary">&copy; {new Date().getFullYear()} AI Prompt Forge. All rights reserved.</p>
            </footer>
        </div>
    );
};

const DashboardView: FC = () => {
    const { state, navigateTo } = useAppContext();
    
    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <GlassCard className="p-6">
                    <h2 className="text-lg font-semibold text-text-secondary mb-2">Credits Remaining</h2>
                    <p className="text-4xl font-bold">{state.userCredits}</p>
                </GlassCard>
                <GlassCard className="p-6">
                    <h2 className="text-lg font-semibold text-text-secondary mb-2">Prompts Saved</h2>
                    <p className="text-4xl font-bold">{state.savedPrompts.length}</p>
                </GlassCard>
            </div>
            <GlassCard className="p-6">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button onClick={() => navigateTo('chat')} className="p-6 bg-white/5 rounded-lg text-center hover:bg-white/10 transition-colors">
                        <IconChat className="h-10 w-10 mx-auto mb-2 text-accent-blue" />
                        <span className="font-semibold">AI Chat</span>
                    </button>
                    <button onClick={() => navigateTo('prompt-builder')} className="p-6 bg-white/5 rounded-lg text-center hover:bg-white/10 transition-colors">
                        <IconBuilder className="h-10 w-10 mx-auto mb-2 text-accent-blue" />
                        <span className="font-semibold">Prompt Builder</span>
                    </button>
                    <button onClick={() => navigateTo('code-builder')} className="p-6 bg-white/5 rounded-lg text-center hover:bg-white/10 transition-colors">
                        <IconCode className="h-10 w-10 mx-auto mb-2 text-accent-blue" />
                        <span className="font-semibold">Code Builder</span>
                    </button>
                    <button onClick={() => navigateTo('generator')} className="p-6 bg-white/5 rounded-lg text-center hover:bg-white/10 transition-colors">
                        <IconGenerator className="h-10 w-10 mx-auto mb-2 text-accent-blue" />
                        <span className="font-semibold">Generator</span>
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};

const ChatSettingsModal: FC = () => {
    const { state, updateChatSettings, hideModal } = useAppContext();
    const [settings, setSettings] = useState(state.chatSettings);

    const handleSave = () => {
        updateChatSettings(settings);
        hideModal();
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Chat Settings</h2>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">AI Persona</label>
                    <select
                        value={settings.persona}
                        onChange={e => setSettings(s => ({ ...s, persona: e.target.value }))}
                        className="w-full bg-white/10 rounded-lg p-2.5 text-sm border border-glass-border focus:border-accent-blue focus:outline-none"
                    >
                        <option>Helpful Assistant</option>
                        <option>Sarcastic Friend</option>
                        <option>Domain Expert</option>
                        <option>Creative Writer</option>
                        <option>Code Wizard</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">AI Tone</label>
                    <select
                        value={settings.tone}
                        onChange={e => setSettings(s => ({ ...s, tone: e.target.value }))}
                        className="w-full bg-white/10 rounded-lg p-2.5 text-sm border border-glass-border focus:border-accent-blue focus:outline-none"
                    >
                        <option>Neutral</option>
                        <option>Formal</option>
                        <option>Casual</option>
                        <option>Humorous</option>
                        <option>Enthusiastic</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                        Temperature: <span className="font-bold text-accent-blue">{settings.temperature.toFixed(2)}</span>
                    </label>
                    <p className="text-xs text-text-secondary mb-2">Controls randomness. Lower is more predictable, higher is more creative.</p>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={settings.temperature}
                        onChange={e => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb"
                    />
                </div>
            </div>
            <div className="mt-8 flex justify-end">
                <Button onClick={handleSave} className="btn-primary">Save Settings</Button>
            </div>
        </div>
    );
};

const ChatView: FC = () => {
    const { state, setChatHistory, deductCredits, checkCredits, showToast, showModal, navigateTo, hideModal } = useAppContext();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [state.currentChatHistory]);
    
    const handleNoCredits = () => {
        showModal(
            <div>
                <h2 className="text-xl font-bold mb-4">Out of Credits</h2>
                <p className="text-text-secondary mb-6">You've used all your credits. Please purchase more to continue using the AI features.</p>
                <Button onClick={() => { navigateTo('store'); hideModal(); }} className="btn-primary w-full">Go to Store</Button>
            </div>
        );
    }

    const handleSend = async (message: string) => {
        if (!message.trim() || isLoading) return;
        if (!checkCredits()) { handleNoCredits(); return; }

        const newHistory: Content[] = [...state.currentChatHistory, { role: 'user', parts: [{ text: message }] }];
        setChatHistory(newHistory);
        setInput('');
        setIsLoading(true);
        
        try {
            deductCredits(1);
            const { persona, tone, temperature } = state.chatSettings;
            const aiResponse = await GeminiService.generateChatResponse(newHistory, persona, tone, temperature);
            setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: aiResponse }] }]);
        } catch (error) {
            showToast("Error communicating with AI.");
            setChatHistory(prev => [...prev.slice(0, -1)]); // remove user message on error
        } finally {
            setIsLoading(false);
        }
    };
    
    const openSettingsModal = () => {
        showModal(<ChatSettingsModal />);
    };
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 px-2">
                <h1 className="text-3xl font-bold">AI Chat</h1>
                <button onClick={openSettingsModal} className="p-2 rounded-full text-text-secondary hover:text-white hover:bg-white/10 transition-colors">
                    <IconSettings className="h-6 w-6" />
                </button>
            </div>
            <GlassCard className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {state.currentChatHistory.map((msg, index) => (
                         <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'chat-bubble-user rounded-br-lg' : 'chat-bubble-ai rounded-bl-lg'}`}>
                                <p style={{whiteSpace: "pre-wrap"}}>{msg.parts[0].text as string}</p>
                                {msg.role === 'model' && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <button onClick={() => copyToClipboard(msg.parts[0].text as string, showToast)} className="text-xs text-gray-300 hover:text-white"><IconCopy className="h-4 w-4" /></button>
                                        <button disabled={isLoading} onClick={() => handleSend(state.currentChatHistory[index-1]?.parts[0].text as string)} className="text-xs text-gray-300 hover:text-white disabled:opacity-50"><IconRegenerate className="h-4 w-4" /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-lg p-3 rounded-2xl chat-bubble-ai rounded-bl-lg flex items-center gap-2">
                                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                        placeholder="Type your message..."
                        className="flex-1 p-3 bg-white/10 rounded-lg border border-transparent focus:border-accent-blue focus:outline-none"
                    />
                    <Button onClick={() => handleSend(input)} disabled={isLoading || !input.trim()} className="btn-primary !p-3">
                        {isLoading ? <Spinner /> : <IconSend className="h-5 w-5" />}
                    </Button>
                </div>
            </GlassCard>
        </div>
    );
};

const PromptBuilderView: FC = () => {
    const { deductCredits, checkCredits, showToast, showModal, navigateTo, hideModal, savePrompt, setPromptForCodeBuilder } = useAppContext();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [description, setDescription] = useState('');
    const [formData, setFormData] = useState({ audience: '', features: [] as string[], framework: '', tone: '', style: '' });
    const [finalPrompt, setFinalPrompt] = useState('');

    const handleNoCredits = () => {
        showModal(
            <div>
                <h2 className="text-xl font-bold mb-4">Out of Credits</h2>
                <p className="text-text-secondary mb-6">Please purchase more credits to use the Prompt Builder.</p>
                <Button onClick={() => { navigateTo('store'); hideModal(); }} className="btn-primary w-full">Go to Store</Button>
            </div>
        );
    };

    const handleStep1Submit = async () => {
        if (!description.trim()) { showToast("Please enter a description."); return; }
        if (!checkCredits()) { handleNoCredits(); return; }
        setIsLoading(true);
        try {
            deductCredits(1);
            const ideas = await GeminiService.generatePromptIdeas(description);
            setFormData(ideas);
            setStep(2);
        } catch (error) {
            showToast("Failed to generate ideas. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStep2Submit = async () => {
        if (!checkCredits()) { handleNoCredits(); return; }
        setIsLoading(true);
        try {
            deductCredits(1);
            const fullPrompt = await GeminiService.generateFullPrompt({ ...formData, description });
            setFinalPrompt(fullPrompt);
            setStep(3);
        } catch (error) {
            showToast("Failed to generate the final prompt. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFeatureChange = (index: number, value: string) => {
        const newFeatures = [...formData.features];
        newFeatures[index] = value;
        setFormData(prev => ({ ...prev, features: newFeatures }));
    };
    
    const SimpleMarkdownRenderer: FC<{ content: string }> = ({ content }) => {
        const html = content
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
            .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*)\*/g, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
            .replace(/\n/g, '<br />');
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">AI Prompt Builder</h1>
            <GlassCard className="p-6">
                {/* Step 1 */}
                {step === 1 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Step 1: Describe Your App</h2>
                        <p className="text-text-secondary mb-4">Start with a single sentence describing the application you want to build.</p>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., A simple to-do list application with user authentication."
                            className="w-full p-3 h-32 bg-white/10 rounded-lg border border-transparent focus:border-accent-blue focus:outline-none resize-none"
                        />
                        <Button onClick={handleStep1Submit} disabled={isLoading} className="btn-primary mt-4">
                            {isLoading ? <Spinner/> : "Get AI Suggestions"}
                        </Button>
                    </div>
                )}
                {/* Step 2 */}
                {step === 2 && (
                    <div>
                         <h2 className="text-xl font-semibold mb-2">Step 2: Refine the Details</h2>
                        <p className="text-text-secondary mb-4">The AI has generated some ideas. Review and adjust them as needed.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Target Audience</label>
                                <input type="text" name="audience" value={formData.audience} onChange={handleFormChange} className="w-full p-2 bg-white/10 rounded-lg"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Key Features</label>
                                {formData.features.map((feature, i) => (
                                    <input key={i} type="text" value={feature} onChange={(e) => handleFeatureChange(i, e.target.value)} className="w-full p-2 bg-white/10 rounded-lg mb-2"/>
                                ))}
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Framework</label>
                                <input type="text" name="framework" value={formData.framework} onChange={handleFormChange} className="w-full p-2 bg-white/10 rounded-lg"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Tone</label>
                                <input type="text" name="tone" value={formData.tone} onChange={handleFormChange} className="w-full p-2 bg-white/10 rounded-lg"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Style</label>
                                <input type="text" name="style" value={formData.style} onChange={handleFormChange} className="w-full p-2 bg-white/10 rounded-lg"/>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <Button onClick={() => setStep(1)} className="bg-white/10">Back</Button>
                            <Button onClick={handleStep2Submit} disabled={isLoading} className="btn-primary">
                                {isLoading ? <Spinner/> : "Generate Final Prompt"}
                            </Button>
                        </div>
                    </div>
                )}
                 {/* Step 3 */}
                {step === 3 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Step 3: Your Generated Prompt</h2>
                        <p className="text-text-secondary mb-4">Here is the final, detailed prompt. You can now use this in the Code Builder.</p>
                        <div className="p-4 bg-black/20 rounded-lg max-h-96 overflow-y-auto">
                            <SimpleMarkdownRenderer content={finalPrompt} />
                        </div>
                         <div className="flex gap-4 mt-6">
                            <Button onClick={() => setStep(2)} className="bg-white/10">Back</Button>
                            <Button onClick={() => copyToClipboard(finalPrompt, showToast)} className="bg-white/10 flex items-center gap-2"><IconCopy className="h-4 w-4"/> Copy</Button>
                            <Button onClick={() => { savePrompt(description, finalPrompt); showToast("Prompt Saved!"); }} className="bg-white/10 flex items-center gap-2"><IconSave className="h-4 w-4"/> Save</Button>
                            <Button onClick={() => { setPromptForCodeBuilder(finalPrompt); navigateTo('code-builder'); }} className="btn-primary">
                                Go to AI Code Builder
                            </Button>
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

const CodePreview: FC<{
  code: string;
  language: string;
  onBack: () => void;
  onRegenerate: () => void;
}> = ({ code, language, onBack, onRegenerate }) => {
    const { showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState(language === 'HTML' ? 'preview' : 'code');
    const codeBlockRef = useRef<HTMLElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeError, setIframeError] = useState(false);

    const getHighlightLanguage = (lang: string) => {
        switch(lang.toLowerCase()) {
            case 'react': return 'jsx';
            case 'vue': return 'vue';
            case 'html': return 'xml';
            default: return lang.toLowerCase();
        }
    }
    
    useEffect(() => {
        if (codeBlockRef.current && (activeTab === 'code' || language !== 'HTML')) {
            if (typeof hljs !== 'undefined') {
                hljs.highlightElement(codeBlockRef.current);
            }
        }
    }, [code, language, activeTab]);

    useEffect(() => {
        // When the code changes, we should assume the new code is valid until proven otherwise.
        setIframeError(false);
    }, [code]);

    const handleCopy = () => {
        copyToClipboard(code, showToast);
    };
    
    const handleIframeLoad = () => {
        setTimeout(() => {
            try {
                const iframe = iframeRef.current;
                if (!iframe?.contentDocument?.body) {
                    if (code && code.trim()) {
                        setIframeError(true);
                    }
                    return;
                }
    
                const hasCodeInput = code && code.trim() !== '';
                const doc = iframe.contentDocument;
                
                const isPreviewEmpty = doc.body.childElementCount === 0 && doc.head.childElementCount === 0;
    
                if (hasCodeInput && isPreviewEmpty) {
                    setIframeError(true);
                } else {
                    setIframeError(false);
                }
    
            } catch (e) {
                console.error("Error checking iframe content:", e);
                if (code && code.trim()) {
                    setIframeError(true);
                }
            }
        }, 150); 
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 mb-4 flex items-center justify-between glass-card">
                <div className="flex items-center gap-4">
                     <Button onClick={onBack} className="bg-white/10">Back to Editor</Button>
                     <h2 className="font-semibold text-lg hidden sm:block">Generated Output</h2>
                </div>
                <div className="flex items-center gap-2">
                     <Button onClick={onRegenerate} className="bg-white/10 flex items-center gap-2">
                         <IconRegenerate className="h-4 w-4" /> Regenerate
                     </Button>
                     <Button onClick={handleCopy} className="btn-primary flex items-center gap-2">
                         <IconCopy className="h-4 w-4" /> Copy
                     </Button>
                </div>
            </div>

            <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden">
                {language === 'HTML' && (
                    <div className="p-2 sm:p-4 border-b border-glass-border flex items-center gap-2">
                        <button onClick={() => setActiveTab('preview')} className={`py-2 px-4 text-sm font-medium rounded-t-md ${activeTab === 'preview' ? 'bg-white/10 text-white' : 'text-text-secondary hover:bg-white/5'}`}>Live Preview</button>
                        <button onClick={() => setActiveTab('code')} className={`py-2 px-4 text-sm font-medium rounded-t-md ${activeTab === 'code' ? 'bg-white/10 text-white' : 'text-text-secondary hover:bg-white/5'}`}>Code</button>
                    </div>
                )}
                 <div className="flex-1 overflow-auto bg-[#282c34] relative">
                    {language === 'HTML' && activeTab === 'preview' && (
                        <>
                            <iframe 
                                ref={iframeRef} 
                                srcDoc={code} 
                                title="Live Preview" 
                                className="w-full h-full border-0 bg-white" 
                                sandbox="allow-scripts"
                                onLoad={handleIframeLoad}
                            />
                            {iframeError && (
                                <div className="absolute inset-0 bg-bg-dark/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                                    <IconWarning className="h-16 w-16 text-yellow-500 mb-4" />
                                    <h3 className="text-2xl font-bold text-yellow-400 mb-2">Preview Unavailable</h3>
                                    <p className="max-w-md text-text-secondary mb-6">
                                        The live preview could not be rendered. This often happens if the generated HTML is incomplete or contains errors.
                                    </p>
                                    <div className="flex gap-4">
                                        <Button onClick={() => setActiveTab('code')} className="btn-primary">View Code</Button>
                                        <Button onClick={onRegenerate} className="bg-white/10">Try Again</Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {(language !== 'HTML' || activeTab === 'code') && (
                         <pre className="h-full w-full !m-0 !p-4">
                            <code ref={codeBlockRef} className={`language-${getHighlightLanguage(language)}`}>
                                {code}
                            </code>
                        </pre>
                    )}
                 </div>
            </GlassCard>
        </div>
    );
};


const CodeBuilderView: FC = () => {
    const { state, deductCredits, showToast, showModal, hideModal, navigateTo, setPromptForCodeBuilder } = useAppContext();
    const [activeTab, setActiveTab] = useState<CodeBuilderTab>('full-app');
    const [prompt, setPrompt] = useState('');
    const [language, setLanguage] = useState('HTML');
    const [generatedCode, setGeneratedCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        if(state.promptForCodeBuilder) {
            setActiveTab('full-app');
            setPrompt(state.promptForCodeBuilder);
            setPromptForCodeBuilder(''); // Clear it after use
        }
    }, [state.promptForCodeBuilder, setPromptForCodeBuilder]);

    const handleGenerate = async () => {
        if (!prompt.trim()) { showToast("Please enter a prompt."); return; }
        
        const CODE_GENERATION_COST = 5;
        if (state.userCredits < CODE_GENERATION_COST) { 
             showModal(
                <div>
                    <h2 className="text-xl font-bold mb-4">Insufficient Credits</h2>
                    <p className="text-text-secondary mb-6">You need at least {CODE_GENERATION_COST} credits to generate code. Please purchase more.</p>
                    <Button onClick={() => { navigateTo('store'); hideModal(); }} className="btn-primary w-full">Go to Store</Button>
                </div>
            );
            return; 
        }

        setIsLoading(true);
        try {
            deductCredits(CODE_GENERATION_COST);
            const code = await GeminiService.generateCode(prompt, language);
            setGeneratedCode(code);
        } catch(error) {
            showToast("Failed to generate code. Please try again.");
            setGeneratedCode(''); // Clear code on error
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <GlassCard className="p-8 text-center">
                    <Spinner className="h-10 w-10 mx-auto mb-4 border-accent-blue" />
                    <h2 className="text-xl font-semibold">Generating Code...</h2>
                    <p className="text-text-secondary mt-2">The AI is working its magic. This may take a moment.</p>
                </GlassCard>
            </div>
        );
    }
    
    if (generatedCode) {
        return (
            <div className="h-full">
                <CodePreview 
                    code={generatedCode} 
                    language={language}
                    onBack={() => setGeneratedCode('')}
                    onRegenerate={handleGenerate}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <h1 className="text-3xl font-bold mb-4 text-center">AI Code Builder</h1>
             <p className="text-text-secondary text-center mb-6 max-w-2xl mx-auto">
                Use a detailed prompt from the Prompt Builder or write a quick snippet request to generate production-ready code in your favorite framework.
            </p>
            <GlassCard className="p-6 max-w-4xl mx-auto w-full flex-grow flex flex-col">
                <div className="flex border-b border-glass-border mb-4">
                    <button onClick={() => setActiveTab('full-app')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'full-app' ? 'border-b-2 border-accent-blue text-white' : 'text-text-secondary'}`}>Full App Prompt</button>
                    <button onClick={() => setActiveTab('quick-snippet')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'quick-snippet' ? 'border-b-2 border-accent-blue text-white' : 'text-text-secondary'}`}>Quick Snippet</button>
                </div>
                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={activeTab === 'full-app' ? "Paste your detailed prompt from the Prompt Builder here..." : "e.g., A responsive navbar in React with Tailwind CSS"}
                    className="w-full flex-1 p-3 bg-white/10 rounded-lg border-transparent focus:border-accent-blue focus:outline-none resize-none"
                />
                <div className="flex items-center justify-between mt-4">
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="bg-white/10 rounded-lg p-2.5 text-sm">
                        <option>HTML</option>
                        <option>React</option>
                        <option>Vue</option>
                    </select>
                    <Button onClick={handleGenerate} className="btn-primary">
                        Generate Code
                    </Button>
                </div>
            </GlassCard>
        </div>
    );
};


const GeneratorView: FC = () => {
    const { deductCredits, checkCredits, showToast, showModal, navigateTo, hideModal, savePrompt } = useAppContext();
    const [prompt, setPrompt] = useState('');
    const [persona, setPersona] = useState('Helpful Assistant');
    const [tone, setTone] = useState('Neutral');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) { showToast("Please enter a prompt."); return; }
         if (!checkCredits()) { 
             showModal(
                <div>
                    <h2 className="text-xl font-bold mb-4">Out of Credits</h2>
                    <p className="text-text-secondary mb-6">Please purchase more credits to use the generator.</p>
                    <Button onClick={() => { navigateTo('store'); hideModal(); }} className="btn-primary w-full">Go to Store</Button>
                </div>
            );
            return; 
        }
        setIsLoading(true);
        setResponse('');
        try {
            deductCredits(1);
            const result = await GeminiService.generateGeneralText(prompt, persona, tone);
            setResponse(result);
        } catch(error) {
            showToast("Failed to generate response. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-4">General Prompt Generator</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="p-6 flex flex-col">
                    <h2 className="text-xl font-semibold mb-2">Your Prompt</h2>
                     <textarea 
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="What do you want to create?"
                        className="w-full flex-1 p-3 bg-white/10 rounded-lg border-transparent focus:border-accent-blue focus:outline-none resize-none"
                    />
                    <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">Advanced Options</h3>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Persona</label>
                                <select value={persona} onChange={e => setPersona(e.target.value)} className="w-full bg-white/10 rounded-lg p-2.5 text-sm">
                                    <option>Helpful Assistant</option>
                                    <option>Expert Developer</option>
                                    <option>Creative Writer</option>
                                    <option>Marketing Guru</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Tone</label>
                                <select value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-white/10 rounded-lg p-2.5 text-sm">
                                    <option>Neutral</option>
                                    <option>Formal</option>
                                    <option>Casual</option>
                                    <option>Humorous</option>
                                </select>
                            </div>
                        </div>
                    </div>
                     <Button onClick={handleGenerate} disabled={isLoading} className="btn-primary mt-6 w-full">
                        {isLoading ? <Spinner /> : "Generate"}
                    </Button>
                </GlassCard>
                 <GlassCard className="p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-semibold">Generated Response</h2>
                        {response && (
                             <div className="flex gap-2">
                                <Button onClick={() => copyToClipboard(response, showToast)} className="bg-white/10 !py-1 !px-3 text-xs flex items-center gap-1"><IconCopy className="h-3 w-3" /> Copy</Button>
                                <Button onClick={() => { savePrompt(prompt.substring(0, 30), response); showToast("Response Saved!")}} className="bg-white/10 !py-1 !px-3 text-xs flex items-center gap-1"><IconSave className="h-3 w-3" /> Save</Button>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 bg-black/30 rounded-lg overflow-auto p-4 text-text-secondary">
                        {isLoading ? <div className="flex items-center justify-center h-full"><Spinner className="h-8 w-8"/></div> : <p className="whitespace-pre-wrap">{response || 'Your generated text will appear here...'}</p>}
                    </div>
                 </GlassCard>
            </div>
        </div>
    );
};

const HistoryView: FC = () => {
    const { state, showToast, showModal, hideModal, deletePrompt } = useAppContext();
    
    const viewPrompt = (prompt: SavedPrompt) => {
        showModal(
            <div>
                <h2 className="text-xl font-bold mb-2">{prompt.title}</h2>
                <p className="text-xs text-text-secondary mb-4">{prompt.timestamp}</p>
                <div className="max-h-96 overflow-y-auto bg-black/20 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{prompt.prompt}</p>
                </div>
                <div className="mt-4 flex gap-2">
                    <Button onClick={() => {copyToClipboard(prompt.prompt, showToast); hideModal();}} className="btn-primary">Copy</Button>
                    <Button onClick={hideModal} className="bg-white/10">Close</Button>
                </div>
            </div>
        );
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Saved Prompts</h1>
            {state.savedPrompts.length === 0 ? (
                <GlassCard className="p-6 text-center">
                    <p className="text-text-secondary">You haven't saved any prompts yet.</p>
                </GlassCard>
            ) : (
                <div className="space-y-4">
                    {state.savedPrompts.map(p => (
                        <GlassCard key={p.id} className="p-4 flex justify-between items-center">
                            <div className="flex-1 cursor-pointer" onClick={() => viewPrompt(p)}>
                                <h2 className="font-semibold">{p.title}</h2>
                                <p className="text-xs text-text-secondary">{p.timestamp}</p>
                                <p className="mt-2 text-sm text-text-secondary truncate">{p.prompt}</p>
                            </div>
                            <div className="flex gap-2 ml-4">
                                <button onClick={() => copyToClipboard(p.prompt, showToast)} className="p-2 text-text-secondary hover:text-white"><IconCopy className="h-5 w-5"/></button>
                                <button onClick={() => deletePrompt(p.id)} className="p-2 text-text-secondary hover:text-red-400"><IconDelete className="h-5 w-5"/></button>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
};

const StoreView: FC = () => {
    const { addCredits, showToast } = useAppContext();
    const plans = [
        { credits: 50, price: 5, popular: false },
        { credits: 120, price: 10, popular: true },
        { credits: 300, price: 20, popular: false },
    ];
    return (
        <div>
            <h1 className="text-3xl font-bold mb-2 text-center">Buy Credits</h1>
            <p className="text-center text-text-secondary mb-8">Refill your credits to continue creating.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {plans.map((plan, i) => (
                    <GlassCard key={i} animated={plan.popular} className={`p-6 text-center flex flex-col ${plan.popular ? 'border-accent-blue' : ''}`}>
                        {plan.popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent-purple px-3 py-1 text-xs font-semibold rounded-full">MOST POPULAR</div>}
                        <h2 className="text-2xl font-bold">{plan.credits} Credits</h2>
                        <p className="text-4xl font-bold my-4">${plan.price}</p>
                        <p className="text-text-secondary text-sm mb-6 flex-grow">Perfect for getting started and exploring all features.</p>
                        <Button onClick={() => { addCredits(plan.credits); showToast(`${plan.credits} credits added!`)}} className={plan.popular ? "btn-primary w-full" : "bg-white/10 w-full"}>Purchase</Button>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
};


// ========= 7. MAIN APP COMPONENT =========

const App: FC = () => {
  const [state, setState] = useState<AppState>({
    currentView: 'landing',
    currentUser: null,
    userCredits: 0,
    savedPrompts: [],
    currentChatHistory: [],
    promptForCodeBuilder: null,
    chatSettings: {
        persona: 'Helpful Assistant',
        tone: 'Neutral',
        temperature: 0.7,
    },
  });

  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  const [modal, setModal] = useState<{ content: ReactNode; show: boolean }>({ content: null, show: false });

  useEffect(() => {
    try {
        const savedState = localStorage.getItem('aiPromptForgeState');
        if (savedState) {
            const parsedState: AppState = JSON.parse(savedState);
            if (parsedState.currentUser) {
                // Ensure chatSettings has defaults if not present in older saved state
                const chatSettings = parsedState.chatSettings || { persona: 'Helpful Assistant', tone: 'Neutral', temperature: 0.7 };
                setState({ ...parsedState, chatSettings, currentView: 'dashboard', promptForCodeBuilder: null });
            }
        }
    } catch(e) {
        console.error("Could not parse saved state:", e);
        localStorage.removeItem('aiPromptForgeState');
    }
  }, []);

  useEffect(() => {
    const serializableState: Omit<AppState, 'promptForCodeBuilder'> = {
      currentView: state.currentView,
      currentUser: state.currentUser,
      userCredits: state.userCredits,
      savedPrompts: state.savedPrompts,
      currentChatHistory: state.currentChatHistory,
      chatSettings: state.chatSettings
    };
    localStorage.setItem('aiPromptForgeState', JSON.stringify(serializableState));
  }, [state]);

  const navigateTo = (view: View) => setState(s => ({ ...s, currentView: view }));
  
  const login = (user: User) => {
    setState(s => ({ ...s, currentUser: user, userCredits: s.userCredits > 0 ? s.userCredits : 20, currentView: 'dashboard' }));
  };

  const logout = () => {
    setState(s => ({ ...s, currentUser: null, currentView: 'landing', currentChatHistory: [] }));
  };

  const addCredits = (amount: number) => {
    setState(s => ({ ...s, userCredits: s.userCredits + amount }));
  };
  
  const deductCredits = (amount: number) => {
    if (state.userCredits < amount) return false;
    setState(s => ({ ...s, userCredits: s.userCredits - amount }));
    return true;
  };

  const checkCredits = () => state.userCredits > 0;

  const savePrompt = (title: string, prompt: string) => {
    const newPrompt: SavedPrompt = {
        id: Date.now().toString(),
        title,
        prompt,
        timestamp: new Date().toLocaleString()
    };
    setState(s => ({...s, savedPrompts: [newPrompt, ...s.savedPrompts]}));
  };
  
  const deletePrompt = (id: string) => {
      setState(s => ({...s, savedPrompts: s.savedPrompts.filter(p => p.id !== id)}));
  };

  const setChatHistory = (history: Content[] | ((prevState: Content[]) => Content[])) => {
    setState(prevState => ({
      ...prevState,
      currentChatHistory: typeof history === 'function' ? history(prevState.currentChatHistory) : history,
    }));
  };

  const setPromptForCodeBuilder = (prompt: string) => {
    setState(s => ({ ...s, promptForCodeBuilder: prompt }));
  };

  const updateChatSettings = (settings: ChatSettings) => {
    setState(s => ({ ...s, chatSettings: settings }));
    showToast("Chat settings saved!");
  };

  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), 3000);
  };

  const showModal = (content: ReactNode) => setModal({ content, show: true });
  const hideModal = useCallback(() => setModal({ content: null, show: false }), []);

  const renderView = () => {
    if (!state.currentUser) return <LandingView />;
    switch (state.currentView) {
      case 'dashboard': return <DashboardView />;
      case 'chat': return <ChatView />;
      case 'prompt-builder': return <PromptBuilderView />;
      case 'code-builder': return <CodeBuilderView />;
      case 'generator': return <GeneratorView />;
      case 'history': return <HistoryView />;
      case 'store': return <StoreView />;
      default: return <DashboardView />;
    }
  };

  const contextValue: AppContextType = {
    state,
    navigateTo,
    login,
    logout,
    addCredits,
    deductCredits,
    checkCredits,
    savePrompt,
    deletePrompt,
    setChatHistory,
    setPromptForCodeBuilder,
    updateChatSettings,
    showToast,
    showModal,
    hideModal,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {state.currentUser ? <Layout>{renderView()}</Layout> : renderView()}
      <Toast message={toast.message} show={toast.show} />
      <Modal show={modal.show} onClose={hideModal}>{modal.content}</Modal>
    </AppContext.Provider>
  );
};

export default App;
