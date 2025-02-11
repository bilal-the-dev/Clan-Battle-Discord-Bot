const {
  MessageFlags,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { CommandType } = require("wokcommands");

const { handleInteractionError } = require("../utils/interaction");
const Clans = require("../models/Clans");
const { updateClanTracker } = require("../utils/msic");

module.exports = {
  description: "Scoreboard management commands",
  type: CommandType.SLASH,
  guildOnly: true,

  options: [
    {
      name: "show",
      description: "Show the clan leaderboard based on points",
      type: 1,
    },
    {
      name: "set",
      description: "[ADMIN] Set a clan's points",
      type: 1,
      options: [
        {
          name: "clan",
          description: "The clan name",
          type: 3,
          autocomplete: true,
          required: true,
        },
        {
          name: "amount",
          description: "The amount of points to set",
          type: 4,
          required: true,
        },
      ],
    },
    {
      name: "reset",
      description: "[ADMIN] Reset a clan's points",
      type: 1,
      options: [
        {
          name: "clan",
          description: "The clan name",
          type: 3,
          autocomplete: true,
          required: true,
        },
      ],
    },
  ],

  async autocomplete() {
    try {
      const clans = await Clans.find();

      return clans.map((c) => ({ name: c.clanName, value: c._id }));
    } catch (error) {
      console.log(error);
    }
  },

  async callback({ interaction }) {
    try {
      const { options, member } = interaction;
      const subcommand = options.getSubcommand();
      const clan = options.getString("clan");
      const amount = options.getInteger("amount");

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (subcommand === "show") {
        const clans = await Clans.find({}).sort({ points: "descending" });

        if (!clans.length)
          throw new Error("No clans found on the leaderboard.");

        const embed = new EmbedBuilder()
          .setTitle("🏆 Clan Leaderboard")
          .setColor("#FFD700")
          .setDescription(
            clans
              .map(
                (c, i) =>
                  `**${i + 1}. ${c.clanName}** ${
                    c.points
                  } points 🏅\n> 🏆 Won: ${c.matchesWon} ❌ Lost: ${
                    c.matchesLost
                  }`
              )
              .join("\n\n")
          );

        return await interaction.editReply({ embeds: [embed] });
      }

      if (!member.permissions.has(PermissionFlagsBits.Administrator))
        throw new Error("Only admins can use this command.");

      let pointsToSet = 0;

      if (subcommand === "set") pointsToSet = amount;

      const a = await Clans.findByIdAndUpdate(clan, { points: pointsToSet });
      console.log(a);

      await interaction.editReply(
        `Successfully set points to **${pointsToSet}**.`
      );

      await updateClanTracker(interaction.client, interaction.guildId);
    } catch (error) {
      handleInteractionError(interaction, error);
    }
  },
};
