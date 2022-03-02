# queryServer3
Minecraft Server Status's QueryServer.js library v3
## NOTE: This project is still WIP
---
Install instructions:
1. Clone the repository
```
git clone https://github.com/stanstrum/queryServer3.git/
```
2. Run `npm install`
3. Run `npm run webpack`
4. Copy the generated `queryServer.js` file from the `dist/` directory into your dependencies folder
5. Use as follows:
```
const queryServer = require("./path/to/queryServer.js");
    
queryServer("mc.hypixel.net:25565")
  .then(console.dir)
  .catch(console.error);
```
