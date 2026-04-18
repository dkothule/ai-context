import pc from 'picocolors';

export const log = {
  /** → step being performed */
  step: (msg: string) => console.log(pc.cyan('  →'), msg),
  /** ✓ step completed successfully */
  done: (msg: string) => console.log(pc.green('  ✓'), msg),
  /** ⊘ step skipped */
  skip: (msg: string) => console.log(pc.yellow('  ⊘'), msg),
  /** ! warning (non-fatal) */
  warn: (msg: string) => console.log(pc.yellow('  !'), pc.yellow(msg)),
  /** ✗ error */
  error: (msg: string) => console.error(pc.red('  ✗'), pc.red(msg)),
  /** Bold section heading */
  heading: (msg: string) => console.log('\n' + pc.bold(msg)),
  /** Separator line */
  rule: () => console.log(pc.dim('  ' + '─'.repeat(45))),
  /** Plain info line */
  info: (msg: string) => console.log('  ' + msg),
  /** Empty line */
  blank: () => console.log(),
};
