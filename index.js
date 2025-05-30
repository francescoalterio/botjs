const { Client, GatewayIntentBits, Partials } = require("discord.js");
const admin = require("firebase-admin");
const dotenv = require("dotenv");
const { Timestamp } = require("firebase-admin/firestore");

dotenv.config();

const firebaseCredentials = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};
admin.initializeApp({
  credential: admin.credential.cert(firebaseCredentials),
});

const db = admin.firestore();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const PREFIX = "!";

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const [cmd, ...args] = message.content.slice(PREFIX.length).trim().split(" ");
  const channelName = message.channel.name;

  // !agregar nombre Halo - descripcion Un juego - fecha 12/12/3030
  if (cmd === "agregar" && channelName === "agregar-juegos") {
    const joined = args.join(" ");
    const partes = joined
      .split("-")
      .map((p) => p.trim())
      .filter(Boolean);
    const datos = {};
    for (const parte of partes) {
      const [clave, ...resto] = parte.split(" ");
      if (clave && resto.length) datos[clave] = resto.join(" ").trim();
    }
    // Procesar fecha
    if (datos.fecha) {
      const [d, m, y] = datos.fecha.split("/");
      datos.fecha = new Date(`${y}-${m}-${d}T00:00:00Z`);
    }
    if (!datos.nombre) {
      await message.channel.send("El nombre es obligatorio.");
      return;
    }
    try {
      await db.collection("juegos").doc(datos.nombre).set(datos);
      await message.channel.send(`Juego '${datos.nombre}' agregado con éxito.`);
    } catch (e) {
      await message.channel.send(
        "Ocurrió un error al intentar guardar el juego."
      );
    }
    return;
  }

  // !eliminar nombre
  if (cmd === "eliminar" && channelName === "agregar-juegos") {
    const nombre = args.join(" ");
    try {
      await db.collection("juegos").doc(nombre).delete();
      await message.channel.send(`Juego '${nombre}' eliminado con éxito.`);
    } catch (e) {
      await message.channel.send(
        "Ocurrió un error al intentar eliminar el juego."
      );
    }
    return;
  }

  // !juegos
  if (cmd === "juegos" && channelName === "consultar-juegos") {
    try {
      await message.channel.bulkDelete(100, true);
      const snapshot = await db.collection("juegos").get();
      if (snapshot.empty) {
        await message.channel.send(
          "No hay juegos registrados en la base de datos."
        );
        return;
      }
      for (const doc of snapshot.docs) {
        const juego = doc.data();
        let fecha =
          juego.fecha instanceof Timestamp ? juego.fecha.toDate() : juego.fecha;
        fecha = fecha ? new Date(fecha).toLocaleDateString("es-ES") : "N/A";
        let msg = "**---------------------------------------**\n";
        msg += "**#########################**\n";
        msg += "**---------------------------------------**\n";
        msg += `**Nombre del juego:** ${juego.nombre || "N/A"}\n`;
        msg += `**Fecha de salida:** ${fecha}\n`;
        msg += `**Descripción:** ${juego.descripcion || "N/A"}\n`;
        msg += `**Trailer o video:** ${juego.trailer || "N/A"}\n`;
        msg += `${juego.poster || "N/A"}\n`;
        await message.channel.send(msg);
      }
    } catch (e) {
      await message.channel.send(
        "Ocurrió un error al intentar recuperar los juegos."
      );
      console.log(e);
    }
    return;
  }

  // !lanzamientos
  if (cmd === "lanzamientos" && channelName === "consultar-juegos") {
    try {
      const now = new Date();
      const snapshot = await db.collection("juegos").get();
      const futuros = snapshot.docs
        .map((doc) => doc.data())
        .filter((j) => {
          let fecha = j.fecha instanceof Timestamp ? j.fecha.toDate() : j.fecha;
          return fecha && new Date(fecha) > now;
        });
      if (!futuros.length) {
        await message.channel.send("No hay juegos próximos a lanzarse.");
        return;
      }
      for (const juego of futuros) {
        let fecha =
          juego.fecha instanceof Timestamp ? juego.fecha.toDate() : juego.fecha;
        fecha = fecha ? new Date(fecha).toLocaleDateString("es-ES") : "N/A";
        let msg = "**---------------------------------------**\n";
        msg += "**#########################**\n";
        msg += "**---------------------------------------**\n";
        msg += `**Nombre del juego:** ${juego.nombre || "N/A"}\n`;
        msg += `**Fecha de salida:** ${fecha}\n`;
        msg += `**Descripción:** ${juego.descripcion || "N/A"}\n`;
        msg += `**Trailer o video:** ${juego.trailer || "N/A"}\n`;
        msg += `${juego.poster || "N/A"}\n`;
        await message.channel.send(msg);
      }
    } catch (e) {
      await message.channel.send(
        "Ocurrió un error al intentar recuperar los lanzamientos."
      );
    }
    return;
  }

  // !lanzados
  if (cmd === "lanzados" && channelName === "consultar-juegos") {
    try {
      const now = new Date();
      const snapshot = await db.collection("juegos").get();
      const pasados = snapshot.docs
        .map((doc) => doc.data())
        .filter((j) => {
          let fecha = j.fecha instanceof Timestamp ? j.fecha.toDate() : j.fecha;
          return fecha && new Date(fecha) <= now;
        });
      if (!pasados.length) {
        await message.channel.send("No hay juegos que ya hayan sido lanzados.");
        return;
      }
      for (const juego of pasados) {
        let fecha =
          juego.fecha instanceof Timestamp ? juego.fecha.toDate() : juego.fecha;
        fecha = fecha ? new Date(fecha).toLocaleDateString("es-ES") : "N/A";
        let msg = "**---------------------------------------**\n";
        msg += "**#########################**\n";
        msg += "**---------------------------------------**\n";
        msg += `**Nombre del juego:** ${juego.nombre || "N/A"}\n`;
        msg += `**Fecha de salida:** ${fecha}\n`;
        msg += `**Descripción:** ${juego.descripcion || "N/A"}\n`;
        msg += `**Trailer o video:** ${juego.trailer || "N/A"}\n`;
        msg += `${juego.poster || "N/A"}\n`;
        await message.channel.send(msg);
      }
    } catch (e) {
      await message.channel.send(
        "Ocurrió un error al intentar recuperar los juegos lanzados."
      );
    }
    return;
  }

  // !ayuda
  if (cmd === "ayuda") {
    if (channelName === "agregar-juegos") {
      await message.channel.send(`
Comandos disponibles:
!agregar - (Datos disponibles: nombre, descripcion, trailer, poster, fecha [Nota: colocar el nombre del dato, luego un espacio y el valor, luego un guion (-) y siguiente dato])
!eliminar - (Elimina un juego de la base de datos, solo se necesita el nombre del juego [Sensible a mayúsculas y minúsculas])
      `);
    } else if (channelName === "consultar-juegos") {
      await message.channel.send(`
Comandos disponibles:
!juegos - (Muestra todos los juegos registrados en la base de datos)
!lanzamientos - (Muestra los juegos que aún no han salido)
!lanzados - (Muestra los juegos que ya han salido)
      `);
    }
    return;
  }
});

client.login(process.env.DISCORD_TOKEN);
