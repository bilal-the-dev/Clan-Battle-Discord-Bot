const {
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

const Clans = require("../../models/Clans");
const {
  generateClanNameAskModal,
  generateEmbed,
  generateAcceptDenyButtons,
  generateDynamicStringMenu,
  //   generateRoleMenu,
} = require("../../utils/components");
const { handleInteractionError } = require("../../utils/interaction");
const {
  sendMessageInAdminChannel,
  sendMessageInClanLogsChannel,
} = require("../../utils/notify");
const { updateClanTracker } = require("../../utils/msic");

exports.handleClanCreate = async (interaction) => {
  const {
    guildId,
    user: { id: userId },
    client,
  } = interaction;

  const doc = await Clans.findOne({
    guildId,
    members: userId,
  });

  if (doc)
    throw new Error(
      `You are already the part of ${doc.clanName} (${doc.clanStatus}) clan, please leave/disband it first! `
    );

  const uniqueId = Date.now().toString();
  await interaction.showModal(generateClanNameAskModal(uniqueId));

  const filter = (i) =>
    i.user.id === userId && i.customId.endsWith(`:${uniqueId}`);

  // Catching error because it throws error when time is finished (timeout)
  const modalInteraction = await interaction
    .awaitModalSubmit({ filter, time: 1000 * 60 * 2 })
    .catch(() => null);

  if (!modalInteraction) return;

  try {
    await modalInteraction.deferReply({ flags: MessageFlags.Ephemeral });

    const clanName = modalInteraction.fields.getTextInputValue("clanName");
    const clanDescription =
      modalInteraction.fields.getTextInputValue("clanDescription");

    const nameExists = await Clans.exists({ clanName });

    if (nameExists)
      throw new Error(
        `Clan with the name ${clanName} already exists, be creative and try a different one!`
      );

    const createdClanDoc = await Clans.create({
      guildId,
      clanName,
      clanDescription,
      clanLeaderId: userId,
      members: [userId],
    });

    const embed = generateEmbed({
      title: "Clan Request 🔔",
      description:
        `> <@${userId}> has requested to create a new clan.\n\n` +
        `> **Clan Name:** ${clanName}\n` +
        `> **Leader:** <@${userId}>\n` +
        `> **Description:** ${clanDescription || "None"}\n\n` +
        `> **Accepting this request will:**\n` +
        `> - Create a role named **${clanName}** for the leader and their members.\n` +
        `> - Create a private channel where the leader can manage their clan.\n\n` +
        `Please review the details carefully before accepting the request! DM will be sent to leader on both actions.`,
      thumbnail: interaction.member.displayAvatarURL(),
    });

    const components = generateAcceptDenyButtons(
      `acceptCreate:${createdClanDoc._id}`,
      `denyCreate:${createdClanDoc._id}`
    );

    await sendMessageInAdminChannel(client, {
      embeds: [embed],
      components: [components],
    });

    await modalInteraction.editReply(
      "Great, your application to get clan approved has been sent to admins. If approved/denied, you will be notified in DMs"
    );
  } catch (error) {
    handleInteractionError(modalInteraction, error);
  }
  // This code was for when prompting users to select a role of their choice but i realised bot will create a role with clan name 😅
  //   const roleMenuMessage = await modalInteraction.editReply({
  //     components: [generateRoleMenu()],
  //   });

  //   // No filter since interaction is ephemeral and no custom id/component type filter since its just one component
  //   const roleMenuInteraction = await roleMenuMessage
  //     .awaitMessageComponent({ time: 1000 * 60 * 3 })

  //     .catch(() => null);

  //   if (!roleMenuInteraction) return;

  //   try {
  // await roleMenuInteraction.update({
  //   content: "Creating clan...",
  //   components: [],
  // });

  // const [clanAssociatedRoleId] = roleMenuInteraction.values;

  // const role =
  //   roleMenuInteraction.guild.roles.cache.get(clanAssociatedRoleId);

  // if (role.managed)
  //   return handleInteractionError(
  //     roleMenuInteraction,
  //     "Please select a role that is assignable to people NOT a bot role or something!"
  //   );

  // const roleExists = await Clans.exists({
  //   clanAssociatedRoleId,
  // });

  // if (roleExists)
  //   return handleInteractionError(
  //     roleMenuInteraction,
  //     `Clan with that role already exists, try a different one!`
  //   );

  // await Clans.create({
  //   guildId,
  //   clanName,
  //   clanDescription,
  //   clanLeaderId: userId,
  //   clanAssociatedRoleId,
  //   members: [userId],
  // });

  // await roleMenuInteraction.editReply(
  //   "Great, your application to get clan approved has been sent to admins. If approved/denied, you will be notified in DMs"
  // );
  //   } catch (error) {
  //     handleInteractionError(roleMenuInteraction, error);
  //   }
};

exports.handleClanDenyCreate = async (interaction) => {
  const {
    customId,
    message: { embeds },
    client,
    user,
  } = interaction;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const docId = customId.split(":").at(-1);

  const clan = await Clans.findById(docId);

  if (!clan) throw new Error("Clan has been disbanded!");

  const { clanLeaderId, clanName } = clan;

  await client.users.send(
    clanLeaderId,
    `Hey <@${clanLeaderId}>, your request for the clan **${clanName}** has been denied unfortunately. Better luck next time 😄`
  );

  await clan.deleteOne();

  embeds[0].data.description += `\n\n> Request has been declined by ${user}`;

  await interaction.message.edit({ components: [], embeds: [embeds[0]] });
  await interaction.editReply("Request has been denied!");
};

exports.handleClanAcceptCreate = async (interaction) => {
  const {
    customId,
    message: { embeds },
    guild,
    client,
    user,
  } = interaction;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const docId = customId.split(":").at(-1);

  const clan = await Clans.findById(docId);

  if (!clan) throw new Error("Clan has been disbanded!");

  const { clanLeaderId, clanName } = clan;

  const clanLeader = await guild.members.fetch(clanLeaderId);

  await client.users.send(
    clanLeaderId,
    `Hey <@${clanLeaderId}>, your request for the clan **${clanName}** has been accepted. You are being assigned a private channel for managing your clan and a dedicated role!`
  );

  let clanRole = guild.roles.cache.find((r) => r.name === clanName);

  if (!clanRole) clanRole = await guild.roles.create({ name: clanName });
  await clanLeader.roles.add(clanRole);

  const clanChannel = await guild.channels.create({
    parent: process.env.CLAN_CREATE_CATEGORY_ID,
    name: clanName,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: PermissionFlagsBits.ViewChannel },
      {
        id: clanRole,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ],
      },
    ],
  });

  await clanChannel.send(
    `${clanLeader}, here is your private channel for managing the clan. Happy inviting members!`
  );

  await clan.updateOne({
    clanStatus: "active",
    clanAssociatedChannelId: clanChannel.id,
    clanAssociatedRoleId: clanRole.id,
  });

  embeds[0].data.description += `\n\n> Request has been approved by ${user}.`;

  await sendMessageInClanLogsChannel(
    client,
    `${clanLeader} has created a new clan **${clan.clanName}** 🎊, make sure to join them!`
  );

  await interaction.message.edit({ components: [], embeds: [embeds[0]] });
  await interaction.editReply("Request has been accepted!");

  await updateClanTracker(interaction.client, interaction.guildId);
};

