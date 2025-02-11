const { TextInputBuilder } = require("@discordjs/builders");
const { StringSelectMenuBuilder } = require("@discordjs/builders");
const { ModalBuilder } = require("@discordjs/builders");
const { RoleSelectMenuBuilder } = require("discord.js");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextInputStyle,
} = require("discord.js");

exports.generateEmbed = ({ description, title, thumbnail }) => {
  const embed = new EmbedBuilder().setColor(0x00ae86);

  title && embed.setTitle(title);
  description && embed.setDescription(description);
  thumbnail && embed.setThumbnail(thumbnail);

  return embed;
};

exports.generateClanEmbed = () => {
  const embed = this.generateEmbed({
    title: "🏆 Clan List",
    description: "Soon to be updated",
  });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("button:clan:create")
      .setLabel("Create Clan")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("button:clan:join")
      .setLabel("Join Clan")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("button:clan:leave")
      .setLabel("Leave Clan")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("button:clan:disband")
      .setLabel("Disband Clan")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [buttons] };
};

exports.generateClanNameAskModal = (uniqueId) => {
  const modal = new ModalBuilder()
    .setCustomId(`modal:clan:name_ask:${uniqueId}`)
    .setTitle("Clan Name");

  const name = new TextInputBuilder()
    .setCustomId("clanName")
    .setLabel("Enter Your Clan Name")
    .setStyle(TextInputStyle.Short);

  const description = new TextInputBuilder()
    .setCustomId("clanDescription")
    .setLabel("Enter Short Clan Description")
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const firstRow = new ActionRowBuilder().addComponents(name);
  const secondRow = new ActionRowBuilder().addComponents(description);

  modal.addComponents(firstRow, secondRow);

  return modal;
};

exports.generateAcceptDenyButtons = (acceptId, denyId) => {
  const acceptButton = new ButtonBuilder()
    .setCustomId(`button:clan:${acceptId}`)
    .setLabel("Accept")
    .setStyle(ButtonStyle.Success);

  const denyButton = new ButtonBuilder()
    .setCustomId(`button:clan:${denyId}`)
    .setLabel("Deny")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(acceptButton, denyButton);
  return row;
};

exports.generateRoleMenu = () => {
  return new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder().setCustomId("menu:clan:ask_clan_role")
  );
};

exports.generateDynamicStringMenu = (customId, options) => {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder("Make a selection!")
      .addOptions(...options)
  );
};
