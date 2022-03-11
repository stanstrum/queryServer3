global.Promise = require("bluebird");

process.on("unhandledRejection", (error, promise) => console.error(`Unhandled Promise rejection at ${promise}:\n${(error?.stack) || error}`));

const servers = [
  ["mc.hypixel.net", 25565],
  ["play.lbsg.net", 19132],
  ["us.mineplex.com", 25565],
  ["pe.mineplex.com", 19132],
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
  // ["minehut.com", ],
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
  if (process.env.NODE_ENV === "production") {
    var queryServer = require("../dist/queryServer.js");
  } else {
    var queryServer = require("../src");
  }

  const filterStack = e =>
    (e?.stack || e.toString())
      .split('\n')
      .filter(
        line => !/node:internal|\/tests\//.test(line)
      )
      .join('\n');

  try {
    for (const [ip, port] of servers) {
      console.group("Host " + (port ? `${ip}:${port}` : ip));
      console.group("Calling queryServer");

      var response = await queryServer(ip, port);
      console.groupEnd();

      response.favicon &&= response.favicon.length.toString() + " byte(s)";
      console.group("Result from queryServer:");
      console.dir(response, { depth: null });

      console.groupEnd();
      if (typeof response?.motd            !== "string" ||
          typeof response?.version         !== "string" ||
          typeof response?.latency         !== "number" ||
          typeof response?.players         !== "object" ||
          typeof response?.players?.online !== "number" ||
          typeof response?.players?.max    !== "number" ||
          typeof response?.ip              !== "string" ||
          typeof response?.type            !== "string" ||
          !(response?.players?.list instanceof Array)   ||
          response?.players?.list?.some(
            entry => typeof entry?.name    !== "string" ||
                     typeof entry?.uuid    !== "string"
          )                                             ||
          (
            response?.favicon                           &&
            typeof response?.favicon !== "string"
          )
      ) {
        throw new Error("Returned object is not of correct format");
      }

      console.groupEnd();
    }
  } catch (e) {
    console.error(
      filterStack(e)
    );

    if (e instanceof AggregateError) {
      console.group("Errors:");
      for (const error of e.errors) {
        console.log(filterStack(error));
      }
      console.groupEnd();
    }

    process.exit(1);
  }
})();
