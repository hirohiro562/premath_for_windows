import { usePresentationState } from './lib/hooks';
import { UploadScreen } from './components/UploadScreen';
import { PresentationView } from './components/PresentationView';
import { PresenterView } from './components/PresenterView';
import { JoinScreen } from './components/JoinScreen';
import './App.css';

function App() {
  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get('join');
  const isPresenterWindow = params.has('presenter');
  const state = usePresentationState();

  if (joinCode) {
    return <JoinScreen sessionCode={joinCode} />;
  }

  if (isPresenterWindow) {
    return <PresenterView />;
  }

  return state.pdfBlobUrl ? <PresentationView /> : <UploadScreen />;
}

export default App;
