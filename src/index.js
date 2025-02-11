const path = require("path");

const { Client, IntentsBitField, ActivityType } = require("discord.js");
const WOK = require("wokcommands");
const mongoose = require("mongoose");

const { TOKEN, MONGO_URI } = process.env;
const { DefaultCommands } = WOK;

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.rest.on("rateLimited", console.log);

client.on("ready", async (readyClient) => {
  console.log(
    `${readyClient.user.username} (${readyClient.user.id}) is running!`
  );

  await mongoose
    .connect(MONGO_URI)
    .then(() => console.log("Connected to database"));

  readyClient.user.setPresence({
    status: "dnd",
    activities: [{ type: ActivityType.Custom, name: "Monitoring Clans" }],
  });

  new WOK({
    client,
    commandsDir: path.join(__dirname, "commands"),
    events: {
      dir: path.join(__dirname, "events"),
    },
    disabledDefaultCommands: [
      DefaultCommands.ChannelCommand,
      DefaultCommands.CustomCommand,
      DefaultCommands.Prefix,
      DefaultCommands.RequiredPermissions,
      DefaultCommands.RequiredRoles,
      DefaultCommands.ToggleCommand,
    ],
  });
});

client.login(TOKEN);
