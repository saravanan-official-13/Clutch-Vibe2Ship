import { useStore } from './store';
import { Landing } from './components/landing/Landing';
import { Workspace } from './components/workspace/Workspace';

export default function App() {
  const view = useStore((s) => s.view);
  return view === 'landing' ? <Landing /> : <Workspace />;
}
