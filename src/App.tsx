import { useState } from 'react';
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
  // No second monitor to open a real presenter window on: swap the presenter view into this
  // same window instead of letting it float over the fullscreen presentation on one screen.
  const [singleScreenPresenter, setSingleScreenPresenter] = useState(false);

  if (joinCode) {
    return <JoinScreen sessionCode={joinCode} />;
  }

  if (isPresenterWindow) {
    return <PresenterView />;
  }

  if (!state.pdfBlobUrl) {
    return <UploadScreen />;
  }

  return singleScreenPresenter ? (
    <PresenterView singleScreenMode onExitSingleScreen={() => setSingleScreenPresenter(false)} />
  ) : (
    <PresentationView onPresenterFallback={() => setSingleScreenPresenter(true)} />
  );
}

export default App;
