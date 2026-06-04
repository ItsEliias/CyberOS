import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import TabBar from './TabBar';
import ChatPanel from './ChatPanel';
import CommandBuilder from './CommandBuilder';
import ReverseShell from './ReverseShell';
import Encoder from './Encoder';
import Cheatsheets from './Cheatsheets';
import Snippets from './Snippets';
import LabTracker from './LabTracker';
import Progress from './Progress';
import WriteupPanel from './WriteupPanel';
import SettingsPanel from './SettingsPanel';
import FindingsTable from './findings/FindingsTable';
import LabHistory from './history/LabHistory';
import SessionPanel from './session/SessionPanel';
import KnowledgeBase from './KnowledgeBase';
import StatsView from './StatsView';

interface MainLayoutProps {
  onHelp?: () => void
}

export default function MainLayout({ onHelp }: MainLayoutProps) {
  const { tabs, activeTabId } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activePanel = activeTab?.activePanel || 'chat';
  const hasActiveSession = !!(activeTab?.session?.labName && activeTab.session.labName !== 'New Session');

  // For the chat view, show the spec's split layout: SessionPanel (320px) + ChatPanel (flex-1)
  // For other panels, show full-width in main area (session panel still visible for context)
  const showSessionPanel = hasActiveSession;

  const panels: Record<string, React.ReactNode> = {
    chat:         <ChatPanel />,
    commands:     <CommandBuilder />,
    reverseshell: <ReverseShell />,
    encoder:      <Encoder />,
    cheatsheets:  <Cheatsheets />,
    snippets:     <Snippets />,
    labtracker:   <LabTracker />,
    progress:     <Progress />,
    writeup:       <WriteupPanel />,
    settings:      <SettingsPanel />,
    findings:      <FindingsTable />,
    history:       <LabHistory />,
    knowledgebase: <KnowledgeBase />,
    stats:         <StatsView />,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header onHelp={onHelp} />
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main content area: session panel + active panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Session info panel — always visible when a session is active */}
          {showSessionPanel && <SessionPanel />}

          {/* Active panel */}
          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePanel}
                className="h-full"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {panels[activePanel] || <ChatPanel />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
