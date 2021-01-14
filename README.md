# Random server MOTD proxy for Minecraft

## Usage

Edit the motd.txt to add your MOTD texts.

Optionally place a favicon.png file in the folder.

```sh
# build the package (only needed once)
npm run build

# start the proxy
SERVER_PORT=25565 HOST=localhost port=25567 node .
```

The MOTD texts and favicon are updated automatically without needing to restart the proxy.
