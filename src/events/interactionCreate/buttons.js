const {
  handleClanCreate,
  handleClanDenyCreate,
  handleClanAcceptCreate,
  handleClanDisband,
  handleClanLeave,
  handleClanJoin,
  handleClanDenyJoin,
  handleClanAcceptJoin,
  handleMemberClanDenyJoin,
  handleMemberClanAcceptJoin,
} = require("../../handlers/buttonHandler/handleClans");
const { handleInteractionError } = require("../../utils/interaction");

module.exports = async (interaction) => {
  try {
    if (!interaction.isButton()) return;

    const { customId } = interaction;

    switch (customId) {
      case "button:clan:create":
        await handleClanCreate(interaction);
        break;
      case "button:clan:join":
        await handleClanJoin(interaction);
        break;
      case "button:clan:leave":
        await handleClanLeave(interaction);
        break;
      case "button:clan:disband":
        await handleClanDisband(interaction);
        break;

      default:
        break;
    }

    if (customId.includes("memberDenyJoin"))
      await handleMemberClanDenyJoin(interaction);

    if (customId.includes("denyCreate"))
      await handleClanDenyCreate(interaction);

    if (customId.includes("denyJoin")) await handleClanDenyJoin(interaction);

    if (customId.includes("acceptCreate"))
      await handleClanAcceptCreate(interaction);

    if (customId.includes("memberAcceptJoin"))
      await handleMemberClanAcceptJoin(interaction);

    if (customId.includes("acceptJoin"))
      await handleClanAcceptJoin(interaction);
  } catch (error) {
    handleInteractionError(interaction, error);
  }
};
