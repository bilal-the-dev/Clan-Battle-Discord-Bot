const { Schema, model } = require("mongoose");
const { requiredString } = require("../utils/mongooseTypes");

const schema = new Schema(
  {
    guildId: requiredString,
    clan1: requiredString,
    clan2: requiredString,
    matchChannelId: requiredString,
  },
  { timestamps: true }
);

const Matches = model("clan_matches", schema);

module.exports = Matches;
