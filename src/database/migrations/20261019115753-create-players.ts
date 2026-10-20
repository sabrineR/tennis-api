import { DataTypes } from 'sequelize';
import type { QueryInterface } from 'sequelize';
import type { MigrationFn } from 'umzug';

export const up: MigrationFn<QueryInterface> = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.createTable(
      'players',
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
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
      { transaction },
    );
    await context.addIndex('players', ['rank', 'id'], {
      name: 'players_rank_id_idx',
      transaction,
    });
  });
};

export const down: MigrationFn<QueryInterface> = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('players', { transaction });
  });
};
