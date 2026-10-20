export interface Country {
  picture: string;
  code: string;
}

export interface PlayerData {
  rank: number;
  points: number;
  weight: number;
  height: number;
  age: number;
  last: (0 | 1)[];
}
