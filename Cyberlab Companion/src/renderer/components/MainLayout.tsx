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
import TimerHUD from './TimerHUD';

export default function MainLayout() {
  const { tabs, activeTabId } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activePanel = activeTab?.activePanel || 'chat';
  const hasActiveSession = !!(activeTab?.session?.labName && activeTab.session.labName !== 'New Session');

  const panels: Record<string, React.ReactNode> = {
    chat:         <ChatPanel />,
    commands:     <CommandBuilder />,
    reverseshell: <ReverseShell />,
    encoder:      <Encoder />,
    cheatsheets:  <Cheatsheets />,
    snippets:     <Snippets />,
    labtracker:   <LabTracker />,
    progress:     <Progress />,
    writeup:      <WriteupPanel />,
    settings:     <SettingsPanel />,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
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
      <Footer />
      {/* Timer HUD — floating pill, top-right of main content */}
      {hasActiveSession && (
        <div className="fixed top-16 right-4 z-40">
          <TimerHUD />
        </div>
      )}
    </div>
  );
}
