const { Schema, model } = require("mongoose");
const { requiredUniqueString } = require("../utils/mongooseTypes");

const schema = new Schema(
  {
    guildId: requiredUniqueString,
    clanTrackerMessageId: String,
    clanTrackerChannelId: String,
  },
  { timestamps: true }
);

const GeneralData = model("clan_general_data", schema);

module.exports = GeneralData;
