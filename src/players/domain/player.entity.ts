import type { Country, PlayerData } from './player.ts';

export class Player {
  constructor(
    public id: number,
    public firstname: string,
    public lastname: string,
    public shortname: string,
    public sex: 'M' | 'F',
    public country: Country,
    public picture: string,
    public data: PlayerData,
  ) {}

  getWinRatio(): number {
    if (this.data.last.length === 0) {
      return 0;
    }

    const wins = this.data.last.filter((result) => result === 1).length;
    return wins / this.data.last.length;
  }
}
