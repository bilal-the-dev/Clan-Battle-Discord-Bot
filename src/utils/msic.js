const { EmbedBuilder } = require("discord.js");

const GeneralData = require("../models/GeneralData");
const Clans = require("../models/Clans");

exports.updateClanTracker = async (client, guildId) => {
  try {
    const generalData = await GeneralData.findOne({ guildId });
    if (!generalData) throw new Error("No general data doc for the guild");

    const { clanTrackerChannelId, clanTrackerMessageId } = generalData;
    if (!clanTrackerChannelId || !clanTrackerMessageId)
      throw new Error("Clan tracker message or channel not set.");

    const channel = await client.channels.cache.get(clanTrackerChannelId);
    if (!channel) throw new Error("Clan tracker channel not found.");

    const message = await channel.messages.fetch(clanTrackerMessageId);

    const clans = await Clans.find({ guildId }).sort({ points: "descending" }).limit(10)

    const embed = new EmbedBuilder()
      .setTitle("🏆 Clan List")
      .setColor("#FFD700")
      .setDescription(
        clans
          .map(
            (c, i) =>
              `> **${i + 1}. ${c.clanName}** ${
                c.points
              } points 🏅\n> **Members:** ${
                c.members.length > 0
                  ? c.members.map((m) => `<@${m}>`).join(", ")
                  : "No members"
              }`
          )
          .join("\n\n") || "Start creating clans and joining them!"
      );

    await message.edit({ embeds: [embed] });
  } catch (error) {
    console.error(error);
  }
};
