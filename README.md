# queryServer3
Minecraft Server Status's QueryServer.js library v3
### NOTE: This project is still WIP
#### Function signature:
```ts
interface QueryResult {
  motd: string,
  version: string,
  latency: number,
  players: {
    online: number,
    max: number,
    list: Array<{
      uuid: string,
      name: string
    }>
  },
  favicon?: string,
  ip: string,
  type: string,
}

declare function queryServer(sockAddr: string): Promise<QueryResult>;
// or ...
declare function queryServer(host: string, port: number): Promise<QueryResult>;
````

#### Install instructions:
1. Clone the repository
```sh
git clone https://github.com/stanstrum/queryServer3.git/
```
2. Run `npm install`
3. Run `npm run build`
4. Copy the generated `queryServer.js` file from the `dist/` directory into your dependencies folder
5. Use as follows:
```js
const queryServer = require("./path/to/queryServer.js");
    
queryServer("mc.hypixel.net:25565")
  .then(console.dir)
  .catch(console.error);
```
