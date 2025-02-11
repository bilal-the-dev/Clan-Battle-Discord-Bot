const {
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const { CommandType } = require("wokcommands");
const Clans = require("../models/Clans");
const Matches = require("../models/Matches");
const { handleInteractionError } = require("../utils/interaction");
const { updateClanTracker } = require("../utils/msic");

module.exports = {
  description: "Manage clan matches",
  type: CommandType.SLASH,
  guildOnly: true,

  options: [
    {
      name: "initiate",
      description: "Start a match against another clan",
      type: 1,
      options: [
        {
          name: "clan",
          description: "The opposing clan to challenge",
          type: 3,
          required: true,
          autocomplete: true,
        },
      ],
    },
    {
      name: "announce",
      description: "[ADMIN] Declare the winning clan",
      type: 1,
      options: [
        {
          name: "clan",
          description: "The winning clan",
          type: 3,
          required: true,
          autocomplete: true,
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
      const { guild, user, options, channel, member } = interaction;

      const subcommand = options.getSubcommand();
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const targetClanId = options.getString("clan");

      if (subcommand === "initiate") {
        const userClan = await Clans.findOne({
          members: user.id,
        });

        if (!userClan)
          throw new Error("You must be in a clan to initiate a match.");

        const opponentClan = await Clans.findById(targetClanId);

        if (!opponentClan)
          throw new Error("The specified clan does not exist.");

        if (userClan._id.toString() === opponentClan._id.toString())
          throw new Error("You cannot challenge your own clan.");

        const matchChannel = await guild.channels.create({
          name: `${userClan.clanName}-vs-${opponentClan.clanName}`.slice(
            0,
            100
          ),
          parent: process.env.MATCH_CATEGORY_ID,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: userClan.clanAssociatedRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
            {
              id: opponentClan.clanAssociatedRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
            },
          ],
        });

        await matchChannel.send(`@everyone lets match!`);

        await Matches.create({
          guildId: guild.id,
          clan1: userClan._id,
          clan2: opponentClan._id,
          matchChannelId: matchChannel.id,
        });

        await interaction.editReply({
          content: `Match channel created: ${matchChannel}`,
        });
      }

      if (subcommand === "announce") {
        if (!member.permissions.has(PermissionFlagsBits.Administrator))
          throw new Error("Only admins can use this command.");

        const match = await Matches.findOne({
          matchChannelId: channel.id,
        });

        if (!match)
          throw new Error(
            "This command must be used in an active match channel."
          );

        const losingClanName =
          match.clan1 === targetClanId ? match.clan2 : match.clan1;

        const winnerClan = await Clans.findByIdAndUpdate(
          targetClanId,
          { $inc: { points: 10, matchesWon: 1 } },
          { new: true }
        );

        await Clans.findByIdAndUpdate(losingClanName, {
          $inc: { matchesLost: 1 },
        });

        await match.deleteOne();

        await channel.send(
          `🏆 **${winnerClan.clanName}** wins the match! 🎉. The channel will be deleted after 1 minute`
        );

        setTimeout(() => {
          channel.delete().catch(console.error);
        }, 60000);

        await interaction.editReply({
          content: `Match concluded! ${winnerClan.clanName} wins!`,
        });

        await updateClanTracker(interaction.client, interaction.guildId);
      }
    } catch (error) {
      handleInteractionError(interaction, error);
    }
  },
};
