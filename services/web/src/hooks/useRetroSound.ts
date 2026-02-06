import useSound from 'use-sound';

// You would need actual sound files in public/sounds/
// For now, we'll setup the hook structure
// - click.mp3
// - hover.mp3
// - type.mp3

export const useRetroSound = () => {
  const [playClick] = useSound('/sounds/click.mp3', { volume: 0.5 });
  const [playHover] = useSound('/sounds/hover.mp3', { volume: 0.1 });
  const [playType] = useSound('/sounds/type.mp3', { volume: 0.25 });

  return {
    playClick,
    playHover,
    playType,
  };
};
