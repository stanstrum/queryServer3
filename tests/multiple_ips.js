process.on("unhandledRejection", e => console.error("Unhandled Promise Rejection:\n" + e.stack || e));

const servers = [
  ["192.168.1.3", 25565],
  ["192.168.1.3", 25566],
  ["play.lbsg.net", ],
  ["hub.mc-complex.com", ],
  ["mchub.com", ],
  ["play.pixelmonrealms.com", ],
  ["play.pokesaga.org", ],
  ["DonutSMP.net", ],
  ["play.EarthMC.net", ],
  ["play.melonsmp.fun", ],
  ["mc.applecraft.org", ],
  ["play.tulipsurvival.com", ],
  ["org.archonhq.net", ],
  ["play.valatic.net", ],
  ["Play.datblock.com", ],
  ["minehut.com", ],
  ["hub.opblocks.com", ],
  ["play.anubismc.com", ],
  ["play.immortal.com", ],
  ["geyser.pixelblockmc.com", ],
  ["play.jartexnetwork.com", ],
  ["play.minefun.com", ],
  ["lifestealmc.net", ],
  ["kiwismp.fun", ],
  ["buzz.cosmicsurvival.com", ],
  ["play.blossomcraft.org", ],
  ["br.craftyourtown.com", ],
  ["buzz.playfuse.net", ],
  ["play.vanillarealms.com", ],
  ["play.bumblecraft.net", ],
  ["buzz.lunarsmp.org", ],
  ["buzz.catcraft.net", ],
  ["buzz.melonrealms.net", ],
  ["play.huabacraft.com", ],
  ["bedrock.advancius.net", ],
  ["mc.thecavern.net", ],
  ["mc.projects.gg", ],
  ["play.kiwimc.com", ],
  ["play.mc-ages.com", ],
  ["br.skylyfe.net", ],
  ["kingdomsandruins.com", ],
  ["play.maritime.gg", ],
  ["play.static-studios.net", ]
];

(async () => {
  const queryServer = require("../src");

  try {
    for (const [ip, port] of servers) {
      console.group("Host " + (port ? `${ip}:${port}` : ip));

      var response = await queryServer(ip, port);
      console.dir(response);

      if (typeof response !== "object" ||
          typeof response.motd !== "string" ||
          typeof response.version !== "string" ||
          typeof response.latency !== "string" ||
          typeof response.players !== "object" ||
          typeof response.players.online !== "number" ||
          typeof response.players.max !== "number" ||
          response.players.list instanceof Array ||
          !response.players.list.every(entry => typeof entry === "object" && typeof entry.name === "string" && typeof entry.uuid === "string")
      ) {
        throw new Error("Returned object is not of correct format");
      }

      console.groupEnd();
    }
  } catch (e) {
    console.error(
      e.stack
      ? e.stack
          .split('\n')
          .filter(
            line => !/node:internal|\/tests\//.test(line)
          )
          .join('\n')
      : e
    );

    process.exit(1);
  }
})();
