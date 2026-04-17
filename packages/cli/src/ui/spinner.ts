const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const INTERVAL_MS = 80;

export interface Spinner {
  stop: (finalMsg?: string) => void;
}

/**
 * Starts a terminal spinner. Only renders if stdout is a TTY.
 * Returns a { stop } handle to stop and optionally print a final message.
 */
export function startSpinner(msg: string): Spinner {
  if (!process.stdout.isTTY) {
    process.stdout.write(msg + '...\n');
    return { stop: (final) => { if (final) process.stdout.write(final + '\n'); } };
  }

  let i = 0;
  const render = () => {
    process.stdout.write(`\r  ${FRAMES[i++ % FRAMES.length]} ${msg}`);
  };

  render();
  const timer = setInterval(render, INTERVAL_MS);

  return {
    stop(finalMsg?: string) {
      clearInterval(timer);
      process.stdout.write('\r' + ' '.repeat(msg.length + 6) + '\r');
      if (finalMsg) process.stdout.write(finalMsg + '\n');
    },
  };
}
