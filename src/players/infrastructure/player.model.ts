import { DataTypes, Model } from 'sequelize';
import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
} from 'sequelize';

export class PlayerModel extends Model<
  InferAttributes<PlayerModel>,
  InferCreationAttributes<PlayerModel>
> {
  declare id: CreationOptional<number>;
  declare firstname: string;
  declare lastname: string;
  declare shortname: string;
  declare sex: 'M' | 'F';
  declare countryCode: string;
  declare countryPicture: string;
  declare picture: string;
  declare rank: number;
  declare points: number;
  declare weight: number;
  declare height: number;
  declare age: number;
  declare last: (0 | 1)[];

  static initialize(sequelize: Sequelize): typeof PlayerModel {
    PlayerModel.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        firstname: { type: DataTypes.TEXT, allowNull: false },
        lastname: { type: DataTypes.TEXT, allowNull: false },
        shortname: { type: DataTypes.TEXT, allowNull: false },
        sex: { type: DataTypes.STRING(1), allowNull: false },
        countryCode: { type: DataTypes.TEXT, allowNull: false },
        countryPicture: { type: DataTypes.TEXT, allowNull: false },
        picture: { type: DataTypes.TEXT, allowNull: false },
        rank: { type: DataTypes.INTEGER, allowNull: false },
        points: { type: DataTypes.INTEGER, allowNull: false },
        weight: { type: DataTypes.INTEGER, allowNull: false },
        height: { type: DataTypes.INTEGER, allowNull: false },
        age: { type: DataTypes.INTEGER, allowNull: false },
        last: { type: DataTypes.ARRAY(DataTypes.INTEGER), allowNull: false },
      },
      {
        sequelize,
        tableName: 'players',
        modelName: 'Player',
        timestamps: false,
      },
    );
    return PlayerModel;
  }
}
