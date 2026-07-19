import { availableMonitors, currentMonitor } from '@tauri-apps/api/window';

export interface ScreenPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Returns where to put a new window so it lands full-size on a *different* display than the
// one the caller is on, or null if there isn't one / monitor info can't be read.
export async function getSecondaryScreenPlacement(): Promise<ScreenPlacement | null> {
  try {
    const current = await currentMonitor();
    const monitors = await availableMonitors();
    const other = monitors.find(
      (monitor) =>
        !current ||
        monitor.position.x !== current.position.x ||
        monitor.position.y !== current.position.y,
    );
    if (!other) return null;
    const position = other.position.toLogical(other.scaleFactor);
    const size = other.size.toLogical(other.scaleFactor);
    return { left: position.x, top: position.y, width: size.width, height: size.height };
  } catch {
    return null;
  }
}
