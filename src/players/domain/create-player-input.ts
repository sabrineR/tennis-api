import type { Country, PlayerData } from './player.ts';

export interface CreatePlayerInput {
  firstname: string;
  lastname: string;
  shortname: string;
  sex: 'M' | 'F';
  country: Country;
  picture: string;
  data: PlayerData;
}
