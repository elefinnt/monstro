import Phaser from "phaser";
import { connectToWorld } from "../net/worldClient.js";
import { resolveUsername, SERVER_URL } from "../config.js";

/** Connects to the server, then hands the room off to the WorldScene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    const status = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "Connecting…", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    void this.connect(status);
  }

  private async connect(status: Phaser.GameObjects.Text): Promise<void> {
    try {
      const room = await connectToWorld({ username: resolveUsername() });
      console.log(`[monstro] connected to WorldRoom (session ${room.sessionId})`);
      this.scene.start("world", { room });
    } catch (err) {
      console.error("[monstro] connection failed:", err);
      status.setText(`Could not connect to\n${SERVER_URL}\n\nIs the server running?`);
      status.setColor("#ff6b6b");
      status.setAlign("center");
    }
  }
}
