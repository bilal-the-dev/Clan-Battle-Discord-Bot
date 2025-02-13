const { Schema, model } = require("mongoose");

const {
  requiredString,
  requiredUniqueString,
  defaultZeroNumber,
} = require("../utils/mongooseTypes");

const schema = new Schema(
  {
    guildId: requiredString,
    clanName: requiredUniqueString,
    clanLeaderId: requiredString,
    clanVcId: String,
    clanDescription: { type: String, default: "None" },
    clanAssociatedRoleId: String,
    clanAssociatedChannelId: String,
    clanStatus: {
      type: String,
      enums: ["active", "pending"],
      default: "pending",
    },
    members: { type: [String], default: [] },
    points: defaultZeroNumber,
    matchesWon: defaultZeroNumber,
    matchesLost: defaultZeroNumber,
  },
  { timestamps: true }
);

schema.index({ guildId: 1, clanLeaderId: 1 }, { unique: true });

const Clans = model("clans", schema);

module.exports = Clans;
