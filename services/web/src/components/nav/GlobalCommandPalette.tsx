import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Terminal, Settings, Mail, LogOut, Code, User, FileText } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './CommandPalette';
import { useCommandStore } from '@/store/useCommandStore';

export const GlobalCommandPalette = () => {
  const navigate = useNavigate();
  const { isOpen, setOpen, toggle } = useCommandStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggle]);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, [setOpen]);

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <Home className="mr-2 h-4 w-4" />
            <span>Home</span>
            <CommandShortcut>G H</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/inbox'))}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Inbox</span>
            <CommandShortcut>G I</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="System">
          <CommandItem onSelect={() => runCommand(() => console.log('Terminal'))}>
            <Terminal className="mr-2 h-4 w-4" />
            <span>Open Terminal</span>
            <CommandShortcut>⌘ T</CommandShortcut>
          </CommandItem>
           <CommandItem onSelect={() => runCommand(() => console.log('Logs'))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>View System Logs</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
