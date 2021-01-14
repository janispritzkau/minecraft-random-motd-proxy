import { Server, Client, State, PacketWriter, Connection } from "mcproto"
import fs = require("fs/promises")

const SERVER_PORT = +process.env.SERVER_PORT! || 25565
const HOST = process.env.HOST ?? "localhost"
const PORT = process.env.PORT ?? 25566

let motds: any[] = []
let motdsLastUpdated = 0
let favicon: string | undefined
let faviconLastUpdated = 0

async function getStatus() {
  if (Date.now() - motdsLastUpdated > 5000) {
    motdsLastUpdated = Date.now()
    const text = await fs.readFile("motd.txt", "utf-8")
    motds = text.trim().split("\n").map(line => JSON.parse(line))
  }
  if (Date.now() - faviconLastUpdated > 20000) {
    faviconLastUpdated = Date.now()
    try {
      const buf = await fs.readFile("favicon.png")
      favicon = `data:image/png;base64,${buf.toString("base64")}`
    } catch (error) {
      console.error(error)
    }
  }
  const motd = motds[Math.floor(Math.random() * motds.length)]

  return {
    description: motd,
    favicon
  }
}

new Server(async client => {
  client.on("error", console.error)

  const handshake = await client.nextPacket()
  const protocol = handshake.readVarInt()

  client.pause()

  let conn: Connection
  try {
    conn = await Client.connect(HOST, PORT)
    conn.on("error", console.error)
  } catch (error) {
    console.error(error)
    return client.end()
  }

  conn.send(new PacketWriter(0x0).writeVarInt(protocol)
    .writeString(HOST).writeUInt16(PORT)
    .writeVarInt(client.state))

  if (client.state == State.Status) {
    client.onPacket(0x0, async () => {
      conn.send(new PacketWriter(0x0))
      const status = (await conn.nextPacket(0x0)).readJSON()
      client.send(new PacketWriter(0x0).writeJSON({
        ...status,
        ...await getStatus()
      }))
    })
    client.onPacket(0x1, packet => {
      client.send(new PacketWriter(0x1).writeInt64(packet.readInt64()))
    })
    return client.resume()
  }

  client.on("packet", packet => conn.send(packet))
  client.resume()

  client.unpipe(), conn.unpipe()

  client.socket.pipe(conn.socket, { end: true })
  conn.socket.pipe(client.socket, { end: true })
}).listen(SERVER_PORT)
