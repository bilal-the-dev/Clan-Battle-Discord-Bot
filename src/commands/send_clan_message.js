const { PermissionFlagsBits, MessageFlags } = require("discord.js");
const { CommandType } = require("wokcommands");

const { handleInteractionError } = require("../utils/interaction");
const GeneralData = require("../models/GeneralData");
const { generateClanEmbed } = require("../utils/components");
const { updateClanTracker } = require("../utils/msic");

module.exports = {
  description: "[ADMIN] sends a message that will track clan info!",
  async callback({ interaction }) {
    try {
      const m = await interaction.channel.send(generateClanEmbed());

      await GeneralData.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          guildId: interaction.guildId,
          clanTrackerMessageId: m.id,
          clanTrackerChannelId: interaction.channelId,
        },
        { upsert: true }
      );

      await interaction.reply({
        content: "Sent!",
        flags: MessageFlags.Ephemeral,
      });

      await updateClanTracker(interaction.client, interaction.guildId);
    } catch (error) {
      handleInteractionError(interaction, error);
    }
  },

  guildOnly: true,
  type: CommandType.SLASH,
  permissions: [PermissionFlagsBits.Administrator],
};
