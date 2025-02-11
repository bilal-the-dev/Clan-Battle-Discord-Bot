const { MessageFlags } = require("discord.js");
const { CommandType } = require("wokcommands");
const { handleInteractionError } = require("../utils/interaction");
const Clans = require("../models/Clans");
const { sendMessageInClanLogsChannel } = require("../utils/notify");
const { updateClanTracker } = require("../utils/msic");
const {
  generateEmbed,
  generateAcceptDenyButtons,
} = require("../utils/components");

module.exports = {
  description: "Clan management commands",
  type: CommandType.SLASH,
  guildOnly: true,

  options: [
    {
      name: "add_member",
      description: "Add a member to a clan",
      type: 1,
      options: [
        {
          name: "member",
          description: "The member to remove",
          type: 6,
          required: true,
        },
      ],
    },
    {
      name: "kick",
      description: "Remove a member from a clan",
      type: 1,
      options: [
        {
          name: "member",
          description: "The member to remove",
          type: 6,
          required: true,
        },
      ],
    },
    {
      name: "promote_vc",
      description: "Promote a member to Vice Captain (VC)",
      type: 1,
      options: [
        {
          name: "member",
          description: "The member to promote",
          type: 6,
          required: true,
        },
      ],
    },
    {
      name: "remove_vc",
      description: "None will be vc anymore",
      type: 1,
    },
  ],

  async callback({ interaction, client }) {
    try {
      const { options, user, guild } = interaction;
      const subcommand = options.getSubcommand();
      const member = options.getMember("member");

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const filter = [{ clanLeaderId: user.id }];

      if (subcommand === "kick" || subcommand === "add_member")
        filter.push({ clanVcId: user.id });

      const clan = await Clans.findOne({
        $or: filter,
      });

      if (!clan) throw new Error("You do not have perms to perform the action");

      if (subcommand !== "add_member" && !clan.members.includes(member.id))
        throw new Error(`${member.displayName} is not a part of your clan.`);

      if (subcommand === "kick") {
        if (member.id === user.id)
          throw new Error("You can not kick yourselves");
        if (member.id === clan.clanLeaderId)
          throw new Error("You can not kick clan leader");

        const updateData = { $pull: { members: member.id } };

        if (clan.clanVcId === member.id) updateData.clanVcId = null;

        await member.roles.remove(clan.clanAssociatedRoleId);
        await clan.updateOne(updateData);

        await sendMessageInClanLogsChannel(
          client,
          `${member} has been kicked from the clan **${
            clan.clanName
          }**. Current members: ${clan.members.length - 1}`
        );

        await interaction.editReply({
          content: `Successfully removed ${member} from **${clan.clanName}**.`,
        });

        await updateClanTracker(interaction.client, interaction.guildId);
      }
      if (subcommand === "add_member") {
        if (member.id === user.id)
          throw new Error("You can not add yourselves");

        if (clan.members.length === 10)
          throw new Error(
            "Your clan has max members already, kick someone to add new member"
          );

        const userClan = await Clans.exists({ members: member.id });

        if (userClan)
          throw new Error(
            `${member.displayName} is already a member of some other clan`
          );

        const embed = generateEmbed({
          title: "Clan Join Request 🔔",
          description:
            `<@${user.id}> has requested to add you to their clan **${clan.clanName}**.\n\n` +
            `Please review the details carefully before accepting the request!`,
          thumbnail: member.displayAvatarURL(),
        });

        const row = generateAcceptDenyButtons(
          `memberAcceptJoin:${guild.id}:${clan._id}`,
          `memberDenyJoin:${user.id}:${clan._id}`
        );

        await member.send({ embeds: [embed], components: [row] });

        await interaction.editReply({
          content: `Successfully sent invite to ${member}.`,
        });

        await updateClanTracker(interaction.client, interaction.guildId);
      }

      if (subcommand === "promote_vc") {
        await clan.updateOne({ clanVcId: member.id });

        const clanChannel = guild.channels.cache.get(
          clan.clanAssociatedChannelId
        );

        await clanChannel.send(
          `${member} has been promoted to Vice Captain (VC) of **${clan.clanName}** 🎖️`
        );

        await interaction.editReply({
          content: `${member} has been successfully promoted to Vice Captain (VC) of **${clan.clanName}**.`,
        });
      }
      if (subcommand === "remove_vc") {
        await clan.updateOne({ clanVcId: null });

        await interaction.editReply({
          content: `${
            clan.clanVcId ? `<@${clan.clanVcId}>` : "None"
          } was vc before and now is none.`,
        });
      }
    } catch (error) {
      handleInteractionError(interaction, error);
    }
  },
};