exports.handleClanJoin = async (interaction) => {
  const { guild, member } = interaction;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const clan = await Clans.exists({ members: member.id });

  if (clan)
    throw new Error(
      "You are already a clan member, you must leave it before joining a new one"
    );

  const clans = await Clans.find({
    clanStatus: "active",
    "members.9": { $exists: false },
  });

  if (clans.length === 0)
    throw new Error(
      "No clan with less than 10 members exist, you can try creating yourselves one!"
    );

  const options = clans.map((c) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(c.clanName.slice(0, 100))
      .setDescription(c.clanDescription.slice(0, 100))
      .setValue(c._id.toString())
  );

  const menu = generateDynamicStringMenu("clanJoin", options);

  const m = await interaction.editReply({ components: [menu] });

  // No filter since interaction is ephemeral and no custom id/component type filter since its just one component
  const menuInteraction = await m
    .awaitMessageComponent({ time: 1000 * 60 * 3 })

    .catch(() => null);

  if (!menuInteraction) return;

  try {
    await menuInteraction.update({
      content: "Sending invite...",
      components: [],
    });

    const clan = await Clans.findById(menuInteraction.values[0]);
    const channel = guild.channels.cache.get(clan.clanAssociatedChannelId);

    if (!channel)
      throw new Error(
        "Could not send an invite because clan channel no longer exists!"
      );

    const embed = generateEmbed({
      title: "Clan Join Request 🔔",
      description:
        `<@${member.id}> has requested to join your clan.\n\n` +
        `Please review the details carefully before accepting the request! DM will be sent to member on both actions.`,
      thumbnail: member.displayAvatarURL(),
    });

    const row = generateAcceptDenyButtons(
      `acceptJoin:${member.id}:${menuInteraction.values[0]}`,
      `denyJoin:${member.id}:${menuInteraction.values[0]}`
    );

    await channel.send({ embeds: [embed], components: [row] });

    await menuInteraction.editReply(
      "Invite has been sent, you will be notified via DM."
    );
  } catch (error) {
    handleInteractionError(menuInteraction, error);
  }
};

exports.handleClanDenyJoin = async (interaction) => {
  const {
    customId,
    client,
    user,
    message: { embeds },
  } = interaction;

  const userId = customId.split(":").at(-2);
  const docId = customId.split(":").at(-1);

  const clan = await Clans.findOne({
    $or: [{ clanLeaderId: user.id }, { clanVcId: user.id }],
    _id: docId,
  });

  if (!clan) throw new Error("Only clan leader or VC can do this!");

  await client.users.send(
    userId,
    `Hey <@${userId}>, your request for the clan **${clan.clanName}** has been denied unfortunately. Better luck next time 😄`
  );

  embeds[0].data.description += `\n\n> Request has been declined by ${user}`;

  await interaction.update({ components: [], embeds: [embeds[0]] });
};

