import React from 'react';
import GirlsRoom from './rooms/GirlsRoom';
import BareRoom from './rooms/BareRoom';

export type RoomTheme = 'girls' | 'boys' | 'bare';

interface RoomProps {
  theme: RoomTheme;
}

export default function Room({ theme }: RoomProps) {
  switch (theme) {
    case 'girls':
      return <GirlsRoom />;
    case 'boys':
    case 'bare':
    default:
      return <BareRoom />;
  }
}
