const { MessageFlags } = require("discord.js");

exports.replyOrEditInteraction = async (interaction, reply) => {
  try {
    if (interaction.replied || interaction.deferred)
      await interaction.editReply(reply);
    else await interaction.reply(reply);
  } catch (error) {
    console.log(error);
  }
};

exports.handleInteractionError = async (interaction, error) => {
  console.log(error);

  const content = `Err! \`${error instanceof Error ? error.message : error}\``;

  await this.replyOrEditInteraction(interaction, {
    content,
    flags: MessageFlags.Ephemeral,
    components: [],
  });
};
