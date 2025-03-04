const { PermissionFlagsBits } = require("discord.js");
const { CommandType } = require("wokcommands");
const Clans = require("../models/Clans");
const { handleInteractionError } = require("../utils/interaction");
const { updateClanTracker } = require("../utils/msic");
const { sendMessageInClanLogsChannel } = require("../utils/notify");

module.exports = {
  description: "[ADMIN ONLY] Disband a clan",
  type: CommandType.SLASH,
  guildOnly: true,
  permissions: [PermissionFlagsBits.Administrator],

  options: [
    {
      name: "clan",
      description: "The clan to disband",
      type: 3,
      required: true,
      autocomplete: true,
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
      const { guild, user, options, client } = interaction;

      await interaction.deferReply();

      const targetClanId = options.getString("clan");

      const clan = await Clans.findById(targetClanId);

      if (!clan) throw new Error("No clan found with that id");

      const clanRole = guild.roles.cache.get(clan.clanAssociatedRoleId);
      const clanChannel = guild.channels.cache.get(
        clan.clanAssociatedChannelId
      );

      if (clanRole) await clanRole.delete();

      if (clanChannel) await clanChannel.delete();

      await clan.deleteOne();

      await sendMessageInClanLogsChannel(
        client,
        `Clan **${
          clan.clanName
        }** has been disbanded by ${user}. Members of the clan were ${clan.members
          .map((m) => `<@${m}>`)
          .join(", ")}`
      );

      await interaction.editReply("Clan has been disbanded!");
      await updateClanTracker(interaction.client, interaction.guildId);
    } catch (error) {
      handleInteractionError(interaction, error);
    }
  },
};
