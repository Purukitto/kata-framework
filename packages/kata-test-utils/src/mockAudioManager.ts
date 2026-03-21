import type { AudioCommand } from "@kata-framework/core";

export interface MockAudioResult {
  handler: (command: AudioCommand) => void;
  commands: AudioCommand[];
  lastCommand: () => AudioCommand | undefined;
  reset: () => void;
}

export function mockAudioManager(): MockAudioResult {
  const commands: AudioCommand[] = [];

  const handler = (command: AudioCommand) => {
    commands.push(command);
  };

  return {
    handler,
    commands,
    lastCommand: () => commands[commands.length - 1],
    reset: () => {
      commands.length = 0;
    },
  };
}
