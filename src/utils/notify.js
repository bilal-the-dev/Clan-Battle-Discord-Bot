exports.sendMessageInChannel = async (channel, message) => {
  await channel.send(message);
};

exports.sendMessageInAdminChannel = async (client, message) => {
  const channel = client.channels.cache.get(process.env.ADMIN_LOGS_CHANNEL_ID);

  await this.sendMessageInChannel(channel, message);
};

exports.sendMessageInClanLogsChannel = async (client, message) => {
  const channel = client.channels.cache.get(process.env.CLAN_LOGS_CHANNEL_ID);

  await this.sendMessageInChannel(channel, message);
};