exports.handleMemberClanDenyJoin = async (interaction) => {
  const { customId, client, user } = interaction;

  const userId = customId.split(":").at(-2);

  await client.users.send(
    userId,
    `Hey <@${userId}>, ${user} has declined to accept your clan. No worries!`
  );

  await interaction.update({ content: "Request declined", components: [] });
};

exports.handleMemberClanAcceptJoin = async (interaction) => {
  const { customId, client, user } = interaction;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = customId.split(":").at(-2);
  const docId = customId.split(":").at(-1);

  const clan = await Clans.findById(docId);

  if (!clan) throw new Error("Clan no longer exists");

  if (clan.members.length >= 10)
    throw new Error("The clan has max members already");

  const userAlreadyClanMember = await Clans.exists({ members: user.id });

  if (userAlreadyClanMember)
    throw new Error(
      "Oh boi, you are already a clan member. Must leave that before joining a new one."
    );

  const guild = client.guilds.cache.get(guildId);

  const member = await guild.members.fetch(user.id);

  console.log(clan.clanAssociatedRoleId);
  console.log(clan);

  await member.roles.add(clan.clanAssociatedRoleId);

  const clanChannel = guild.channels.cache.get(clan.clanAssociatedChannelId);

  await clanChannel.send(`${member} has accepted to join the clan. Welcome!`);

  await clan.updateOne({
    $push: { members: user.id },
  });

  await sendMessageInClanLogsChannel(
    client,
    `${member} has joined the clan **${clan.clanName}** 🎊, Current members: ${
      clan.members.length + 1
    }`
  );

  await interaction.message.edit({ components: [] });
  await interaction.editReply("Adding you!");
  await updateClanTracker(interaction.client, guildId);
};
exports.handleClanAcceptJoin = async (interaction) => {
  const {
    customId,
    client,
    user,
    message: { embeds },
    guild,
  } = interaction;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const userId = customId.split(":").at(-2);
  const docId = customId.split(":").at(-1);

  const clan = await Clans.findOne({
    $or: [{ clanLeaderId: user.id }, { clanVcId: user.id }],
    _id: docId,
  });

  if (!clan) throw new Error("Only clan leader or VC can do this!");

  if (clan.members.length >= 10)
    throw new Error("Your clan has max members already");

  const userAlreadyClanMember = await Clans.exists({ members: userId });

  if (userAlreadyClanMember)
    throw new Error(
      "Oh boi, you were late. User has joined some other clan haha."
    );

  const member = await guild.members.fetch(userId);

  await client.users.send(
    userId,
    `Hey <@${userId}>, your request for the clan **${clan.clanName}** has been accepted. You will be soon given access to the clan.`
  );

  await member.roles.add(clan.clanAssociatedRoleId);

  const clanChannel = guild.channels.cache.get(clan.clanAssociatedChannelId);

  await clanChannel.send(`${member}, Welcome to the clan!`);

  await clan.updateOne({
    $push: { members: userId },
  });

  await sendMessageInClanLogsChannel(
    client,
    `${member} has joined the clan **${clan.clanName}** 🎊, Current members: ${
      clan.members.length + 1
    }`
  );

  embeds[0].data.description += `\n\n> Request has been approved by ${user}.`;

  await interaction.message.edit({ components: [], embeds: [embeds[0]] });
  await interaction.editReply("Request has been accepted!");
  await updateClanTracker(interaction.client, interaction.guildId);
};

exports.handleClanLeave = async (interaction) => {
  const { guild, member, client } = interaction;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const clan = await Clans.findOne({ members: member.id });

  if (!clan) throw new Error("You are not a clan member!");

  if (clan.clanLeaderId === member.id)
    throw new Error("As a leader of the clan, you must disband it");

  const clanRole = guild.roles.cache.get(clan.clanAssociatedRoleId);

  if (clanRole) await member.roles.remove(clanRole);

  const updateData = { $pull: { members: member.id } };

  if (clan.clanVcId === member.id) updateData.clanVcId = null;

  await clan.updateOne(updateData);

  await sendMessageInClanLogsChannel(
    client,
    `${member} has left the clan **${clan.clanName}** 😞, Current members: ${
      clan.members.length - 1
    }`
  );

  await interaction.editReply("You have left the clan!");
  await updateClanTracker(interaction.client, interaction.guildId);
};

exports.handleClanDisband = async (interaction) => {
  const { guild, user, client } = interaction;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const clan = await Clans.findOne({ clanLeaderId: user.id });

  if (!clan) throw new Error("You are not a clan leader!");

  const clanRole = guild.roles.cache.get(clan.clanAssociatedRoleId);
  const clanChannel = guild.channels.cache.get(clan.clanAssociatedChannelId);

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
};
